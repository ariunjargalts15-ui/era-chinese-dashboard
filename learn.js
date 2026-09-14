/* ERA Chinese — the learning path.

   A student works down a path of units, one short round at a time. Each round
   is built from the unit's words — the teacher writes vocabulary, never
   individual questions — and mixes five kinds of exercise: what a character
   means, which character carries a meaning, how it is read, what was just
   said aloud, and matching pairs.

   A round has five hearts. A wrong answer costs one and the question comes
   back at the end of the round, so the round cannot be finished without
   getting everything right once. Running out of hearts ends it with nothing
   earned. Finishing raises the unit a level, up to three, and the next unit
   opens once this one has been passed.

   Learn below is plain logic with no DOM, so it can be tested on its own;
   the views and actions after it draw and drive it. */
(function (global) {
  'use strict';

  var HEARTS = 5;
  var ROUND_WORDS = 8;       /* single questions per round, before retries */
  var RETRIES = 2;           /* how many times one question may come back */

  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ── building a round ── */
  var Learn = {
    HEARTS: HEARTS,

    /* Parses the editor's "character | pinyin | meaning" lines. A line that is
       only whitespace is skipped; anything else must have all three parts, so
       a typo is reported with its line number instead of becoming a word with
       no meaning. */
    parseWords: function (text) {
      var words = [], seen = {};
      var lines = String(text || '').split(/\r?\n/);
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var parts = line.split('|').map(function (x) { return x.trim(); });
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
          return { error: 'Line {n} needs three parts', line: i + 1 };
        }
        if (seen[parts[0]]) return { error: 'Line {n} repeats a word', line: i + 1 };
        seen[parts[0]] = 1;
        words.push({ hz: parts[0], py: parts[1], mn: parts[2] });
      }
      if (words.length < 4) return { error: 'A unit needs at least 4 words' };
      return { words: words };
    },

    wordsToText: function (words) {
      return (words || []).map(function (w) { return w.hz + ' | ' + w.py + ' | ' + w.mn; }).join('\n');
    },

    /* Three wrong options for a question, preferring words from the same
       unit (they are the ones a student actually confuses) and borrowing from
       other units only when this one is too short. Duplicated text is dropped,
       so two options never read the same. */
    distractors: function (word, field, unit, course, rand) {
      var answer = word[field];
      var pool = shuffle(unit.words.filter(function (w) { return w.hz !== word.hz; }), rand);
      var borrowed = [];
      (course || []).forEach(function (u) {
        if (u.id === unit.id) return;
        (u.words || []).forEach(function (w) { borrowed.push(w); });
      });
      pool = pool.concat(shuffle(borrowed, rand));
      var out = [], seen = {};
      seen[answer] = 1;
      for (var i = 0; i < pool.length && out.length < 3; i++) {
        var v = pool[i][field];
        if (!v || seen[v]) continue;
        seen[v] = 1;
        out.push(v);
      }
      return out;
    },

    question: function (type, word, unit, course, rand, id) {
      var field = type === 'meaning' ? 'mn' : type === 'pinyin' ? 'py' : 'hz';
      var options = shuffle([word[field]].concat(this.distractors(word, field, unit, course, rand)), rand);
      return { id: id, type: type, word: word, options: options, answer: word[field], tries: 0 };
    },

    pairs: function (words, rand, id) {
      return {
        id: id, type: 'pairs', tries: 0,
        words: words,
        left: shuffle(words.map(function (w) { return w.hz; }), rand),
        right: shuffle(words.map(function (w) { return w.mn; }), rand)
      };
    },

    /* The mix depends on the unit's level: a first visit is recognition —
       meanings both ways and matching — and reading and listening join from
       the second. */
    session: function (unit, course, level, rand) {
      rand = rand || Math.random;
      var words = shuffle(unit.words || [], rand).slice(0, ROUND_WORDS);
      var types = level >= 1
        ? ['meaning', 'reverse', 'pinyin', 'listen']
        : ['meaning', 'reverse', 'meaning', 'reverse'];
      var self = this;
      var queue = words.map(function (w, i) {
        return self.question(types[i % types.length], w, unit, course, rand, 'q' + i);
      });
      if ((unit.words || []).length >= 4) {
        var mid = Math.min(queue.length, Math.ceil(queue.length / 2));
        queue.splice(mid, 0, this.pairs(shuffle(unit.words, rand).slice(0, 4), rand, 'pairs'));
      }
      return {
        unitId: unit.id, queue: queue, i: 0, hearts: HEARTS,
        total: queue.length, firstTry: {}, picked: null, feedback: null,
        pairSel: null, matched: {}, pairWrong: null, failed: false, result: null
      };
    },

    current: function (st) { return st.queue[st.i] || null; },

    /* One answer to a choice question. Returns true when it was right. */
    answer: function (st, choice) {
      var q = this.current(st);
      if (!q || q.type === 'pairs' || st.feedback) return null;
      var ok = choice === q.answer;
      if (!(q.id in st.firstTry)) st.firstTry[q.id] = ok;
      if (!ok) this.miss(st, q);
      st.feedback = { ok: ok, answer: q.answer, word: q.word };
      return ok;
    },

    /* a mistake: a heart, and the question comes back later in the round */
    miss: function (st, q) {
      st.hearts = Math.max(0, st.hearts - 1);
      if (!(q.id in st.firstTry)) st.firstTry[q.id] = false;
      if (q.tries < RETRIES) {
        var again = JSON.parse(JSON.stringify(q));
        again.tries = q.tries + 1;
        if (again.options) again.options = shuffle(again.options, Math.random);
        st.queue.push(again);
      }
      if (st.hearts === 0) st.failed = true;
    },

    /* Matching: the first press picks a character, the second a meaning. A
       wrong pair costs a heart like any other mistake. */
    pairPick: function (st, side, value) {
      var q = this.current(st);
      if (!q || q.type !== 'pairs' || st.feedback) return null;
      st.pairWrong = null;
      if (side === 'left') {
        if (st.matched[value]) return null;
        st.pairSel = value;
        return null;
      }
      if (!st.pairSel) return null;
      var word = q.words.filter(function (w) { return w.hz === st.pairSel; })[0];
      if (word && word.mn === value) {
        st.matched[st.pairSel] = value;
        st.pairSel = null;
        if (Object.keys(st.matched).length === q.words.length) {
          if (!(q.id in st.firstTry)) st.firstTry[q.id] = true;
          st.feedback = { ok: true, pairs: true };
        }
        return true;
      }
      st.pairWrong = { left: st.pairSel, right: value };
      st.pairSel = null;
      st.hearts = Math.max(0, st.hearts - 1);
      if (!(q.id in st.firstTry)) st.firstTry[q.id] = false;
      if (st.hearts === 0) st.failed = true;
      return false;
    },

    /* past the feedback to the next question, or to the end of the round */
    next: function (st) {
      if (st.failed) return 'failed';
      st.i++;
      st.picked = null; st.feedback = null; st.pairSel = null; st.matched = {}; st.pairWrong = null;
      return st.i >= st.queue.length ? 'done' : 'more';
    },

    progress: function (st) {
      return Math.min(100, Math.round(100 * st.i / Math.max(1, st.queue.length)));
    },

    /* what the round counts as: questions right first time, out of the
       questions the round started with — retries are not extra credit */
    score: function (st) {
      var correct = 0, total = 0;
      Object.keys(st.firstTry).forEach(function (id) {
        total++;
        if (st.firstTry[id]) correct++;
      });
      return { correct: correct, total: Math.max(total, 1) };
    }
  };

  global.Learn = Learn;
  if (typeof module !== 'undefined' && module.exports) module.exports = Learn;
  if (typeof document === 'undefined') return;

  /* ══ VIEWS ══════════════════════════════════════════════ */
  var U, S, A;
  function g() { U = global.UI; S = global.Store; A = global.Actions; }
  function me() { return S.user(global.App.session.userId); }

  function levelDots(level) {
    var out = '';
    for (var i = 1; i <= S.MAX_LEVEL; i++) {
      out += '<span class="lvlDot' + (i <= level ? ' on' : '') + '"></span>';
    }
    return '<span class="lvlDots">' + out + '</span>';
  }

  /* ── the student's path ── */
  function path(unitId) {
    g();
    var st = global.App.learn;
    if (unitId && st && st.unitId === unitId) return roundView(st);
    if (unitId) { location.hash = '#/s/learn'; return ''; }

    var s = me();
    var list = S.course();
    var l = S.learner(s.id);
    var streak = S.currentStreak(s.id);

    if (!list.length) {
      return '<div class="card">' + U.empty('book', T('No units yet'),
        T('The teacher has not added any lessons yet.')) + '</div>';
    }

    /* the first unit still open to work on is the one the path points at */
    var currentId = null;
    list.forEach(function (u) {
      if (!currentId && S.unitUnlocked(s.id, u.id) && S.unitLevel(s.id, u.id) < S.MAX_LEVEL) currentId = u.id;
    });

    var passed = list.filter(function (u) { return S.unitLevel(s.id, u.id) >= 1; }).length;

    return '<div class="learnHead">' +
        headStat('sparkles', T('Total XP'), l.xp || 0) +
        headStat('target', T('Day streak'), streak) +
        headStat('grad', T('Units passed'), passed + '/' + list.length) +
      '</div>' +
      '<div class="path">' + list.map(function (u, i) {
        var level = S.unitLevel(s.id, u.id);
        var open = S.unitUnlocked(s.id, u.id);
        var state = !open ? 'locked' : level >= S.MAX_LEVEL ? 'mastered' : u.id === currentId ? 'current' : level >= 1 ? 'done' : 'open';
        var side = ['mid', 'right', 'mid', 'left'][i % 4];
        return '<div class="pathRow pathRow--' + side + '">' +
          '<button class="node node--' + state + '" data-act="learnStart" data-id="' + u.id + '"' +
            (open ? '' : ' aria-disabled="true"') + ' title="' + U.esc(u.title) + '">' +
            U.icon(!open ? 'lock' : level >= S.MAX_LEVEL ? 'grad' : level >= 1 ? 'check' : 'play', 26) +
          '</button>' +
          '<div class="node__label">' +
            '<b>' + U.esc(u.title) + '</b>' +
            (u.cn ? '<span class="cn">' + U.esc(u.cn) + '</span>' : '') +
            '<div class="tiny muted">' + T('{n} words', { n: (u.words || []).length }) + '</div>' +
            (open ? levelDots(level) : '<div class="tiny muted">' + T('Locked') + '</div>') +
            (state === 'current' ? '<span class="tag tag--gold" style="margin-top:6px">' + T('Start here') + '</span>' : '') +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
  }

  function headStat(ic, k, v) {
    return '<div class="learnStat">' + U.icon(ic, 20) +
      '<div><b class="num">' + v + '</b><span>' + U.esc(k) + '</span></div></div>';
  }

  /* ── a round in progress ── */
  function roundView(st) {
    var unit = S.courseUnit(st.unitId);
    if (!unit) { global.App.learn = null; return ''; }
    if (st.result) return resultView(st, unit);
    if (st.failed && !st.feedback) return failedView(unit);

    var q = Learn.current(st);
    var hearts = '';
    for (var h = 0; h < HEARTS; h++) {
      hearts += '<span class="heart' + (h < st.hearts ? ' on' : '') + '">♥</span>';
    }

    return '<div class="round">' +
      '<div class="round__top">' +
        '<button class="btn btn--ghost btn--sm" data-act="learnQuit" aria-label="' + T('Leave') + '">' + U.icon('x') + '</button>' +
        '<div class="round__bar"><i style="width:' + Learn.progress(st) + '%"></i></div>' +
        '<div class="hearts" title="' + T('Hearts') + '">' + hearts + '</div>' +
      '</div>' +
      '<div class="round__body">' + questionView(q, st) + '</div>' +
      footView(q, st) +
    '</div>';
  }

  function questionView(q, st) {
    if (q.type === 'pairs') {
      return '<h2 class="round__ask">' + T('Match the pairs') + '</h2>' +
        '<div class="pairs">' +
          '<div class="pairs__col">' + q.left.map(function (hz) {
            var done = !!st.matched[hz];
            var wrong = st.pairWrong && st.pairWrong.left === hz;
            return '<button class="opt opt--hz' + (done ? ' opt--done' : '') + (st.pairSel === hz ? ' opt--sel' : '') +
              (wrong ? ' opt--bad' : '') + '" data-act="learnPair" data-side="left" data-v="' + U.esc(hz) + '"' +
              (done ? ' disabled' : '') + '>' + U.esc(hz) + '</button>';
          }).join('') + '</div>' +
          '<div class="pairs__col">' + q.right.map(function (mn) {
            var done = Object.keys(st.matched).some(function (k) { return st.matched[k] === mn; });
            var wrong = st.pairWrong && st.pairWrong.right === mn;
            return '<button class="opt' + (done ? ' opt--done' : '') + (wrong ? ' opt--bad' : '') +
              '" data-act="learnPair" data-side="right" data-v="' + U.esc(mn) + '"' +
              (done ? ' disabled' : '') + '>' + U.esc(mn) + '</button>';
          }).join('') + '</div>' +
        '</div>';
    }

    var ask, prompt;
    if (q.type === 'meaning') {
      ask = T('What does this mean?');
      prompt = '<div class="round__hz">' + U.esc(q.word.hz) + '</div>' + speakBtn(q.word.hz);
    } else if (q.type === 'reverse') {
      ask = T('Choose the word that means «{word}»', { word: U.esc(q.word.mn) });
      prompt = '';
    } else if (q.type === 'pinyin') {
      ask = T('How is this read?');
      prompt = '<div class="round__hz">' + U.esc(q.word.hz) + '</div>';
    } else {
      ask = T('Listen and choose');
      prompt = '<button class="bigSpeak" data-act="learnSpeak" data-v="' + U.esc(q.word.hz) + '">' +
        U.icon('speaker', 34) + '</button>';
    }

    var fb = st.feedback;
    return '<h2 class="round__ask">' + ask + '</h2>' +
      '<div class="round__prompt">' + prompt + '</div>' +
      '<div class="opts">' + q.options.map(function (o, i) {
        var cls = 'opt' + (q.type === 'reverse' || q.type === 'listen' ? ' opt--hz' : '');
        if (st.picked === o) cls += ' opt--sel';
        if (fb && o === q.answer) cls += ' opt--good';
        if (fb && !fb.ok && st.picked === o) cls += ' opt--bad';
        return '<button class="' + cls + '" data-act="learnPick" data-i="' + i + '"' + (fb ? ' disabled' : '') + '>' +
          '<span class="opt__n">' + (i + 1) + '</span>' + U.esc(o) + '</button>';
      }).join('') + '</div>';
  }

  function speakBtn(hz) {
    return '<button class="btn btn--ghost btn--sm" data-act="learnSpeak" data-v="' + U.esc(hz) + '">' +
      U.icon('speaker', 16) + T('Listen') + '</button>';
  }

  function footView(q, st) {
    var fb = st.feedback;
    if (!fb) {
      if (q.type === 'pairs') {
        return '<div class="round__foot"><span class="muted tiny">' + T('Tap a character, then its meaning') + '</span></div>';
      }
      return '<div class="round__foot"><span class="sp"></span>' +
        '<button class="btn btn--pri btn--lg" data-act="learnCheck"' + (st.picked == null ? ' disabled' : '') + '>' +
          T('Check') + '</button></div>';
    }
    var detail = '';
    if (!fb.pairs && fb.word) {
      detail = '<div class="tiny">' + U.esc(fb.word.hz) + ' · ' + U.esc(fb.word.py) + ' · ' + U.esc(fb.word.mn) + '</div>';
    }
    return '<div class="round__foot round__foot--' + (fb.ok ? 'good' : 'bad') + '">' +
      '<div class="round__verdict">' + U.icon(fb.ok ? 'check' : 'x', 22) +
        '<div><b>' + (fb.ok ? T('Correct!') : T('Not quite')) + '</b>' +
        (!fb.ok ? '<div>' + T('Correct answer: {a}', { a: U.esc(fb.answer) }) + '</div>' : '') +
        detail + '</div></div>' +
      '<button class="btn btn--lg ' + (fb.ok ? 'btn--good' : 'btn--bad') + '" data-act="learnNext">' +
        T('Continue') + '</button></div>';
  }

  function failedView(unit) {
    return '<div class="round round--end"><div class="endCard">' +
      '<div class="endIcon endIcon--bad">♥</div>' +
      '<h2>' + T('Out of hearts') + '</h2>' +
      '<p class="muted">' + T('Try the unit again — mistakes are how the words stick.') + '</p>' +
      '<div class="endActs">' +
        '<a class="btn" href="#/s/learn">' + T('Back to the path') + '</a>' +
        '<button class="btn btn--pri" data-act="learnStart" data-id="' + unit.id + '">' + T('Try again') + '</button>' +
      '</div></div></div>';
  }

  function resultView(st, unit) {
    var r = st.result;
    return '<div class="round round--end"><div class="endCard">' +
      '<div class="endIcon">' + U.icon('grad', 40) + '</div>' +
      '<h2>' + (r.perfect ? T('Perfect round!') : T('Unit complete!')) + '</h2>' +
      '<p class="muted">' + U.esc(unit.title) + '</p>' +
      '<div class="endStats">' +
        '<div><b class="num">+' + r.xp + '</b><span>' + T('XP earned') + '</span></div>' +
        '<div><b class="num">' + r.accuracy + '%</b><span>' + T('Accuracy') + '</span></div>' +
        '<div><b class="num">' + r.streak + '</b><span>' + T('Day streak') + '</span></div>' +
      '</div>' +
      '<p>' + levelDots(r.level) + '</p>' +
      '<p class="tiny muted">' + (r.level >= S.MAX_LEVEL
        ? T('Maximum level reached')
        : r.leveledUp ? T('Unit reached level {n}', { n: r.level }) : '') + '</p>' +
      '<div class="endActs">' +
        '<a class="btn" href="#/s/learn">' + T('Back to the path') + '</a>' +
        '<button class="btn btn--pri" data-act="learnStart" data-id="' + unit.id + '">' + T('Practise again') + '</button>' +
      '</div></div></div>';
  }

  /* a line on the student dashboard pointing back at the path */
  function dashStrip() {
    g();
    var s = me();
    var list = S.course();
    if (!list.length) return '';
    var next = list.filter(function (u) {
      return S.unitUnlocked(s.id, u.id) && S.unitLevel(s.id, u.id) < S.MAX_LEVEL;
    })[0];
    var streak = S.currentStreak(s.id);
    return '<div class="card learnStrip">' +
      '<div class="card__b" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
        '<div class="av" style="background:var(--jade)">' + U.icon('target') + '</div>' +
        '<div style="flex:1;min-width:200px"><b>' +
          (next ? T('Next up: {title}', { title: U.esc(next.title) }) : T('Every unit is at the top level')) +
          '</b><div class="tiny muted">' +
          T('{xp} XP · {n}-day streak', { xp: S.learner(s.id).xp || 0, n: streak }) + '</div></div>' +
        '<a class="btn btn--pri" href="#/s/learn">' + T('Continue learning') + '</a>' +
      '</div></div>';
  }

  /* ── the teacher's editor ── */
  function editor() {
    g();
    var list = S.course();
    var students = S.activeStudents().length;
    return '<div class="sect">' +
        '<p class="muted" style="margin:0;flex:1;min-width:240px">' +
          T('Students work through these units in order. Exercises are built from each unit’s words.') + '</p>' +
        (list.length ? '' : '<button class="btn" data-act="courseStarter">' + U.icon('sparkles') + T('Load the starter course') + '</button>') +
        '<button class="btn btn--pri" data-act="unitNew">' + U.icon('plus') + T('New unit') + '</button>' +
      '</div>' +
      '<div class="card"><div class="card__h"><h3>' + T('Units') + '</h3>' + U.gloss('单元') +
        '<span class="sp"></span><span class="tag">' + list.length + '</span></div>' +
      (list.length ? '<div class="list">' + list.map(function (u, i) {
        var passed = S.passedCount(u.id);
        return '<div class="row">' +
          '<div class="av" style="background:#221C19">' + (i + 1) + '</div>' +
          '<div class="row__m"><b>' + U.esc(u.title) + (u.cn ? ' <span class="cn muted">' + U.esc(u.cn) + '</span>' : '') + '</b>' +
            '<small>' + T('{n} words', { n: (u.words || []).length }) + ' · ' +
            T('{n} of {m} students passed', { n: passed, m: students }) + ' · ' +
            U.esc((u.words || []).slice(0, 6).map(function (w) { return w.hz; }).join(' ')) + '</small></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            '<button class="btn btn--sm" data-act="unitMove" data-id="' + u.id + '" data-v="-1"' + (i === 0 ? ' disabled' : '') +
              ' title="' + T('Move up') + '">↑</button>' +
            '<button class="btn btn--sm" data-act="unitMove" data-id="' + u.id + '" data-v="1"' + (i === list.length - 1 ? ' disabled' : '') +
              ' title="' + T('Move down') + '">↓</button>' +
            '<button class="btn btn--sm" data-act="unitEdit" data-id="' + u.id + '">' + U.icon('pencil', 14) + T('Edit') + '</button>' +
            '<button class="btn btn--sm" data-act="unitDelete" data-id="' + u.id + '">' + U.icon('trash', 14) + '</button>' +
          '</div></div>';
      }).join('') + '</div>'
      : U.empty('book', T('No units yet'), T('Add the first unit to start the learning path.'))) +
      '</div>';
  }

  function unitForm(u) {
    return '<div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">' +
        '<label class="field"><span>' + T('Unit title') + '</span>' +
          '<input name="title" value="' + U.esc(u ? u.title : '') + '" placeholder="' + T('e.g. Greetings') + '"></label>' +
        '<label class="field"><span>' + T('Chinese title') + '</span>' +
          '<input name="cn" value="' + U.esc(u ? u.cn : '') + '" placeholder="问候"></label>' +
      '</div>' +
      '<label class="field"><span>' + T('Words — one per line: character | pinyin | meaning') + '</span>' +
        '<textarea name="words" rows="10" class="mono" placeholder="你好 | nǐ hǎo | сайн байна уу">' +
          U.esc(u ? Learn.wordsToText(u.words) : '') + '</textarea></label>' +
      '<p class="tiny muted" style="margin:0">' + T('At least 4 words. Exercises are generated from them automatically.') + '</p>';
  }

  function readUnitForm() {
    var title = U.Modal.val('title');
    if (!title) return { error: 'The unit needs a title' };
    var el = document.querySelector('#modal-root [name="words"]');
    var parsed = Learn.parseWords(el ? el.value : U.Modal.val('words'));
    if (parsed.error) return { error: parsed.error, line: parsed.line };
    return { title: title, cn: U.Modal.val('cn'), words: parsed.words };
  }

  function formError(r) {
    U.toast(T(r.error, { n: r.line }), 'alert');
  }

  global.LearnViews = { path: path, editor: editor, dashStrip: dashStrip };

  /* ══ ACTIONS ════════════════════════════════════════════ */
  g();
  A = global.Actions = global.Actions || {};

  A.learnStart = function (e) {
    g();
    var id = e.getAttribute('data-id');
    var s = me();
    var unit = S.courseUnit(id);
    if (!unit) return;
    if (!S.unitUnlocked(s.id, id)) { U.toast(T('Complete the previous unit first'), 'lock'); return; }
    if ((unit.words || []).length < 4) { U.toast(T('This unit is not ready yet'), 'alert'); return; }
    global.App.learn = Learn.session(unit, S.course(), S.unitLevel(s.id, id));
    var target = '#/s/learn/' + id;
    if (location.hash === target) global.App.render(); else location.hash = target;
  };

  A.learnPick = function (e) {
    var st = global.App.learn;
    var q = st && Learn.current(st);
    if (!q || st.feedback) return;
    st.picked = q.options[+e.getAttribute('data-i')];
    global.App.render();
  };

  A.learnCheck = function () {
    g();
    var st = global.App.learn;
    if (!st || st.picked == null || st.feedback) return;
    var ok = Learn.answer(st, st.picked);
    var q = Learn.current(st);
    if (ok && q && (q.type === 'meaning' || q.type === 'listen')) U.speak(q.word.hz);
    global.App.render();
  };

  A.learnPair = function (e) {
    var st = global.App.learn;
    if (!st) return;
    Learn.pairPick(st, e.getAttribute('data-side'), e.getAttribute('data-v'));
    if (st.failed) st.feedback = null;
    global.App.render();
  };

  A.learnNext = function () {
    g();
    var st = global.App.learn;
    if (!st) return;
    if (st.failed) { st.feedback = null; global.App.render(); return; }
    var step = Learn.next(st);
    if (step === 'done') {
      var sc = Learn.score(st);
      st.result = S.finishRound(me().id, st.unitId, sc);
    }
    global.App.render();
  };

  A.learnSpeak = function (e) { g(); U.speak(e.getAttribute('data-v')); };

  A.learnQuit = function () {
    g();
    U.Modal.open({
      title: T('Leave the lesson?'),
      body: '<p style="margin:0">' + T('Your progress in this round will not be saved.') + '</p>',
      okText: T('Leave'),
      onOk: function () {
        global.App.learn = null;
        U.Modal.close();
        location.hash = '#/s/learn';
      }
    });
  };

  A.unitNew = function () {
    g();
    U.Modal.open({
      title: T('New unit'), cn: '新单元',
      body: unitForm(null),
      okText: T('Create unit'),
      onOk: function () {
        var r = readUnitForm();
        if (r.error) { formError(r); return; }
        S.addUnit(r);
        U.Modal.close(); global.App.render(); U.toast(T('Unit saved'), 'check');
      }
    });
  };

  A.unitEdit = function (e) {
    g();
    var u = S.courseUnit(e.getAttribute('data-id'));
    if (!u) return;
    U.Modal.open({
      title: T('Edit unit'), cn: '编辑单元',
      body: unitForm(u),
      okText: T('Save'),
      onOk: function () {
        var r = readUnitForm();
        if (r.error) { formError(r); return; }
        S.updateUnit(u.id, r);
        U.Modal.close(); global.App.render(); U.toast(T('Unit saved'), 'check');
      }
    });
  };

  A.unitDelete = function (e) {
    g();
    var u = S.courseUnit(e.getAttribute('data-id'));
    if (!u) return;
    U.Modal.open({
      title: T('Delete unit'),
      body: '<p style="margin:0">' + T('Delete «{title}»? Students lose their progress in it.', { title: '<b>' + U.esc(u.title) + '</b>' }) + '</p>',
      okText: T('Delete'),
      onOk: function () {
        S.deleteUnit(u.id);
        U.Modal.close(); global.App.render(); U.toast(T('Unit deleted'), 'trash');
      }
    });
  };

  A.unitMove = function (e) {
    g();
    if (S.moveUnit(e.getAttribute('data-id'), +e.getAttribute('data-v'))) global.App.render();
  };

  A.courseStarter = function () {
    g();
    S.loadStarterCourse();
    global.App.render();
    U.toast(T('Starter course added'), 'check');
  };
})(typeof window !== 'undefined' ? window : globalThis);
