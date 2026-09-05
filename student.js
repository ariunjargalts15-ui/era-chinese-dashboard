/* ERA Chinese — student views. */
(function (global) {
  'use strict';
  var U, S;
  global.Actions = global.Actions || {};
  var A = global.Actions;

  function init() { U = global.UI; S = global.Store; }
  function me() { return S.user(App.session.userId); }

  function isLive(lessonId) {
    var r = global.Live && global.Live.room(lessonId);
    return !!(r && r.active);
  }

  function stat(ic, k, v, s) {
    return '<div class="stat"><div class="stat__k">' + U.icon(ic) + U.esc(k) + '</div>' +
      '<div class="stat__v">' + v + '</div>' + (s ? '<div class="stat__s">' + U.esc(s) + '</div>' : '') + '</div>';
  }

  /* ══ DASHBOARD ═══════════════════════════════════════ */
  function dashboard() {
    var s = me();
    var classes = S.classesOfStudent(s.id);
    var lessons = S.lessonsOfStudent(s.id);
    var live = lessons.filter(function (l) { return isLive(l.id); })[0];
    var next = live || lessons.filter(function (l) { return l.date >= S.today() && l.status !== 'completed'; })[0];
    var rows = S.attendanceOfStudent(s.id);
    var rate = S.attendanceRate(rows);

    var due = lessons.filter(function (l) {
      return l.homework && l.status === 'completed' && !S.submission(l.id, s.id);
    });
    var graded = S.data.submissions.filter(function (x) { return x.studentId === s.id && x.grade != null; });
    var avg = graded.length ? Math.round(graded.reduce(function (a, x) { return a + x.grade; }, 0) / graded.length) : null;

    var words = 0;
    lessons.filter(function (l) { return l.status === 'completed'; }).forEach(function (l) { words += l.words.length; });

    return '' +
      (live ? liveBanner(live) : '') +
      '<div class="grid g4">' +
        stat('target', T('Attendance'), (rate == null ? '—' : rate + '<small>%</small>'), T('{n} lessons recorded', { n: rows.length })) +
        stat('book', T('Words studied'), words, T('across completed lessons')) +
        stat('file', T('Homework due'), due.length, due.length ? T('hand in when ready') : T('all caught up')) +
        stat('chart', T('Average grade'), (avg == null ? '—' : avg + '<small>/100</small>'), T('{n} graded', { n: graded.length })) +
      '</div>' +

      '<div class="grid g-2-1 mt">' +
        '<div class="card"><div class="card__h"><h3>' + (live ? T('Lesson in progress') : T('Next lesson')) + '</h3><span class="sp"></span>' +
          '<a class="btn btn--sm" href="#/s/lessons">' + T('My timetable') + U.icon('chevron') + '</a></div>' +
          (next ? nextCard(next) : U.empty('calendar', T('No upcoming lessons'))) + '</div>' +

        '<div class="card"><div class="card__h"><h3>' + T('To do') + '</h3></div><div class="list">' +
          (due.length ? due.slice(0, 5).map(function (l) {
            return '<div class="row row--link" data-act="sOpenLesson" data-id="' + l.id + '">' +
              '<div class="av av--sm" style="background:var(--brand)">' + U.icon('file', 14) + '</div>' +
              '<div class="row__m"><b>' + U.esc(l.title) + '</b><small>' + U.esc(S.klass(l.classId).name) + '</small></div>' +
              U.icon('chevron') + '</div>';
          }).join('') :
            '<div class="row"><div class="av av--sm" style="background:var(--jade)">' + U.icon('check', 14) + '</div>' +
            '<div class="row__m"><b>' + T('Nothing outstanding') + '</b><small>' + T('Every assignment handed in') + '</small></div></div>') +
        '</div></div>' +
      '</div>' +

      '<div class="grid g-1-2 mt">' +
        '<div class="card"><div class="card__h"><h3>' + T('My classes') + '</h3></div><div class="list">' +
          (classes.length ? classes.map(function (c) {
            var teacher = S.user(c.teacherId);
            var r = S.attendanceRate(S.attendanceOfStudent(s.id, c.id));
            return '<div class="row"><div class="av" style="background:#221C19">' +
                U.esc(c.level.replace(/[^0-9+]/g, '') || 'B') + '</div>' +
              '<div class="row__m"><b>' + U.esc(c.name) + '</b>' +
                '<small class="cn">' + U.esc(c.cn) + '</small><small> · ' + U.esc(teacher.name) + '</small></div>' +
              '<span class="tag tag--' + (r == null ? '' : r >= 85 ? 'green' : r >= 70 ? 'amber' : 'red') + '">' +
                (r == null ? '—' : r + '%') + '</span></div>';
          }).join('') : U.empty('layers', T('Not enrolled in a class yet'))) +
        '</div></div>' +

        '<div class="card"><div class="card__h"><h3>' + T('Recent lessons') + '</h3><span class="sp"></span>' +
          '<a class="btn btn--sm" href="#/s/vocab">' + U.icon('sparkles') + T('Practise words') + '</a></div>' +
          '<div class="tw"><table><thead><tr><th>' + T('Lesson') + '</th><th>' + T('Date') + '</th><th>' +
            T('Attendance') + '</th><th>' + T('Homework') + '</th></tr></thead><tbody>' +
          lessons.filter(function (l) { return l.status === 'completed'; }).slice(-6).reverse().map(function (l) {
            var sub = S.submission(l.id, s.id);
            var no = S.lessonNo(l);
            return '<tr data-act="sOpenLesson" data-id="' + l.id + '" style="cursor:pointer">' +
              '<td><div style="display:flex;align-items:center;gap:9px"><span class="lessonNo">' + no.n + '</span>' +
                '<div><b>' + U.esc(l.title) + '</b><div class="tiny muted cn">' + U.esc(l.cn) + '</div></div></div></td>' +
              '<td class="num">' + U.fmt.date(l.date) + '</td>' +
              '<td>' + U.markTag(S.mark(l.id, s.id)) + '</td>' +
              '<td>' + (!l.homework ? '<span class="muted tiny">' + T('none') + '</span>'
                : sub ? (sub.grade == null ? '<span class="tag tag--slate">' + T('Submitted') + '</span>'
                                           : '<span class="tag tag--green num">' + sub.grade + '</span>')
                      : '<span class="tag tag--red">' + T('Not handed in') + '</span>') + '</td></tr>';
          }).join('') +
        '</tbody></table></div></div>' +
      '</div>';
  }

  function liveBanner(l) {
    var c = S.klass(l.classId);
    return '<div class="liveBanner" data-live-badge>' +
      '<span class="dot"></span>' +
      '<div style="flex:1;min-width:0"><b>' + T('{class} is live now', { 'class': U.esc(c.name) }) + '</b>' +
        '<small>' + U.esc(l.title) + ' · ' + U.esc(S.user(c.teacherId).name) + '</small></div>' +
      '<button class="btn btn--pri btn--sm" data-act="sGoLive" data-id="' + l.id + '">' +
        U.icon('video') + T('Join the lesson') + '</button></div>';
  }

  function nextCard(l) {
    var c = S.klass(l.classId), t = S.user(c.teacherId);
    var no = S.lessonNo(l);
    var live = isLive(l.id);
    return '<div class="card__b">' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">' +
        '<div style="flex:1;min-width:220px">' +
          '<div style="display:flex;gap:8px;margin-bottom:9px;flex-wrap:wrap">' +
            (live ? '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + '</span>' : U.statusTag(l)) +
            '<span class="tag tag--gold">' + T('Lesson {n} of {total}', { n: no.n, total: no.total }) + '</span>' +
            '<span class="tag">' + U.esc(c.level) + '</span></div>' +
          '<h2 style="font-size:22px">' + U.esc(l.title) + '</h2>' +
          '<div class="cn muted" style="font-size:15px">' + U.esc(l.cn) + '</div>' +
          '<p class="muted" style="margin:10px 0 0">' + U.esc(l.topic) + '</p>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font:700 20px/1.2 var(--sans)">' + U.fmt.date(l.date) + '</div>' +
          '<div class="muted">' + U.esc(l.time) + (c.room ? ' · ' + U.esc(c.room) : '') + '</div>' +
          '<div class="muted tiny">' + U.esc(t.name) + '</div></div>' +
      '</div>' +
      '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">' +
        (live ? '<button class="btn btn--pri" data-act="sGoLive" data-id="' + l.id + '">' + U.icon('video') + T('Join the lesson') + '</button>' : '') +
        '<button class="btn' + (live ? '' : ' btn--pri') + '" data-act="sOpenLesson" data-id="' + l.id + '">' + U.icon('book') + T('Open lesson') + '</button>' +
        '<button class="btn" data-act="practise" data-id="' + l.id + '">' + U.icon('sparkles') + T('Preview the words') + '</button>' +
      '</div></div>';
  }

  /* ══ TIMETABLE ═══════════════════════════════════════ */
  function lessons() {
    var s = me();
    var all = S.lessonsOfStudent(s.id);
    var f = App.filters.sScope || 'upcoming';
    var list = all.filter(function (l) {
      if (f === 'upcoming') return l.date >= S.today();
      if (f === 'past') return l.date < S.today();
      return true;
    });
    if (f === 'past') list = list.slice().reverse();

    return '<div class="sect"><div class="roleTabs" style="margin:0;max-width:360px;flex:1">' +
        [['upcoming', T('Upcoming')], ['past', T('Past')], ['all', T('All')]].map(function (k) {
          return '<button data-act="setSScope" data-v="' + k[0] + '" class="' + (f === k[0] ? 'on' : '') + '">' + k[1] + '</button>';
        }).join('') + '</div></div>' +
      '<div class="card"><div class="tw"><table>' +
        '<thead><tr><th>' + T('Lesson') + '</th><th>' + T('Class') + '</th><th>' + T('When') + '</th><th>' +
          T('Attendance') + '</th><th>' + T('Homework') + '</th></tr></thead><tbody>' +
        (list.length ? list.map(function (l) {
          var c = S.klass(l.classId), sub = S.submission(l.id, s.id);
          var no = S.lessonNo(l);
          return '<tr data-act="sOpenLesson" data-id="' + l.id + '" style="cursor:pointer">' +
            '<td><div style="display:flex;align-items:center;gap:9px"><span class="lessonNo">' + no.n + '</span>' +
              '<div><b>' + U.esc(l.title) + '</b><div class="tiny muted cn">' + U.esc(l.cn) + '</div></div></div></td>' +
            '<td class="tiny">' + U.esc(c.name) + '<div class="muted">' + U.esc(c.room) + '</div></td>' +
            '<td class="num">' + U.fmt.date(l.date) + '<div class="tiny muted">' + U.esc(l.time) + ' · ' + U.fmt.rel(l.date) + '</div></td>' +
            '<td>' + (isLive(l.id) ? '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + '</span>'
                     : l.status === 'completed' ? U.markTag(S.mark(l.id, s.id)) : U.statusTag(l)) + '</td>' +
            '<td>' + (!l.homework ? '<span class="muted tiny">' + T('none') + '</span>'
              : sub ? (sub.grade == null ? '<span class="tag tag--slate">' + T('Submitted') + '</span>'
                                         : '<span class="tag tag--green num">' + sub.grade + '</span>')
                    : '<span class="tag tag--amber">' + T('To do') + '</span>') + '</td></tr>';
        }).join('') : '<tr><td colspan="5">' + U.empty('calendar', T('Nothing here')) + '</td></tr>') +
      '</tbody></table></div></div>';
  }

  function lessonDetail(id) {
    var s = me(), l = S.lesson(id);
    if (!l) return '<div class="card">' + U.empty('alert', T('Lesson not found')) + '</div>';
    var c = S.klass(l.classId), t = S.user(c.teacherId);
    var sub = S.submission(l.id, s.id);
    var no = S.lessonNo(l);
    var live = isLive(l.id);

    return '' +
      '<button class="btn btn--ghost btn--sm" data-act="go" data-href="#/s/lessons" style="margin-bottom:14px">' +
        U.icon('back') + T('My timetable') + '</button>' +

      '<div class="card"><div class="card__b">' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">' +
          '<div style="flex:1;min-width:230px">' +
            '<div style="display:flex;gap:8px;margin-bottom:9px;flex-wrap:wrap">' +
              (live ? '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + '</span>' : U.statusTag(l)) +
              '<span class="tag tag--gold">' + T('Lesson {n} of {total}', { n: no.n, total: no.total }) + '</span>' +
              '<span class="tag">' + U.esc(c.level) + '</span>' +
              '<span class="tag">' + U.esc(c.name) + '</span></div>' +
            '<h2 style="font-size:23px">' + U.esc(l.title) + '</h2>' +
            '<div class="cn muted" style="font-size:16px">' + U.esc(l.cn) + '</div>' +
            '<p class="muted" style="margin:10px 0 0">' + U.esc(l.topic) + '</p></div>' +
          '<div style="text-align:right">' +
            '<div style="font:700 19px/1.2 var(--sans)">' + U.fmt.dateLong(l.date) + '</div>' +
            '<div class="muted">' + U.esc(l.time) + (c.room ? ' · ' + U.esc(c.room) : '') + '</div>' +
            '<div class="muted tiny">' + U.esc(t.name) + '</div>' +
            (l.status === 'completed' ? '<div style="margin-top:8px">' + U.markTag(S.mark(l.id, s.id)) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">' +
          (live ? '<button class="btn btn--pri" data-act="sGoLive" data-id="' + l.id + '">' + U.icon('video') + T('Join the lesson') + '</button>' : '') +
          '<button class="btn' + (live ? '' : ' btn--pri') + '" data-act="practise" data-id="' + l.id + '">' +
            U.icon('sparkles') + T('Practise these words') + '</button>' +
        '</div>' +
      '</div></div>' +

      '<div class="grid g-2-1 mt">' +
        '<div class="card"><div class="card__h"><h3>' + T('Vocabulary') + '</h3>' +
          U.gloss('生词 · ' + l.words.length) + '</div><div class="card__b">' +
          (l.words.length ? '<div class="vocab">' + l.words.map(function (w) {
            return '<div class="word">' +
              '<button class="word__say" data-act="say" data-text="' + U.esc(w.hz) + '" title="' + T('Say it') + '">' + U.icon('speaker') + '</button>' +
              '<div class="word__hz">' + U.esc(w.hz) + '</div>' +
              '<div class="word__py">' + U.esc(w.py) + '</div>' +
              '<div class="word__en">' + U.esc(w.en) + '</div></div>';
          }).join('') + '</div>' : U.empty('book', T('No words for this lesson'))) +
        '</div></div>' +

        '<div class="card"><div class="card__h"><h3>' + T('Homework') + '</h3>' + U.gloss('作业') + '</div>' +
          '<div class="card__b">' +
            (!l.homework ? '<p class="muted" style="margin:0">' + T('Nothing set for this lesson.') + '</p>' :
              '<p style="margin:0 0 14px">' + U.esc(l.homework) + '</p>' +
              (sub ?
                '<div style="padding:12px;background:var(--card-2);border:1px solid var(--line);border-radius:10px">' +
                  '<div class="tiny muted" style="font-weight:600">' + T('MY ANSWER') + ' · ' + U.fmt.date(sub.submittedAt) + '</div>' +
                  '<p style="margin:5px 0 0">' + U.esc(sub.text) + '</p></div>' +
                (sub.grade == null ? '<div style="margin-top:12px"><span class="tag tag--slate">' + T('Waiting for grading') + '</span></div>' :
                  '<div style="margin-top:12px"><span class="tag tag--green num">' + sub.grade + ' / 100</span></div>' +
                  (sub.feedback ? '<p class="tiny muted" style="margin:9px 0 0"><b>' + T('Feedback') + ': </b>' + U.esc(sub.feedback) + '</p>' : '')) +
                '<button class="btn btn--sm" data-act="submitHw" data-id="' + l.id + '" style="margin-top:12px">' +
                  U.icon('pencil') + T('Edit my answer') + '</button>'
                :
                '<button class="btn btn--pri" data-act="submitHw" data-id="' + l.id + '">' +
                  U.icon('file') + T('Hand in') + '</button>')) +
          '</div></div>' +
      '</div>';
  }

  /* ══ VOCABULARY PRACTICE ═════════════════════════════ */
  function vocab() {
    var s = me();
    var lessons = S.lessonsOfStudent(s.id).filter(function (l) { return l.words.length; });
    var f = App.flash;

    if (!f) {
      return '<div class="card"><div class="card__h"><h3>' + T('Choose a set to practise') + '</h3>' +
          U.gloss('生词练习') + '</div><div class="list">' +
        (lessons.length ? lessons.slice().reverse().map(function (l) {
          var c = S.klass(l.classId);
          var no = S.lessonNo(l);
          return '<div class="row row--link" data-act="practise" data-id="' + l.id + '">' +
            '<span class="lessonNo">' + no.n + '</span>' +
            '<div class="row__m"><b>' + U.esc(l.title) + '</b>' +
              '<small class="cn">' + U.esc(l.cn) + '</small><small> · ' + U.esc(c.name) + ' · ' + U.fmt.date(l.date) + '</small></div>' +
            '<span class="tag">' + T('{n} words', { n: l.words.length }) + '</span>' + U.icon('chevron') + '</div>';
        }).join('') : U.empty('book', T('No vocabulary yet'))) +
      '</div></div>';
    }

    var w = f.words[f.i];
    var known = Object.keys(f.known).length;
    return '<div class="sect">' +
        '<button class="btn btn--ghost btn--sm" data-act="endPractise">' + U.icon('back') + T('Choose another set') + '</button>' +
        '<span class="sp"></span>' +
        '<span class="tag tag--gold">' + U.esc(f.title) + '</span>' +
        '<span class="tag">' + (f.i + 1) + ' / ' + f.words.length + '</span>' +
      '</div>' +
      '<div style="max-width:620px;margin:0 auto">' +
        U.bar(Math.round((f.i + 1) / f.words.length * 100), 'var(--gold)') +
        '<div class="flash" data-act="flip" style="margin-top:16px">' +
          '<div>' +
            '<div class="flash__hz">' + U.esc(w.hz) + '</div>' +
            (f.flipped ?
              '<div class="flash__py">' + U.esc(w.py) + '</div><div class="flash__en">' + U.esc(w.en) + '</div>'
              : '<div class="flash__hint">' + T('Click the card to reveal the pinyin and meaning') + '</div>') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap;justify-content:center">' +
          '<button class="btn" data-act="flashPrev">' + U.icon('back') + T('Back') + '</button>' +
          '<button class="btn" data-act="say" data-text="' + U.esc(w.hz) + '">' + U.icon('speaker') + T('Say it') + '</button>' +
          '<button class="btn' + (f.known[f.i] ? ' btn--pri' : '') + '" data-act="flashKnown">' +
            U.icon('check') + (f.known[f.i] ? T('Known') : T('I know this')) + '</button>' +
          '<button class="btn" data-act="flashShuffle">' + U.icon('shuffle') + T('Shuffle') + '</button>' +
          '<button class="btn btn--pri" data-act="flashNext">' + T('Next') + U.icon('chevron') + '</button>' +
        '</div>' +
        '<p class="tiny muted" style="text-align:center;margin-top:14px">' +
          T('{known} of {total} marked as known', { known: known, total: f.words.length }) + ' · ' +
          T('use the arrow keys to move, space to flip') + '</p>' +
      '</div>';
  }

  /* ══ HOMEWORK ════════════════════════════════════════ */
  function homework() {
    var s = me();
    var lessons = S.lessonsOfStudent(s.id).filter(function (l) { return !!l.homework; });
    var f = App.filters.sHw || 'todo';
    var list = lessons.filter(function (l) {
      var sub = S.submission(l.id, s.id);
      if (f === 'todo') return !sub;
      if (f === 'submitted') return !!sub;
      return true;
    });
    var graded = S.data.submissions.filter(function (x) { return x.studentId === s.id && x.grade != null; });
    var avg = graded.length ? Math.round(graded.reduce(function (a, x) { return a + x.grade; }, 0) / graded.length) : null;
    var handed = lessons.filter(function (l) { return !!S.submission(l.id, s.id); }).length;

    return '<div class="grid g3">' +
        stat('file', T('Assignments'), lessons.length, T('set for my classes')) +
        stat('check', T('Handed in'), handed, '') +
        stat('chart', T('Average grade'), (avg == null ? '—' : avg + '<small>/100</small>'), T('{n} graded', { n: graded.length })) +
      '</div>' +
      '<div class="sect mt"><div class="roleTabs" style="margin:0;max-width:360px;flex:1">' +
        [['todo', T('To do')], ['submitted', T('Submitted')], ['all', T('All')]].map(function (k) {
          return '<button data-act="setSHw" data-v="' + k[0] + '" class="' + (f === k[0] ? 'on' : '') + '">' + k[1] + '</button>';
        }).join('') + '</div></div>' +
      '<div class="card"><div class="list">' +
        (list.length ? list.slice().reverse().map(function (l) {
          var sub = S.submission(l.id, s.id), c = S.klass(l.classId);
          return '<div class="row">' +
            '<div class="av av--sm" style="background:' + (sub ? (sub.grade == null ? 'var(--slate)' : 'var(--jade)') : 'var(--red)') + '">' +
              U.icon(sub ? 'check' : 'file', 14) + '</div>' +
            '<div class="row__m"><b>' + U.esc(l.title) + '</b>' +
              '<small>' + U.esc(c.name) + ' · ' + U.fmt.date(l.date) + '</small>' +
              '<div class="tiny muted" style="margin-top:3px">' + U.esc(l.homework) + '</div></div>' +
            (sub && sub.grade != null ? '<span class="tag tag--green num">' + sub.grade + '</span>' : '') +
            '<button class="btn btn--sm' + (sub ? '' : ' btn--pri') + '" data-act="submitHw" data-id="' + l.id + '">' +
              (sub ? T('Edit') : T('Hand in')) + '</button>' +
            '<button class="btn btn--sm" data-act="sOpenLesson" data-id="' + l.id + '">' + T('Lesson') + '</button>' +
          '</div>';
        }).join('') : U.empty('inbox', T('Nothing here'), T('Try another filter.'))) +
      '</div></div>';
  }

  /* ══ PROGRESS ════════════════════════════════════════ */
  function progress() {
    var s = me();
    var classes = S.classesOfStudent(s.id);
    var rows = S.attendanceOfStudent(s.id);
    var rate = S.attendanceRate(rows);
    var graded = S.data.submissions.filter(function (x) { return x.studentId === s.id && x.grade != null; })
      .sort(function (a, b) { return a.submittedAt.localeCompare(b.submittedAt); });

    var counts = { present: 0, late: 0, absent: 0, excused: 0 };
    rows.forEach(function (r) { counts[r.status]++; });

    return '<div class="grid g-1-2">' +
        '<div class="card"><div class="card__h"><h3>' + T('Attendance') + '</h3>' + U.gloss('出勤') + '</div>' +
          '<div class="card__b" style="text-align:center">' + U.ring(rate == null ? 0 : rate, T('overall')) +
            '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:14px">' +
              Object.keys(counts).map(function (k) {
                return '<span class="tag tag--' + ({ present: 'green', late: 'amber', absent: 'red', excused: 'slate' })[k] + '">' +
                  U.esc(U.markLabel(k)) + ' ' + counts[k] + '</span>';
              }).join('') +
            '</div></div></div>' +
        '<div class="card"><div class="card__h"><h3>' + T('Grades over time') + '</h3></div><div class="card__b">' +
          (graded.length ? U.spark(graded.slice(-10).map(function (g) {
            return { label: U.fmt.day(g.submittedAt), value: g.grade };
          })) : U.empty('chart', T('No grades yet'))) +
        '</div></div>' +
      '</div>' +

      '<div class="grid g' + Math.min(Math.max(classes.length, 1), 3) + ' mt">' +
        classes.map(function (c) {
          var pg = S.progressOf(c.id, s.id);
          var r = S.attendanceRate(S.attendanceOfStudent(s.id, c.id));
          var ls = S.lessonsOfClass(c.id);
          var done = ls.filter(function (l) { return l.status === 'completed'; }).length;
          return '<div class="card"><div class="card__h"><h3>' + U.esc(c.name) + '</h3>' +
              '<span class="cn muted">' + U.esc(c.cn) + '</span></div>' +
            '<div class="card__b">' +
              (pg ? U.radar(pg) : U.empty('target', T('Not assessed yet'))) +
              '<div style="display:flex;justify-content:space-between;margin:12px 0 5px" class="tiny">' +
                '<span class="muted">' + T('Course progress') + '</span><b>' +
                T('{done} of {total} lessons', { done: done, total: ls.length }) + '</b></div>' +
              U.bar(ls.length ? done / ls.length * 100 : 0) +
              '<div style="display:flex;justify-content:space-between;margin:14px 0 5px" class="tiny">' +
                '<span class="muted">' + T('Attendance') + '</span><b>' + (r == null ? '—' : r + '%') + '</b></div>' +
              U.bar(r || 0, r == null ? undefined : r >= 85 ? 'var(--jade)' : r >= 70 ? 'var(--amber)' : 'var(--red)') +
              '<div class="tiny muted" style="margin-top:14px">' + T('Teacher') + ' · ' + U.esc(S.user(c.teacherId).name) + '</div>' +
            '</div></div>';
        }).join('') +
      '</div>';
  }

  /* ══ ACTIONS ═════════════════════════════════════════ */
  A.sOpenLesson = function (e) { App.go('#/s/lesson/' + e.getAttribute('data-id')); };
  A.sGoLive = function (e) { App.go('#/s/live/' + e.getAttribute('data-id')); };
  A.setSScope = function (e) { App.filters.sScope = e.getAttribute('data-v'); App.render(); };
  A.setSHw = function (e) { App.filters.sHw = e.getAttribute('data-v'); App.render(); };

  A.submitHw = function (e) {
    var s = me(), l = S.lesson(e.getAttribute('data-id'));
    var sub = S.submission(l.id, s.id);
    U.Modal.open({
      title: sub ? T('Edit my answer') : T('Hand in homework'), cn: '交作业', wide: true,
      body: '<div class="tiny muted" style="font-weight:600">' + T('ASSIGNMENT') + ' · ' + U.esc(l.title) + '</div>' +
            '<p style="margin:3px 0 16px">' + U.esc(l.homework) + '</p>' +
            '<label class="field"><span>' + T('My answer') + '</span>' +
              '<textarea name="text" style="min-height:150px" placeholder="' +
              T('Type your answer, or describe the work you are handing in.') + '">' +
              U.esc(sub ? sub.text : '') + '</textarea></label>' +
            (sub && sub.grade != null ? '<p class="tiny muted" style="margin:0">' +
              T('Already graded {g}/100 — editing clears the grade so your teacher can look again.', { g: sub.grade }) + '</p>' : ''),
      okText: sub ? T('Save answer') : T('Hand in'),
      onOk: function () {
        var text = U.Modal.val('text');
        if (!text) { U.toast(T('Write something before handing in'), 'alert'); return; }
        if (sub) {
          sub.text = text; sub.submittedAt = S.today();
          if (sub.grade != null) { sub.grade = null; sub.feedback = ''; }
        } else {
          S.data.submissions.push({
            id: S.uid('sub'), lessonId: l.id, studentId: s.id, text: text,
            submittedAt: S.today(), grade: null, feedback: ''
          });
        }
        S.save(); U.Modal.close(); App.render(); U.toast(T('Homework handed in'));
      }
    });
  };

  A.practise = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    App.flash = { title: l.title, words: l.words.slice(), i: 0, flipped: false, known: {} };
    App.go('#/s/vocab');
  };
  A.endPractise = function () { App.flash = null; App.render(); };
  A.flip = function () { if (App.flash) { App.flash.flipped = !App.flash.flipped; App.render(); } };
  A.flashNext = function () {
    var f = App.flash; if (!f) return;
    if (f.i < f.words.length - 1) { f.i++; f.flipped = false; App.render(); }
    else { U.toast(T('End of the set — {known} of {total} known', { known: Object.keys(f.known).length, total: f.words.length }), 'sparkles'); }
  };
  A.flashPrev = function () {
    var f = App.flash; if (!f || f.i === 0) return;
    f.i--; f.flipped = false; App.render();
  };
  A.flashKnown = function () {
    var f = App.flash; if (!f) return;
    if (f.known[f.i]) delete f.known[f.i]; else f.known[f.i] = 1;
    App.render();
  };
  A.flashShuffle = function () {
    var f = App.flash; if (!f) return;
    for (var i = f.words.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = f.words[i]; f.words[i] = f.words[j]; f.words[j] = t;
    }
    f.i = 0; f.flipped = false; f.known = {};
    App.render(); U.toast(T('Shuffled'));
  };

  global.StudentViews = {
    init: init,
    dashboard: dashboard, lessons: lessons, lessonDetail: lessonDetail,
    vocab: vocab, homework: homework, progress: progress
  };
})(window);
