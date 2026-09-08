/* ERA Chinese — teacher views. */
(function (global) {
  'use strict';
  var U, S;
  global.Actions = global.Actions || {};
  var A = global.Actions;

  function init() { U = global.UI; S = global.Store; }
  function me() { return S.user(App.session.userId); }

  /* ══ helpers ═════════════════════════════════════════ */
  function weekRange() { return { from: S.offset(-3), to: S.offset(3) }; }

  function isLive(lessonId) {
    var r = global.Live && global.Live.room(lessonId);
    return !!(r && r.active);
  }

  /* A graduate keeps their place on every roster — this is the badge that says
     so wherever their name still appears. */
  function gradTag(s) {
    return S.isGraduated(s) ? ' <span class="tag tag--slate">' + T('Graduated') + '</span>' : '';
  }

  function classOptions(selected, teacherId) {
    return S.classesOfTeacher(teacherId).map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === selected ? ' selected' : '') + '>' +
        U.esc(c.name) + ' · ' + U.esc(c.cn) + '</option>';
    }).join('');
  }
  function deckOptions(selected) {
    return S.data.decks.map(function (d) {
      return '<option value="' + d.id + '"' + (d.id === selected ? ' selected' : '') + '>' +
        U.esc(d.name) + ' · ' + U.esc(d.cn) + '</option>';
    }).join('');
  }
  function levelOptions(selected) {
    return S.LEVELS.map(function (l) {
      return '<option value="' + U.esc(l) + '"' + (l === selected ? ' selected' : '') + '>' + U.esc(l) + '</option>';
    }).join('');
  }

  function lessonRow(l, opts) {
    var c = S.klass(l.classId);
    var no = S.lessonNo(l);
    var marked = Object.keys(S.data.attendance[l.id] || {}).length;
    var onRegister = S.registerOf(l).length;
    return '<tr data-act="openLesson" data-id="' + l.id + '" style="cursor:pointer">' +
      '<td><div style="display:flex;align-items:center;gap:9px">' +
        '<span class="lessonNo">' + no.n + '</span>' +
        '<div><b>' + U.esc(l.title) + '</b><div class="tiny muted cn">' + U.esc(l.cn) + '</div></div></div></td>' +
      (opts && opts.noClass ? '' : '<td>' + U.esc(c ? c.name : '—') + '</td>') +
      '<td class="num">' + U.fmt.date(l.date) + '<div class="tiny muted">' + U.esc(l.time) + ' · ' + U.fmt.rel(l.date) + '</div></td>' +
      '<td class="num">' + marked + '/' + onRegister + '</td>' +
      '<td>' + (isLive(l.id) ? '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + '</span>' : U.statusTag(l)) + '</td></tr>';
  }

  function stat(ic, k, v, s) {
    return '<div class="stat"><div class="stat__k">' + U.icon(ic) + U.esc(k) + '</div>' +
      '<div class="stat__v">' + v + '</div>' + (s ? '<div class="stat__s">' + U.esc(s) + '</div>' : '') + '</div>';
  }

  /* ══ DASHBOARD ═══════════════════════════════════════ */
  function dashboard() {
    var t = me();
    var classes = S.classesOfTeacher(t.id);
    var lessons = S.lessonsOfTeacher(t.id);
    var studentIds = {};
    classes.forEach(function (c) { S.rosterOf(c.id).forEach(function (s) { studentIds[s] = 1; }); });

    var wk = weekRange();
    var thisWeek = lessons.filter(function (l) { return l.date >= wk.from && l.date <= wk.to; });
    var live = lessons.filter(function (l) { return isLive(l.id); })[0];
    var upcoming = lessons.filter(function (l) { return l.date >= S.today() && l.status !== 'completed'; });
    var next = live || upcoming[0];

    var tot = 0, ok = 0;
    lessons.forEach(function (l) {
      var m = S.data.attendance[l.id] || {};
      Object.keys(m).forEach(function (k) { tot++; if (m[k] === 'present' || m[k] === 'late') ok++; });
    });
    var rate = tot ? Math.round(ok / tot * 100) : 0;

    var ungraded = S.data.submissions.filter(function (s) {
      var l = S.lesson(s.lessonId);
      return s.grade == null && l && classes.some(function (c) { return c.id === l.classId; });
    });
    var openRegisters = lessons.filter(function (l) { return l.date < S.today() && l.status !== 'completed'; });
    var low = lowAttendance(classes);

    var done = lessons.filter(function (l) { return l.status === 'completed'; }).slice(-6);
    var series = done.map(function (l) {
      var m = S.data.attendance[l.id] || {};
      var ks = Object.keys(m);
      var good = ks.filter(function (k) { return m[k] === 'present' || m[k] === 'late'; }).length;
      return { label: U.fmt.day(l.date), value: ks.length ? Math.round(good / ks.length * 100) : 0 };
    });

    return '' +
      '<div class="grid g4">' +
        stat('layers', T('Classes'), classes.length, classes.map(function (c) { return c.level; }).join(' · ')) +
        stat('users', T('Students'), Object.keys(studentIds).length, T('across all classes')) +
        stat('calendar', T('Lessons this week'), thisWeek.length, U.fmt.date(wk.from) + ' – ' + U.fmt.date(wk.to)) +
        stat('target', T('Attendance'), rate + '<small>%</small>', T('{n} marks recorded', { n: tot })) +
      '</div>' +

      '<div class="grid g-2-1 mt">' +
        '<div class="card">' +
          '<div class="card__h"><h3>' + (live ? T('Lesson in progress') : T('Next lesson')) + '</h3><span class="sp"></span>' +
            '<a class="btn btn--sm" href="#/t/lessons">' + T('All lessons') + U.icon('chevron') + '</a></div>' +
          (next ? nextLessonBody(next) : U.empty('calendar', T('Nothing scheduled'), T('Create a lesson to get started.'))) +
        '</div>' +
        '<div class="card">' +
          '<div class="card__h"><h3>' + T('Needs attention') + '</h3></div>' +
          '<div class="list">' +
            attnRow('inbox', T('{n} assignments to grade', { n: ungraded.length }), T('Homework handed in and waiting'), '#/t/homework', ungraded.length) +
            attnRow('alert', T('{n} registers still open', { n: openRegisters.length }), T('Past lessons never closed out'), '#/t/lessons', openRegisters.length) +
            attnRow('grad', T('{n} students below 70%', { n: low.length }), T('Attendance needs a conversation'), '#/t/students', low.length) +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="grid g-1-2 mt">' +
        '<div class="card"><div class="card__h"><h3>' + T('Attendance trend') + '</h3></div>' +
          '<div class="card__b">' + (series.length ? U.spark(series) : U.empty('chart', T('No completed lessons yet'))) + '</div></div>' +
        '<div class="card"><div class="card__h"><h3>' + T('My classes') + '</h3><span class="sp"></span>' +
          '<button class="btn btn--pri btn--sm" data-act="newClass">' + U.icon('plus') + T('New class') + '</button></div><div class="list">' +
          (classes.length ? classes.map(function (c) {
            var next2 = S.lessonsOfClass(c.id).filter(function (l) { return l.date >= S.today(); })[0];
            return '<div class="row row--link" data-act="openClass" data-id="' + c.id + '">' +
              '<div class="av" style="background:#221C19">' + U.esc(c.level.replace(/[^0-9+]/g, '') || 'B') + '</div>' +
              '<div class="row__m"><b>' + U.esc(c.name) + '</b>' +
                '<small class="cn">' + U.esc(c.cn) + '</small> <small>· ' + U.esc(U.daysLabel(c.days)) + ' ' + U.esc(c.time) + '</small></div>' +
              '<div style="text-align:right"><b class="num">' + S.rosterOf(c.id).length + '</b>' +
                '<div class="tiny muted">' + (next2 ? U.fmt.rel(next2.date) : T('no lessons')) + '</div></div>' +
              U.icon('chevron') + '</div>';
          }).join('') : U.empty('layers', T('No classes yet'), T('Create your first class.'))) +
        '</div></div>' +
      '</div>';
  }

  function nextLessonBody(l) {
    var c = S.klass(l.classId);
    var no = S.lessonNo(l);
    var live = isLive(l.id);
    return '<div class="card__b">' +
      '<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:220px">' +
          '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">' +
            (live ? '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + '</span>' : U.statusTag(l)) +
            '<span class="tag tag--gold">' + T('Lesson {n} of {total}', { n: no.n, total: no.total }) + '</span>' +
            '<span class="tag">' + U.esc(c.level) + '</span></div>' +
          '<h2 style="font-size:22px">' + U.esc(l.title) + '</h2>' +
          '<div class="cn muted" style="font-size:15px">' + U.esc(l.cn) + '</div>' +
          '<p class="muted" style="margin:10px 0 0">' + U.esc(l.topic) + '</p>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font:700 20px/1.2 var(--sans)">' + U.fmt.date(l.date) + '</div>' +
          '<div class="muted">' + U.esc(l.time) + ' · ' + U.esc(c.room) + '</div>' +
          '<div class="muted tiny">' + U.esc(c.name) + ' · ' + T('{n} students', { n: S.rosterOf(c.id).length }) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">' +
        '<button class="btn btn--pri" data-act="goLive" data-id="' + l.id + '">' + U.icon('video') +
          (live ? T('Back into the classroom') : T('Start the online lesson')) + '</button>' +
        '<button class="btn" data-act="openLesson" data-id="' + l.id + '">' + U.icon('book') + T('Open lesson') + '</button>' +
        '<button class="btn" data-act="openClass" data-id="' + c.id + '">' + U.icon('users') + T('Class roster') + '</button>' +
      '</div></div>';
  }

  function attnRow(ic, title, sub, href, n) {
    return '<a class="row row--link" href="' + href + '">' +
      '<div class="av av--sm" style="background:' + (n ? 'var(--red)' : 'var(--jade)') + '">' + U.icon(n ? ic : 'check', 14) + '</div>' +
      '<div class="row__m"><b>' + U.esc(title) + '</b><small>' + U.esc(sub) + '</small></div>' +
      U.icon('chevron') + '</a>';
  }

  function lowAttendance(classes) {
    var out = [];
    classes.forEach(function (c) {
      S.rosterOf(c.id).forEach(function (sid) {
        var r = S.attendanceRate(S.attendanceOfStudent(sid, c.id));
        if (r != null && r < 70) out.push({ studentId: sid, classId: c.id, rate: r });
      });
    });
    return out;
  }

  /* ══ CLASSES ═════════════════════════════════════════ */
  function classes() {
    var t = me();
    var list = S.classesOfTeacher(t.id);
    return '<div class="sect"><h3>' + T('My classes') + '</h3>' + U.gloss('班级') + '<span class="sp"></span>' +
        '<button class="btn btn--pri" data-act="newClass">' + U.icon('plus') + T('New class') + '</button></div>' +
      (list.length ? '<div class="grid g3">' + list.map(function (c) {
        var ls = S.lessonsOfClass(c.id);
        var done = ls.filter(function (l) { return l.status === 'completed'; }).length;
        var pct = ls.length ? Math.round(done / ls.length * 100) : 0;
        return '<div class="card" style="cursor:pointer" data-act="openClass" data-id="' + c.id + '">' +
          '<div class="card__b">' +
            '<div style="display:flex;gap:8px;margin-bottom:10px"><span class="tag tag--gold">' + U.esc(c.level) + '</span>' +
              (c.room ? '<span class="tag">' + U.esc(c.room) + '</span>' : '') + '</div>' +
            '<h3 style="font-size:17px">' + U.esc(c.name) + '</h3>' +
            '<div class="cn muted">' + U.esc(c.cn) + '</div>' +
            '<div class="muted tiny" style="margin-top:8px">' + U.esc(U.daysLabel(c.days)) + ' · ' + U.esc(c.time) + '</div>' +
            '<div style="display:flex;justify-content:space-between;margin:16px 0 6px" class="tiny">' +
              '<span class="muted">' + T('{done} of {total} lessons delivered', { done: done, total: ls.length }) + '</span><b>' + pct + '%</b></div>' +
            U.bar(pct) +
            '<div style="display:flex;align-items:center;margin-top:14px">' +
              S.rosterOf(c.id).slice(0, 6).map(function (sid) {
                return '<span style="margin-right:-8px">' + U.avatar(S.user(sid), 'av--sm') + '</span>';
              }).join('') +
              '<span class="tiny muted" style="margin-left:16px">' + T('{n} students', { n: S.rosterOf(c.id).length }) + '</span>' +
            '</div>' +
          '</div></div>';
      }).join('') + '</div>'
      : '<div class="card">' + U.empty('layers', T('No classes yet'),
          T('Create a class — HSK 4, say — then enrol your students in it.')) + '</div>');
  }

  function classDetail(id) {
    var c = S.klass(id);
    if (!c) return '<div class="card">' + U.empty('alert', T('Class not found')) + '</div>';
    var ls = S.lessonsOfClass(c.id);
    return '' +
      '<button class="btn btn--ghost btn--sm" data-act="go" data-href="#/t/classes" style="margin-bottom:14px">' +
        U.icon('back') + T('All classes') + '</button>' +
      '<div class="grid g-2-1">' +
        '<div class="card"><div class="card__h"><h3>' + T('Lessons') + '</h3><span class="sp"></span>' +
          '<button class="btn btn--pri btn--sm" data-act="newLesson" data-class="' + c.id + '">' + U.icon('plus') + T('New lesson') + '</button></div>' +
          '<div class="tw"><table><thead><tr><th>' + T('Lesson') + '</th><th>' + T('Date') + '</th><th>' +
            T('Marked') + '</th><th>' + T('Status') + '</th></tr></thead><tbody>' +
            (ls.length ? ls.map(function (l) { return lessonRow(l, { noClass: true }); }).join('') :
              '<tr><td colspan="4">' + U.empty('book', T('No lessons yet')) + '</td></tr>') +
          '</tbody></table></div></div>' +

        '<div><div class="card"><div class="card__h"><h3>' + U.esc(c.name) + '</h3><span class="sp"></span>' +
            '<button class="btn btn--ghost btn--sm" data-act="editClass" data-id="' + c.id + '">' + U.icon('pencil') + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="deleteClass" data-id="' + c.id + '">' + U.icon('trash') + '</button></div>' +
          '<div class="card__b">' +
            '<div class="cn" style="font-size:17px">' + U.esc(c.cn) + '</div>' +
            '<div class="muted tiny" style="margin-top:6px">' + U.esc(c.level) + (c.room ? ' · ' + U.esc(c.room) : '') + '</div>' +
            '<div class="muted tiny">' + U.esc(U.daysLabel(c.days)) + ' · ' + U.esc(c.time) + '</div>' +
            '<div class="muted tiny" style="margin-top:6px">' + T('{n} lessons in the course', { n: ls.length }) + '</div>' +
            '<div class="muted tiny">' + T('{money} per student, per month', {
              money: U.fmt.money(c.fee == null ? S.DEFAULT_FEE : c.fee) }) + '</div>' +
          '</div></div>' +
          '<div class="card mt"><div class="card__h"><h3>' + T('Roster') + '</h3><span class="sp"></span>' +
            '<button class="btn btn--pri btn--sm" data-act="enrolStudents" data-id="' + c.id + '">' +
              U.icon('plus') + T('Enrol') + '</button></div><div class="list">' +
            (c.studentIds.length ? c.studentIds.map(function (sid) {
              var s = S.user(sid);
              var rate = S.attendanceRate(S.attendanceOfStudent(sid, c.id));
              return '<div class="row"' + (S.isGraduated(s) ? ' style="opacity:.62"' : '') + '>' +
                '<span data-act="studentCard" data-id="' + sid + '" data-class="' + c.id + '" style="display:flex;align-items:center;gap:11px;flex:1;cursor:pointer;min-width:0">' +
                  U.avatar(s, 'av--sm') +
                  '<span class="row__m"><b>' + U.esc(s.name) + gradTag(s) + '</b><small class="cn">' + U.esc(s.cn) + '</small></span></span>' +
                '<span class="tag tag--' + (rate == null ? '' : rate >= 85 ? 'green' : rate >= 70 ? 'amber' : 'red') + '">' +
                  (rate == null ? '—' : rate + '%') + '</span>' +
                '<button class="btn btn--ghost btn--sm" data-act="unenrol" data-id="' + c.id + '" data-student="' + sid +
                  '" title="' + T('Remove from the class') + '">' + U.icon('x') + '</button></div>';
            }).join('') : U.empty('users', T('Nobody enrolled yet'), T('Press Enrol to add students.'))) +
          '</div></div>' +
        '</div>' +
      '</div>';
  }

  /* ══ LESSONS ═════════════════════════════════════════ */
  function lessons() {
    var t = me();
    var all = S.lessonsOfTeacher(t.id);
    var f = App.filters.lessonScope || 'upcoming';
    var list = all.filter(function (l) {
      if (f === 'upcoming') return l.date >= S.today();
      if (f === 'past') return l.date < S.today();
      return true;
    });
    if (f === 'past') list = list.slice().reverse();

    return '<div class="sect">' +
        '<div class="roleTabs" style="margin:0;max-width:360px;flex:1">' +
          [['upcoming', T('Upcoming')], ['past', T('Past')], ['all', T('All')]].map(function (k) {
            return '<button data-act="setScope" data-v="' + k[0] + '" class="' + (f === k[0] ? 'on' : '') + '">' + k[1] + '</button>';
          }).join('') +
        '</div><span class="sp"></span>' +
        '<button class="btn btn--pri" data-act="newLesson">' + U.icon('plus') + T('New lesson') + '</button>' +
      '</div>' +
      '<div class="card"><div class="tw"><table>' +
        '<thead><tr><th>' + T('Lesson') + '</th><th>' + T('Class') + '</th><th>' + T('Date') + '</th><th>' +
          T('Marked') + '</th><th>' + T('Status') + '</th></tr></thead><tbody>' +
        (list.length ? list.map(function (l) { return lessonRow(l); }).join('') :
          '<tr><td colspan="5">' + U.empty('book', T('Nothing here'), T('Try another filter or create a lesson.')) + '</td></tr>') +
      '</tbody></table></div></div>';
  }

  function lessonDetail(id) {
    var l = S.lesson(id);
    if (!l) return '<div class="card">' + U.empty('alert', T('Lesson not found')) + '</div>';
    var c = S.klass(l.classId);
    var no = S.lessonNo(l);
    var marks = S.data.attendance[l.id] || {};
    var register = S.registerOf(l);
    var subs = S.data.submissions.filter(function (s) { return s.lessonId === l.id; });
    var live = isLive(l.id);

    return '' +
      '<button class="btn btn--ghost btn--sm" data-act="go" data-href="#/t/lessons" style="margin-bottom:14px">' +
        U.icon('back') + T('All lessons') + '</button>' +

      '<div class="card"><div class="card__b">' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">' +
          '<div style="flex:1;min-width:240px">' +
            '<div style="display:flex;gap:8px;margin-bottom:9px;flex-wrap:wrap">' +
              (live ? '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + '</span>' : U.statusTag(l)) +
              '<span class="tag tag--gold">' + T('Lesson {n} of {total}', { n: no.n, total: no.total }) + '</span>' +
              '<span class="tag">' + U.esc(c.level) + '</span>' +
              '<span class="tag">' + U.esc(c.name) + '</span></div>' +
            '<h2 style="font-size:23px">' + U.esc(l.title) + '</h2>' +
            '<div class="cn muted" style="font-size:16px">' + U.esc(l.cn) + '</div>' +
          '</div>' +
          '<div style="text-align:right"><div style="font:700 19px/1.2 var(--sans)">' + U.fmt.dateLong(l.date) + '</div>' +
            '<div class="muted">' + U.esc(l.time) + (c.room ? ' · ' + U.esc(c.room) : '') + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">' +
          '<button class="btn btn--pri" data-act="goLive" data-id="' + l.id + '">' + U.icon('video') +
            (live ? T('Back into the classroom') : T('Start the online lesson')) + '</button>' +
          '<button class="btn" data-act="editLesson" data-id="' + l.id + '">' + U.icon('pencil') + T('Edit plan') + '</button>' +
          '<button class="btn" data-act="markAll" data-id="' + l.id + '">' + U.icon('checkSquare') + T('Mark all present') + '</button>' +
          (l.status === 'completed'
            ? '<button class="btn" data-act="reopenLesson" data-id="' + l.id + '">' + U.icon('clock') + T('Reopen') + '</button>'
            : '<button class="btn" data-act="completeLesson" data-id="' + l.id + '">' + U.icon('check') + T('Complete lesson') + '</button>') +
          '<button class="btn" data-act="deleteLesson" data-id="' + l.id + '">' + U.icon('trash') + T('Delete') + '</button>' +
        '</div>' +
      '</div></div>' +

      '<div class="grid g-2-1 mt">' +
        '<div class="card"><div class="card__h"><h3>' + T('Attendance register') + '</h3><span class="sp"></span>' +
          '<span class="tag">' + T('{n} of {total} marked', { n: Object.keys(marks).length, total: register.length }) + '</span></div>' +
          '<div class="reg">' + register.map(function (sid) {
            var s = S.user(sid), cur = marks[sid] || '';
            return '<div class="reg__r">' + U.avatar(s, 'av--sm') +
              '<div class="reg__n">' + U.esc(s.name) + ' <span class="cn muted tiny">' + U.esc(s.cn) + '</span>' + gradTag(s) + '</div>' +
              '<div class="marks">' + ['present', 'late', 'absent', 'excused'].map(function (m) {
                return '<button data-act="mark" data-lesson="' + l.id + '" data-student="' + sid + '" data-mark="' + m + '"' +
                  (cur === m ? ' class="on"' : '') + '>' + U.esc(U.markLabel(m)) + '</button>';
              }).join('') + '</div></div>';
          }).join('') + '</div></div>' +

        '<div>' +
          '<div class="card"><div class="card__h"><h3>' + T('Lesson plan') + '</h3></div><div class="card__b">' +
            '<div class="tiny muted" style="font-weight:600">' + T('TOPIC') + '</div><p style="margin:3px 0 14px">' + U.esc(l.topic || '—') + '</p>' +
            '<div class="tiny muted" style="font-weight:600">' + T('HOMEWORK') + '</div><p style="margin:3px 0 14px">' + U.esc(l.homework || T('None set')) + '</p>' +
            '<div class="tiny muted" style="font-weight:600">' + T('PRIVATE NOTES') + '</div><p style="margin:3px 0 0" class="muted">' + U.esc(l.notes || '—') + '</p>' +
          '</div></div>' +
          '<div class="card mt"><div class="card__h"><h3>' + T('Handed in') + '</h3><span class="sp"></span>' +
            '<span class="tag">' + subs.length + '</span></div><div class="list">' +
            (subs.length ? subs.map(function (s) {
              var st = S.user(s.studentId);
              return '<div class="row row--link" data-act="gradeSub" data-id="' + s.id + '">' + U.avatar(st, 'av--sm') +
                '<div class="row__m"><b>' + U.esc(st.name) + '</b><small>' + U.fmt.date(s.submittedAt) + '</small></div>' +
                (s.grade == null ? '<span class="tag tag--amber">' + T('Ungraded') + '</span>'
                                 : '<span class="tag tag--green num">' + s.grade + '</span>') + '</div>';
            }).join('') : U.empty('inbox', T('Nothing handed in yet'))) +
          '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt"><div class="card__h"><h3>' + T('Vocabulary') + '</h3>' +
        U.gloss('生词 · ' + l.words.length) + '<span class="sp"></span>' +
        '<button class="btn btn--sm" data-act="addWord" data-id="' + l.id + '">' + U.icon('plus') + T('Add word') + '</button></div>' +
        '<div class="card__b">' + (l.words.length ? '<div class="vocab">' + l.words.map(function (w, i) {
          return '<div class="word">' +
            '<button class="word__say" data-act="say" data-text="' + U.esc(w.hz) + '" title="' + T('Say it') + '">' + U.icon('speaker') + '</button>' +
            '<div class="word__hz">' + U.esc(w.hz) + '</div>' +
            '<div class="word__py">' + U.esc(w.py) + '</div>' +
            '<div class="word__en">' + U.esc(w.en) + '</div>' +
            '<button class="btn btn--ghost btn--sm" data-act="delWord" data-id="' + l.id + '" data-i="' + i + '" ' +
              'style="margin-top:8px;padding:2px 6px">' + U.icon('trash') + '</button>' +
          '</div>';
        }).join('') + '</div>' : U.empty('book', T('No words yet'), T('Add the vocabulary for this lesson.'))) +
      '</div></div>';
  }

  /* ══ HOMEWORK ════════════════════════════════════════ */
  function homework() {
    var t = me();
    var classIds = S.classesOfTeacher(t.id).map(function (c) { return c.id; });
    var subs = S.data.submissions.filter(function (s) {
      var l = S.lesson(s.lessonId);
      return l && classIds.indexOf(l.classId) > -1;
    }).sort(function (a, b) { return b.submittedAt.localeCompare(a.submittedAt); });

    var f = App.filters.hwScope || 'ungraded';
    var list = subs.filter(function (s) {
      return f === 'all' || (f === 'ungraded' ? s.grade == null : s.grade != null);
    });
    var avg = subs.filter(function (s) { return s.grade != null; });
    var avgV = avg.length ? Math.round(avg.reduce(function (a, s) { return a + s.grade; }, 0) / avg.length) : 0;

    return '<div class="grid g3">' +
        stat('inbox', T('Handed in'), subs.length, T('all time')) +
        stat('clock', T('Waiting to grade'), subs.filter(function (s) { return s.grade == null; }).length, '') +
        stat('chart', T('Average grade'), avgV + '<small>/100</small>', T('{n} graded', { n: avg.length })) +
      '</div>' +
      '<div class="sect mt"><div class="roleTabs" style="margin:0;max-width:360px;flex:1">' +
        [['ungraded', T('Ungraded')], ['graded', T('Graded')], ['all', T('All')]].map(function (k) {
          return '<button data-act="setHw" data-v="' + k[0] + '" class="' + (f === k[0] ? 'on' : '') + '">' + k[1] + '</button>';
        }).join('') + '</div></div>' +
      '<div class="card"><div class="tw"><table>' +
        '<thead><tr><th>' + T('Student') + '</th><th>' + T('Lesson') + '</th><th>' + T('Handed in') + '</th><th>' +
          T('Grade') + '</th><th></th></tr></thead><tbody>' +
        (list.length ? list.map(function (s) {
          var st = S.user(s.studentId), l = S.lesson(s.lessonId);
          return '<tr><td><div style="display:flex;align-items:center;gap:9px">' + U.avatar(st, 'av--sm') +
              '<div><b>' + U.esc(st.name) + '</b><div class="tiny muted">' + U.esc(S.klass(l.classId).name) + '</div></div></div></td>' +
            '<td>' + U.esc(l.title) + '<div class="tiny muted cn">' + U.esc(l.cn) + '</div></td>' +
            '<td class="num">' + U.fmt.date(s.submittedAt) + '</td>' +
            '<td>' + (s.grade == null ? '<span class="tag tag--amber">' + T('Ungraded') + '</span>'
                                      : '<span class="tag tag--green num">' + s.grade + ' / 100</span>') + '</td>' +
            '<td style="text-align:right"><button class="btn btn--sm" data-act="gradeSub" data-id="' + s.id + '">' +
              (s.grade == null ? T('Grade') : T('Review')) + '</button></td></tr>';
        }).join('') : '<tr><td colspan="5">' + U.empty('inbox', T('Nothing here')) + '</td></tr>') +
      '</tbody></table></div></div>';
  }

  /* ══ STUDENTS ════════════════════════════════════════ */
  /* Graduates never leave this list — they move to their own tab, where the
     whole record stays open: attendance, marks, tuition and all. */
  function students() {
    var t = me();
    var classes = S.classesOfTeacher(t.id);
    var seen = {}, all = [];
    classes.forEach(function (c) {
      c.studentIds.forEach(function (sid) {
        if (seen[sid]) { seen[sid].classes.push(c); return; }
        seen[sid] = { student: S.user(sid), classes: [c] };
        all.push(seen[sid]);
      });
    });

    var f = App.filters.studentScope || 'active';
    var rows = all.filter(function (r) {
      if (f === 'active') return !S.isGraduated(r.student);
      if (f === 'graduated') return S.isGraduated(r.student);
      return true;
    });
    var nGrad = all.filter(function (r) { return S.isGraduated(r.student); }).length;

    return '<div class="sect">' +
        '<div class="roleTabs" style="margin:0;max-width:400px;flex:1">' +
          [['active', T('Studying'), all.length - nGrad],
           ['graduated', T('Graduated'), nGrad],
           ['all', T('All'), all.length]].map(function (k) {
            return '<button data-act="setStudentScope" data-v="' + k[0] + '" class="' + (f === k[0] ? 'on' : '') + '">' +
              k[1] + ' <span class="num">' + k[2] + '</span></button>';
          }).join('') +
        '</div><span class="sp"></span>' +
        '<button class="btn" data-act="newTeacher">' + U.icon('users') + T('Add a teacher') + '</button>' +
        '<button class="btn btn--pri" data-act="newStudent">' + U.icon('plus') + T('New student') + '</button>' +
      '</div>' +
      '<div class="card"><div class="card__h"><h3>' + T('My students') + '</h3>' +
        U.gloss('学生') + '<span class="sp"></span>' +
        '<span class="tag">' + rows.length + '</span></div>' +
      (rows.length ? '<div class="tw"><table><thead><tr>' +
        '<th>' + T('Student') + '</th><th>' + T('Classes') + '</th><th>' + T('Attendance') + '</th><th>' +
        T('Homework avg') + '</th><th>' + T('Skills') + '</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        var rate = S.attendanceRate(S.attendanceOfStudent(r.student.id));
        var mine = S.data.submissions.filter(function (s) { return s.studentId === r.student.id && s.grade != null; });
        var avg = mine.length ? Math.round(mine.reduce(function (a, s) { return a + s.grade; }, 0) / mine.length) : null;
        var pg = S.progressOf(r.classes[0].id, r.student.id);
        var skill = pg ? Math.round((pg.speaking + pg.listening + pg.reading + pg.writing) / 4) : null;
        var grad = S.isGraduated(r.student);
        return '<tr' + (grad ? ' style="opacity:.68"' : '') + '>' +
          '<td><div style="display:flex;align-items:center;gap:10px">' + U.avatar(r.student) +
            '<div><b>' + U.esc(r.student.name) + gradTag(r.student) + '</b>' +
            '<div class="tiny muted cn">' + U.esc(r.student.cn) +
              (grad && r.student.graduatedAt
                ? ' <span class="muted">· ' + T('finished {date}', { date: U.fmt.date(r.student.graduatedAt) }) + '</span>'
                : '') + '</div></div></div></td>' +
          '<td class="tiny">' + r.classes.map(function (c) { return U.esc(c.name); }).join('<br>') + '</td>' +
          '<td style="min-width:130px">' + (rate == null ? '<span class="muted">—</span>' :
            '<div class="tiny num" style="margin-bottom:4px">' + rate + '%</div>' +
            U.bar(rate, rate >= 85 ? 'var(--jade)' : rate >= 70 ? 'var(--amber)' : 'var(--red)')) + '</td>' +
          '<td class="num">' + (avg == null ? '<span class="muted">—</span>' : avg) + '</td>' +
          '<td class="num">' + (skill == null ? '<span class="muted">—</span>' : skill) + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button class="btn btn--sm" data-act="' + (grad ? 'reactivateStudent' : 'graduateStudent') + '" data-id="' + r.student.id + '">' +
              U.icon(grad ? 'shuffle' : 'grad', 14) + (grad ? T('Bring back') : T('Graduate')) + '</button> ' +
            '<button class="btn btn--sm" data-act="studentCard" data-id="' + r.student.id +
            '" data-class="' + r.classes[0].id + '">' + T('Open') + '</button></td></tr>';
      }).join('') +
      '</tbody></table></div>'
      : U.empty('users', f === 'graduated' ? T('Nobody has graduated yet') : T('No students yet'),
          f === 'graduated' ? T('Finished students are kept here with their whole record.')
                            : T('Create a class and enrol students in it.'))) +
      '</div>';
  }

  /* ══ NEWS ════════════════════════════════════════════ */
  /* The school noticeboard. Whatever is published here is what a visitor reads
     on the sign-in page before they have an account, and what every student
     sees once they are in — so publishing is the deliberate step, and a draft
     stays private until the teacher says otherwise. */
  function news() {
    var all = S.news();
    var f = App.filters.newsScope || 'all';
    var list = all.filter(function (n) {
      if (f === 'published') return n.published;
      if (f === 'drafts') return !n.published;
      return true;
    });
    var nPub = all.filter(function (n) { return n.published; }).length;

    return '<div class="sect">' +
        '<div class="roleTabs" style="margin:0;max-width:400px;flex:1">' +
          [['all', T('All'), all.length],
           ['published', T('Published'), nPub],
           ['drafts', T('Drafts'), all.length - nPub]].map(function (k) {
            return '<button data-act="setNewsScope" data-v="' + k[0] + '" class="' + (f === k[0] ? 'on' : '') + '">' +
              k[1] + ' <span class="num">' + k[2] + '</span></button>';
          }).join('') +
        '</div><span class="sp"></span>' +
        '<button class="btn btn--pri" data-act="newNews">' + U.icon('plus') + T('Write a notice') + '</button>' +
      '</div>' +

      '<p class="muted tiny" style="margin:-6px 0 14px">' +
        T('Published notices appear on the sign-in page and on every student dashboard.') + '</p>' +

      (list.length ? '<div class="grid g2">' + list.map(function (n) {
        var author = S.user(n.authorId);
        return '<div class="card"><div class="card__b">' +
          '<div style="display:flex;gap:8px;margin-bottom:9px;flex-wrap:wrap;align-items:center">' +
            (n.pinned ? '<span class="tag tag--gold">' + U.icon('pin', 12) + T('Pinned') + '</span>' : '') +
            (n.published
              ? '<span class="tag tag--green">' + T('Published') + '</span>'
              : '<span class="tag tag--slate">' + T('Draft') + '</span>') +
            '<span class="sp"></span>' +
            '<span class="tiny muted">' + U.fmt.date(n.date) + '</span></div>' +
          '<h3 style="font-size:17px">' + U.esc(n.title) + '</h3>' +
          (n.cn ? '<div class="cn muted">' + U.esc(n.cn) + '</div>' : '') +
          '<p class="muted" style="margin:9px 0 0;white-space:pre-wrap">' + U.esc(n.body) + '</p>' +
          '<div class="tiny muted" style="margin-top:10px">' +
            (author ? T('by {name}', { name: U.esc(author.name) }) : '') + '</div>' +
          '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">' +
            '<button class="btn btn--sm" data-act="toggleNewsPublish" data-id="' + n.id + '">' +
              U.icon(n.published ? 'x' : 'check', 14) + (n.published ? T('Unpublish') : T('Publish')) + '</button>' +
            '<button class="btn btn--sm" data-act="toggleNewsPin" data-id="' + n.id + '">' +
              U.icon('pin', 14) + (n.pinned ? T('Unpin') : T('Pin to top')) + '</button>' +
            '<span class="sp"></span>' +
            '<button class="btn btn--ghost btn--sm" data-act="editNews" data-id="' + n.id + '">' + U.icon('pencil') + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-act="deleteNews" data-id="' + n.id + '">' + U.icon('trash') + '</button>' +
          '</div>' +
        '</div></div>';
      }).join('') + '</div>'
      : '<div class="card">' + U.empty('megaphone',
          f === 'drafts' ? T('No drafts') : T('Nothing on the noticeboard yet'),
          T('Write a notice and publish it — visitors see it before they even sign in.')) + '</div>');
  }

  /* ══ PAYMENTS ════════════════════════════════════════ */
  /* Tuition is billed per student per calendar month. An invoice either carries
     a paid date or it is still waiting — overdue once its due date has passed.
     Nothing here talks to a payment provider: the teacher records what the
     school actually received. */
  function methodOptions(selected) {
    return S.METHODS.map(function (m) {
      return '<option value="' + U.esc(m) + '"' + (m === selected ? ' selected' : '') + '>' + T(m) + '</option>';
    }).join('');
  }
  function payTag(p) {
    var st = S.payStatus(p);
    if (st === 'paid') return '<span class="tag tag--green">' + T('Paid') + '</span>';
    if (st === 'overdue') return '<span class="tag tag--red">' + T('Overdue') + '</span>';
    if (st === 'partial') return '<span class="tag tag--gold">' + T('Part paid') + '</span>';
    return '<span class="tag tag--amber">' + T('Waiting') + '</span>';
  }
  function periodOptions(list, selected) {
    return list.map(function (p) {
      return '<option value="' + p + '"' + (p === selected ? ' selected' : '') + '>' + U.esc(U.fmt.month(p)) + '</option>';
    }).join('');
  }
  /* every enrolment the teacher owns, as one flat "student · class" list */
  function enrolments(teacherId) {
    var out = [];
    S.classesOfTeacher(teacherId).forEach(function (c) {
      S.rosterOf(c.id).forEach(function (sid) { out.push({ klass: c, student: S.user(sid) }); });
    });
    return out;
  }
  /* the month on screen — falls back to the newest one that has invoices */
  function payPeriod() {
    var periods = S.periodsOfTeacher(App.session.userId);
    var p = App.filters.payPeriod;
    return (p === 'all' || periods.indexOf(p) > -1) ? p : (periods[0] || S.thisMonth());
  }

  function payments() {
    var t = me();
    var classes = S.classesOfTeacher(t.id);
    var periods = S.periodsOfTeacher(t.id);
    var period = payPeriod();
    var billTarget = period === 'all' ? S.thisMonth() : period;

    var scoped = S.invoicesOfTeacher(t.id, period === 'all' ? null : period);
    var tot = S.totals(scoped);
    var unpaid = scoped.filter(function (p) { return !p.paidAt; }).length;
    var rate = tot.billed ? Math.round(tot.collected / tot.billed * 100) : 0;

    var f = App.filters.payScope || 'outstanding';
    var list = scoped.filter(function (p) {
      return f === 'all' || (f === 'outstanding' ? !p.paidAt : !!p.paidAt);
    });

    var expected = classes.reduce(function (a, c) {
      return a + (c.fee == null ? S.DEFAULT_FEE : c.fee) * S.rosterOf(c.id).length;
    }, 0);

    return '<div class="grid g3">' +
        stat('wallet', T('Collected'), U.esc(U.fmt.money(tot.collected)),
          T('{n}% of {total} billed', { n: rate, total: U.fmt.money(tot.billed) }) +
            (tot.advance ? ' · ' + T('{money} in advances', { money: U.fmt.money(tot.advance) }) : '')) +
        stat('clock', T('Outstanding'), U.esc(U.fmt.money(tot.outstanding)),
          T('{n} invoices unpaid', { n: unpaid })) +
        stat('alert', T('Overdue'), U.esc(U.fmt.money(tot.overdue)),
          T('{n} past the due date', { n: tot.overdueCount })) +
      '</div>' +

      '<div class="sect mt" style="flex-wrap:wrap">' +
        '<select class="sel" data-act="setPayPeriod" aria-label="' + T('Period') + '">' +
          periodOptions(periods, period) +
          '<option value="all"' + (period === 'all' ? ' selected' : '') + '>' + T('All months') + '</option>' +
        '</select>' +
        '<div class="roleTabs" style="margin:0;max-width:330px;flex:1">' +
          [['outstanding', T('Outstanding')], ['paid', T('Paid')], ['all', T('All')]].map(function (k) {
            return '<button data-act="setPayScope" data-v="' + k[0] + '" class="' + (f === k[0] ? 'on' : '') + '">' + k[1] + '</button>';
          }).join('') +
        '</div>' +
        '<span class="sp"></span>' +
        '<button class="btn btn--sm" data-act="billMonth" data-v="' + billTarget + '">' +
          U.icon('receipt') + T('Bill {month}', { month: U.fmt.month(billTarget) }) + '</button>' +
        '<button class="btn btn--pri btn--sm" data-act="newInvoice">' + U.icon('plus') + T('Record a payment') + '</button>' +
      '</div>' +

      '<div class="card"><div class="tw"><table><thead><tr>' +
          '<th>' + T('Student') + '</th><th>' + T('Period') + '</th><th class="num">' + T('Amount') + '</th>' +
          '<th>' + T('Due date') + '</th><th>' + T('Paid on') + '</th><th class="num">' + T('Advance') + '</th>' +
          '<th>' + T('Status') + '</th><th></th>' +
        '</tr></thead><tbody>' +
        (list.length ? list.map(function (p) {
          var st = S.user(p.studentId), c = S.klass(p.classId);
          return '<tr><td><div style="display:flex;align-items:center;gap:9px">' + U.avatar(st, 'av--sm') +
              '<div><b>' + U.esc(st ? st.name : '—') + '</b>' +
              '<div class="tiny muted">' + U.esc(c ? c.name : '—') + '</div></div></div></td>' +
            '<td>' + U.esc(U.fmt.month(p.period)) + '</td>' +
            '<td class="num">' + U.esc(U.fmt.money(p.amount)) + '</td>' +
            '<td class="num">' + U.fmt.date(p.dueDate) +
              (p.paidAt ? '' : '<div class="tiny muted">' + U.fmt.rel(p.dueDate) + '</div>') + '</td>' +
            '<td class="num">' + (p.paidAt
              ? U.fmt.date(p.paidAt) + '<div class="tiny muted">' + T(p.method || 'Cash') + '</div>'
              : '<span class="muted">—</span>') + '</td>' +
            '<td class="num">' + (p.paidAt || !p.advance
              ? '<span class="muted">—</span>'
              : '<b>' + U.esc(U.fmt.money(p.advance)) + '</b>' +
                '<div class="tiny muted">' + T('{money} left', { money: U.fmt.money(S.balanceOf(p)) }) + '</div>') + '</td>' +
            '<td>' + payTag(p) + '</td>' +
            '<td style="text-align:right;white-space:nowrap">' +
              (p.paidAt
                ? '<button class="btn btn--ghost btn--sm" data-act="unpayInvoice" data-id="' + p.id +
                    '" title="' + T('Mark unpaid') + '">' + U.icon('back') + '</button>'
                : '<button class="btn btn--sm" data-act="payInvoice" data-id="' + p.id + '">' +
                    U.icon('check') + (p.advance ? T('Record payment') : T('Mark paid')) + '</button>') +
              '<button class="btn btn--ghost btn--sm" data-act="editInvoice" data-id="' + p.id +
                '" title="' + T('Edit invoice') + '">' + U.icon('pencil') + '</button>' +
              '<button class="btn btn--ghost btn--sm" data-act="delInvoice" data-id="' + p.id +
                '" title="' + T('Delete') + '">' + U.icon('trash') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="8">' + U.empty('wallet', T('Nothing here'),
            T('Bill the month to raise an invoice for every enrolled student.')) + '</td></tr>') +
      '</tbody></table></div></div>' +

      '<div class="sect mt"><h3>' + T('Tuition per class') + '</h3>' + U.gloss('学费') + '<span class="sp"></span>' +
        '<span class="tag tag--gold">' + T('{money} a month if everyone pays', { money: U.fmt.money(expected) }) + '</span></div>' +
      '<div class="card"><div class="list">' +
        (classes.length ? classes.map(function (c) {
          var fee = c.fee == null ? S.DEFAULT_FEE : c.fee;
          var owed = S.totals(S.invoicesOfClass(c.id, period === 'all' ? null : period));
          return '<div class="row">' +
            '<span class="row__m"><b>' + U.esc(c.name) + '</b>' +
              '<small class="cn">' + U.esc(c.cn) + ' · ' + T('{n} students', { n: S.rosterOf(c.id).length }) + '</small></span>' +
            '<span class="num" style="text-align:right;min-width:120px">' +
              '<b>' + U.esc(U.fmt.money(fee)) + '</b>' +
              '<div class="tiny muted">' + T('per student, per month') + '</div></span>' +
            '<span class="tag ' + (owed.outstanding ? 'tag--amber' : 'tag--green') + '">' +
              (owed.outstanding ? T('{money} outstanding', { money: U.fmt.money(owed.outstanding) }) : T('All settled')) + '</span>' +
            '<button class="btn btn--ghost btn--sm" data-act="editFee" data-id="' + c.id +
              '" title="' + T('Monthly fee') + '">' + U.icon('pencil') + '</button></div>';
        }).join('') : U.empty('layers', T('No classes yet'), T('Create a class before billing tuition.'))) +
      '</div></div>';
  }

  /* ══ ACTIONS ═════════════════════════════════════════ */
  A.openLesson = function (e) { App.go('#/t/lesson/' + e.getAttribute('data-id')); };
  A.openClass = function (e) { App.go('#/t/class/' + e.getAttribute('data-id')); };
  A.goLive = function (e) { App.go('#/t/live/' + e.getAttribute('data-id')); };
  A.setScope = function (e) { App.filters.lessonScope = e.getAttribute('data-v'); App.render(); };
  A.setHw = function (e) { App.filters.hwScope = e.getAttribute('data-v'); App.render(); };
  A.say = function (e) { U.speak(e.getAttribute('data-text')); };

  /* ── classes ── */
  /* ── the room picker ──
     A class picks from the rooms the school already has, so the same room is
     not spelled three ways. The box underneath is the way to add one that is
     not on the list yet; whatever is typed there wins and joins the list. */
  function roomField(current) {
    var rooms = S.rooms();
    var known = rooms.filter(function (r) { return r === current; }).length > 0;
    return '<label class="field"><span>' + T('Room') + '</span>' +
        '<select name="room">' +
          '<option value="">' + T('No room set') + '</option>' +
          (current && !known
            ? '<option value="' + U.esc(current) + '" selected>' + U.esc(current) + '</option>'
            : '') +
          rooms.map(function (r) {
            return '<option value="' + U.esc(r) + '"' + (r === current ? ' selected' : '') + '>' +
              U.esc(r) + '</option>';
          }).join('') +
        '</select></label>' +
      '<label class="field"><span>' + T('or a new room') + '</span>' +
        '<input name="roomNew" placeholder="' + T('e.g. Room 204') + '"></label>';
  }

  /* what the two fields add up to */
  function pickedRoom() {
    var typed = U.Modal.val('roomNew');
    if (typed) return S.addRoom(typed);
    return U.Modal.val('room');
  }

  /* Double-booking a room is a real mistake, but it is the school's call —
     this says so and saves anyway rather than blocking the form. */
  function warnClash(room, days, time, exceptId) {
    var hit = S.roomClashes(room, days, time, exceptId)[0];
    if (hit) {
      U.toast(T('{room} is already booked for {klass} at that time',
        { room: room, klass: hit.name }), 'alert');
    }
  }

  A.newClass = function () {
    var t = me();
    U.Modal.open({
      title: T('New class'), cn: '新建班级',
      body: '<label class="field"><span>' + T('Class name') + '</span>' +
              '<input name="name" placeholder="' + T('e.g. HSK 4 · Upper intermediate') + '"></label>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Chinese name') + '</span><input name="cn" placeholder="中级四班"></label>' +
              '<label class="field"><span>' + T('Level') + '</span><select name="level">' + levelOptions('HSK 4') + '</select></label>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              roomField('') +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Time') + '</span><input type="time" name="time" value="18:00"></label>' +
              '<label class="field"><span>' + T('Monthly fee') + '</span>' +
                '<input type="number" name="fee" min="0" step="1000" value="' + S.DEFAULT_FEE + '"></label>' +
            '</div>' +
            '<div class="field"><span>' + T('Days of the week') + '</span>' +
              '<div class="chips">' + S.WEEKDAYS.map(function (d) {
                return '<label class="chip"><input type="checkbox" name="day" value="' + d + '"><span>' + T(d) + '</span></label>';
              }).join('') + '</div></div>' +
            '<div class="field"><span>' + T('Enrol students now') + '</span>' +
              '<div class="picklist">' + S.activeStudents().map(function (s) {
                return '<label class="pick"><input type="checkbox" name="enrol" value="' + s.id + '">' +
                  U.avatar(s, 'av--sm') + '<span><b>' + U.esc(s.name) + '</b>' +
                  '<small class="cn">' + U.esc(s.cn) + '</small></span></label>';
              }).join('') + '</div></div>',
      okText: T('Create class'),
      onOk: function () {
        var name = U.Modal.val('name');
        if (!name) { U.toast(T('The class needs a name'), 'alert'); return; }
        var days = checked('day').join(' · ');
        var room = pickedRoom();
        var time = U.Modal.val('time') || '18:00';
        warnClash(room, days, time, null);
        var c = S.addClass({
          name: name, cn: U.Modal.val('cn'), level: U.Modal.val('level'),
          room: room, time: time,
          fee: U.Modal.val('fee') === '' ? S.DEFAULT_FEE : +U.Modal.val('fee'),
          days: days, teacherId: t.id, studentIds: checked('enrol')
        });
        U.Modal.close();
        App.go('#/t/class/' + c.id);
        U.toast(T('Class created'));
      }
    });
  };

  A.editClass = function (e) {
    var c = S.klass(e.getAttribute('data-id'));
    U.Modal.open({
      title: T('Edit class'), cn: '编辑班级',
      body: '<label class="field"><span>' + T('Class name') + '</span><input name="name" value="' + U.esc(c.name) + '"></label>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Chinese name') + '</span><input name="cn" value="' + U.esc(c.cn) + '"></label>' +
              '<label class="field"><span>' + T('Level') + '</span><select name="level">' + levelOptions(c.level) + '</select></label></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              roomField(c.room) + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Time') + '</span><input type="time" name="time" value="' + U.esc(c.time) + '"></label>' +
              '<label class="field"><span>' + T('Monthly fee') + '</span><input type="number" name="fee" min="0" step="1000" value="' +
                (c.fee == null ? S.DEFAULT_FEE : c.fee) + '"></label></div>' +
            '<div class="field"><span>' + T('Days of the week') + '</span><div class="chips">' +
              S.WEEKDAYS.map(function (d) {
                return '<label class="chip"><input type="checkbox" name="day" value="' + d + '"' +
                  (c.days.indexOf(d) > -1 ? ' checked' : '') + '><span>' + T(d) + '</span></label>';
              }).join('') + '</div></div>',
      okText: T('Save'),
      onOk: function () {
        var room = pickedRoom();
        var time = U.Modal.val('time');
        var days = checked('day').join(' · ');
        warnClash(room, days, time, c.id);
        S.updateClass(c.id, {
          name: U.Modal.val('name') || c.name, cn: U.Modal.val('cn'), level: U.Modal.val('level'),
          room: room, time: time, days: days,
          fee: U.Modal.val('fee') === '' ? null : +U.Modal.val('fee')
        });
        U.Modal.close(); App.render(); U.toast(T('Class saved'));
      }
    });
  };

  A.deleteClass = function (e) {
    var c = S.klass(e.getAttribute('data-id'));
    var n = S.lessonsOfClass(c.id).length;
    U.Modal.open({
      title: T('Delete class'),
      body: '<p style="margin:0">' + T('Delete {name}? Its {n} lessons, registers and grades go with it.',
        { name: '<b>' + U.esc(c.name) + '</b>', n: n }) + '</p>',
      okText: T('Delete'),
      onOk: function () {
        S.deleteClass(c.id);
        U.Modal.close(); App.go('#/t/classes'); U.toast(T('Class deleted'), 'trash');
      }
    });
  };

  A.enrolStudents = function (e) {
    var c = S.klass(e.getAttribute('data-id'));
    var free = S.activeStudents().filter(function (s) { return c.studentIds.indexOf(s.id) < 0; });
    U.Modal.open({
      title: T('Enrol students'), cn: '添加学生', wide: true,
      body: '<div class="field"><span>' + T('Existing students') + '</span>' +
              (free.length ? '<div class="picklist">' + free.map(function (s) {
                return '<label class="pick"><input type="checkbox" name="enrol" value="' + s.id + '">' +
                  U.avatar(s, 'av--sm') + '<span><b>' + U.esc(s.name) + '</b>' +
                  '<small class="cn">' + U.esc(s.cn) + '</small></span></label>';
              }).join('') + '</div>'
              : '<p class="tiny muted" style="margin:0">' + T('Everybody is already in this class.') + '</p>') +
            '</div>' +
            '<div class="toolSep"></div>' +
            '<div class="tiny muted" style="font-weight:600;margin-bottom:8px">' + T('OR CREATE A NEW ONE') + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Name') + '</span><input name="newName" placeholder="' + T('Full name') + '"></label>' +
              '<label class="field"><span>' + T('Chinese name') + '</span><input name="newCn" placeholder="中文名"></label></div>' +
            '<label class="field"><span>' + T('Email') + '</span><input name="newEmail" placeholder="name@student.mn"></label>',
      okText: T('Enrol'),
      onOk: function () {
        var added = 0;
        checked('enrol').forEach(function (id) { S.enroll(c.id, id); added++; });
        var nm = U.Modal.val('newName');
        if (nm) {
          var u = S.addStudent({ name: nm, cn: U.Modal.val('newCn'), email: U.Modal.val('newEmail') });
          S.enroll(c.id, u.id);
          added++;
        }
        if (!added) { U.toast(T('Nobody selected'), 'alert'); return; }
        U.Modal.close(); App.render(); U.toast(T('{n} students enrolled', { n: added }));
      }
    });
  };

  A.unenrol = function (e) {
    var cid = e.getAttribute('data-id'), sid = e.getAttribute('data-student');
    var s = S.user(sid);
    U.Modal.open({
      title: T('Remove from the class'),
      body: '<p style="margin:0">' + T('Take {name} off this roster? Their attendance history stays.',
        { name: '<b>' + U.esc(s.name) + '</b>' }) + '</p>',
      okText: T('Remove'),
      onOk: function () {
        S.unenroll(cid, sid);
        U.Modal.close(); App.render(); U.toast(T('Removed from the class'));
      }
    });
  };

  /* Most students open their own account on the public site. This is the other
     way in, for someone enrolled at the desk — so it has to set a password too,
     or the account it makes could never be signed into. */
  A.newStudent = function () {
    var t = me();
    U.Modal.open({
      title: T('New student'), cn: '新学生',
      body: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Name') + '</span><input name="name" placeholder="' + T('Full name') + '"></label>' +
              '<label class="field"><span>' + T('Chinese name') + '</span><input name="cn" placeholder="中文名"></label></div>' +
            '<label class="field"><span>' + T('Email') + '</span><input name="email" placeholder="name@student.mn"></label>' +
            '<label class="field"><span>' + T('Password') + '</span>' +
              '<input name="password" type="text" autocomplete="off"></label>' +
            '<p class="tiny muted" style="margin:-4px 0 2px">' +
              T('At least 8 characters, with letters and numbers.') + ' ' +
              T('They sign in with this email and password. Ask them to change it.') + '</p>' +
            '<label class="field"><span>' + T('Enrol in class') + '</span><select name="classId">' +
              '<option value="">' + T('None for now') + '</option>' + classOptions('', t.id) + '</select></label>',
      okText: T('Create student'),
      onOk: function () {
        var pw = U.Modal.val('password');
        var r = S.registerStudent({
          name: U.Modal.val('name'), cn: U.Modal.val('cn'), email: U.Modal.val('email'),
          password: pw, confirm: pw
        });
        if (r.error) { U.toast(T(r.error), 'alert'); return; }
        var cid = U.Modal.val('classId');
        if (cid) S.enroll(cid, r.user.id);
        U.Modal.close(); App.render(); U.toast(T('Student created'));
      }
    });
  };

  /* Staff accounts exist only behind this button. A teacher account reads every
     register, grade and invoice in the school, so it is never something a
     stranger can hand themselves on the public site. */
  A.newTeacher = function () {
    U.Modal.open({
      title: T('Add a teacher'), cn: '添加教师',
      body: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Name') + '</span><input name="name" placeholder="' + T('Full name') + '"></label>' +
              '<label class="field"><span>' + T('Chinese name') + '</span><input name="cn" placeholder="中文名"></label></div>' +
            '<label class="field"><span>' + T('Email') + '</span><input name="email" placeholder="name@erachinese.mn"></label>' +
            '<label class="field"><span>' + T('Job title') + '</span>' +
              '<input name="title" placeholder="' + T('Instructor') + '"></label>' +
            '<label class="field"><span>' + T('Password') + '</span>' +
              '<input name="password" type="text" autocomplete="off"></label>' +
            '<p class="tiny muted" style="margin:0">' +
              T('At least 8 characters, with letters and numbers.') + ' ' +
              T('They sign in with this email and password. Ask them to change it.') + '</p>',
      okText: T('Add a teacher'),
      onOk: function () {
        var r = S.addTeacher({
          name: U.Modal.val('name'), cn: U.Modal.val('cn'), email: U.Modal.val('email'),
          title: U.Modal.val('title'), password: U.Modal.val('password')
        });
        if (r.error) { U.toast(T(r.error), 'alert'); return; }
        U.Modal.close(); App.render(); U.toast(T('Teacher account created'), 'users');
      }
    });
  };

  /* ── the noticeboard ── */
  A.setNewsScope = function (e) { App.filters.newsScope = e.getAttribute('data-v'); App.render(); };

  function newsForm(n) {
    n = n || {};
    return '<label class="field"><span>' + T('Headline') + '</span>' +
        '<input name="title" value="' + U.esc(n.title || '') + '" placeholder="' + T('What is happening') + '"></label>' +
      '<div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">' +
        '<label class="field"><span>' + T('Chinese headline') + '</span>' +
          '<input name="cn" value="' + U.esc(n.cn || '') + '" placeholder="中文标题"></label>' +
        '<label class="field"><span>' + T('Date') + '</span>' +
          '<input type="date" name="date" value="' + U.esc(n.date || S.today()) + '"></label></div>' +
      '<label class="field"><span>' + T('Notice') + '</span>' +
        '<textarea name="body" style="min-height:130px" placeholder="' +
          T('The whole notice, as your students should read it.') + '">' + U.esc(n.body || '') + '</textarea></label>' +
      '<label class="chip" style="display:inline-flex;margin-right:8px">' +
        '<input type="checkbox" name="published"' + (n.published ? ' checked' : '') + '>' +
        '<span>' + T('Publish it now') + '</span></label>' +
      '<label class="chip" style="display:inline-flex">' +
        '<input type="checkbox" name="pinned"' + (n.pinned ? ' checked' : '') + '>' +
        '<span>' + T('Pin to the top') + '</span></label>';
  }
  function isChecked(name) {
    var el = document.querySelector('#modal-root [name="' + name + '"]');
    return !!(el && el.checked);
  }

  A.newNews = function () {
    U.Modal.open({
      title: T('Write a notice'), cn: '发布公告', wide: true,
      body: newsForm({ published: true }),
      okText: T('Save notice'),
      onOk: function () {
        var title = U.Modal.val('title');
        if (!title) { U.toast(T('The notice needs a headline'), 'alert'); return; }
        S.addNews({
          title: title, cn: U.Modal.val('cn'), body: U.Modal.val('body'),
          date: U.Modal.val('date') || S.today(),
          published: isChecked('published'), pinned: isChecked('pinned'),
          authorId: App.session.userId
        });
        U.Modal.close(); App.render();
        U.toast(isChecked('published') ? T('Notice published') : T('Notice saved as a draft'), 'megaphone');
      }
    });
  };

  A.editNews = function (e) {
    var n = S.newsItem(e.getAttribute('data-id'));
    if (!n) return;
    U.Modal.open({
      title: T('Edit notice'), cn: '编辑公告', wide: true,
      body: newsForm(n),
      okText: T('Save notice'),
      onOk: function () {
        var title = U.Modal.val('title');
        if (!title) { U.toast(T('The notice needs a headline'), 'alert'); return; }
        S.updateNews(n.id, {
          title: title, cn: U.Modal.val('cn'), body: U.Modal.val('body'),
          date: U.Modal.val('date') || n.date,
          published: isChecked('published'), pinned: isChecked('pinned')
        });
        U.Modal.close(); App.render(); U.toast(T('Notice saved'));
      }
    });
  };

  A.toggleNewsPublish = function (e) {
    var n = S.newsItem(e.getAttribute('data-id'));
    if (!n) return;
    var going = !n.published;
    S.updateNews(n.id, { published: going });
    App.render();
    U.toast(going ? T('Notice published') : T('Notice taken down'), 'megaphone');
  };

  A.toggleNewsPin = function (e) {
    var n = S.newsItem(e.getAttribute('data-id'));
    if (!n) return;
    S.updateNews(n.id, { pinned: !n.pinned });
    App.render();
  };

  A.deleteNews = function (e) {
    var n = S.newsItem(e.getAttribute('data-id'));
    if (!n) return;
    U.Modal.open({
      title: T('Delete notice'),
      body: '<p style="margin:0">' + T('Delete {title}? Anyone reading it now will stop seeing it.',
        { title: '<b>' + U.esc(n.title) + '</b>' }) + '</p>',
      okText: T('Delete'),
      onOk: function () {
        S.deleteNews(n.id);
        U.Modal.close(); App.render(); U.toast(T('Notice deleted'), 'trash');
      }
    });
  };

  /* ── graduation ──
     Finishing a course is not the same as leaving one. The roster entry stays,
     so every register, mark and invoice the student is part of stays reachable;
     what stops is new billing and their place on new registers. */
  A.setStudentScope = function (e) { App.filters.studentScope = e.getAttribute('data-v'); App.render(); };

  A.graduateStudent = function (e) {
    var sid = e.getAttribute('data-id');
    var s = S.user(sid);
    var owed = S.invoicesOfStudent(sid).filter(function (p) { return !p.paidAt; });
    var debt = owed.reduce(function (a, p) { return a + S.balanceOf(p); }, 0);
    U.Modal.open({
      title: T('Graduate {name}', { name: s.name }), cn: '毕业',
      body: '<p style="margin:0 0 12px">' +
          T('{name} stops appearing on new registers and is no longer billed. Their attendance, marks and tuition history stay on file.',
            { name: '<b>' + U.esc(s.name) + '</b>' }) + '</p>' +
        (debt
          ? '<p class="tiny" style="margin:0;color:var(--red)">' +
            T('{money} is still outstanding on {n} invoices — that debt stays on the books.',
              { money: U.fmt.money(debt), n: owed.length }) + '</p>'
          : ''),
      okText: T('Graduate'),
      onOk: function () {
        S.graduate(sid);
        U.Modal.close(); App.render();
        U.toast(T('{name} has graduated', { name: s.name }), 'grad');
      }
    });
  };

  A.reactivateStudent = function (e) {
    var sid = e.getAttribute('data-id');
    var s = S.user(sid);
    S.reactivate(sid);
    App.render();
    U.toast(T('{name} is studying again', { name: s.name }), 'check');
  };

  function checked(name) {
    return [].slice.call(document.querySelectorAll('#modal-root [name="' + name + '"]:checked'))
      .map(function (el) { return el.value; });
  }

  /* ── attendance & lessons ── */
  A.mark = function (e) {
    var lid = e.getAttribute('data-lesson'), sid = e.getAttribute('data-student'), m = e.getAttribute('data-mark');
    var a = S.data.attendance[lid] || (S.data.attendance[lid] = {});
    if (a[sid] === m) { delete a[sid]; } else { a[sid] = m; }
    S.save(); App.render();
  };

  A.markAll = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    var c = S.klass(l.classId);
    var a = S.data.attendance[l.id] || (S.data.attendance[l.id] = {});
    S.registerOf(l).forEach(function (sid) { if (!a[sid]) a[sid] = 'present'; });
    S.save(); App.render(); U.toast(T('Everyone unmarked is now present'));
  };

  A.completeLesson = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    var c = S.klass(l.classId);
    U.Modal.open({
      title: T('Complete lesson'), cn: '结课',
      body: '<label class="field"><span>' + T('What was covered') + '</span>' +
              '<textarea name="topic">' + U.esc(l.topic) + '</textarea></label>' +
            '<label class="field"><span>' + T('Homework') + '</span>' +
              '<textarea name="homework" placeholder="' + T('Leave blank for none') + '">' + U.esc(l.homework) + '</textarea></label>' +
            '<label class="field"><span>' + T('Private notes') + '</span>' +
              '<textarea name="notes" placeholder="' + T('Only you can see this') + '">' + U.esc(l.notes) + '</textarea></label>' +
            '<p class="tiny muted" style="margin:0">' + T('Any student still unmarked will be recorded as absent.') + '</p>',
      okText: T('Complete lesson'),
      onOk: function () {
        l.topic = U.Modal.val('topic');
        l.homework = U.Modal.val('homework');
        l.notes = U.Modal.val('notes');
        var a = S.data.attendance[l.id] || (S.data.attendance[l.id] = {});
        S.registerOf(l).forEach(function (sid) { if (!a[sid]) a[sid] = 'absent'; });
        l.status = 'completed';
        S.save();
        if (global.Live && global.Live.room(l.id)) global.Live.end(l.id);
        U.Modal.close(); App.render();
        U.toast(T('Lesson completed and register closed'));
      }
    });
  };

  A.reopenLesson = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    l.status = 'scheduled'; S.save(); App.render(); U.toast(T('Lesson reopened'));
  };

  A.deleteLesson = function (e) {
    var id = e.getAttribute('data-id');
    var l = S.lesson(id);
    U.Modal.open({
      title: T('Delete lesson'),
      body: '<p style="margin:0">' + T('Delete {title} on {date}? Its register and any handed-in homework go with it.',
        { title: '<b>' + U.esc(l.title) + '</b>', date: U.fmt.dateLong(l.date) }) + '</p>',
      okText: T('Delete'),
      onOk: function () {
        S.data.lessons = S.data.lessons.filter(function (x) { return x.id !== id; });
        S.data.submissions = S.data.submissions.filter(function (x) { return x.lessonId !== id; });
        delete S.data.attendance[id];
        S.save(); U.Modal.close(); App.go('#/t/lessons'); U.toast(T('Lesson deleted'), 'trash');
      }
    });
  };

  A.newLesson = function (e) {
    var t = me();
    var mine = S.classesOfTeacher(t.id);
    if (!mine.length) { U.toast(T('Create a class first'), 'alert'); return; }
    var preset = e.getAttribute('data-class') || mine[0].id;
    U.Modal.open({
      title: T('New lesson'), cn: '新课',
      body: '<label class="field"><span>' + T('Class') + '</span><select name="classId">' + classOptions(preset, t.id) + '</select></label>' +
            '<label class="field"><span>' + T('Vocabulary set') + '</span><select name="deckId">' + deckOptions('d1') + '</select>' +
              '<small>' + T('Its words are copied into the lesson — edit them afterwards.') + '</small></label>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Date') + '</span><input type="date" name="date" value="' + S.today() + '"></label>' +
              '<label class="field"><span>' + T('Time') + '</span><input type="time" name="time" value="18:00"></label>' +
            '</div>' +
            '<label class="field"><span>' + T('Title') + '</span><input name="title" placeholder="' + T('Defaults to the vocabulary set name') + '"></label>' +
            '<label class="field"><span>' + T('Topic') + '</span><textarea name="topic" placeholder="' + T('What the class will cover') + '"></textarea></label>' +
            '<label class="field"><span>' + T('Homework') + '</span><textarea name="homework" placeholder="' + T('Optional') + '"></textarea></label>',
      okText: T('Create lesson'),
      onOk: function () {
        var deck = S.data.decks.filter(function (d) { return d.id === U.Modal.val('deckId'); })[0];
        var date = U.Modal.val('date') || S.today();
        var cid = U.Modal.val('classId');
        var l = {
          id: S.uid('l'), classId: cid, deckId: deck.id,
          title: U.Modal.val('title') || deck.name, cn: deck.cn,
          date: date, time: U.Modal.val('time') || '18:00',
          topic: U.Modal.val('topic') || deck.name,
          homework: U.Modal.val('homework'), notes: '',
          words: deck.words.map(function (w) { return { hz: w[0], py: w[1], en: w[2] }; }),
          online: { provider: 'jitsi', room: 'ERA-' + cid + '-' + Math.random().toString(36).slice(2, 8), url: '' },
          status: 'scheduled'
        };
        S.data.lessons.push(l);
        S.save(); U.Modal.close(); App.go('#/t/lesson/' + l.id); U.toast(T('Lesson created'));
      }
    });
  };

  A.editLesson = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    U.Modal.open({
      title: T('Edit lesson plan'), cn: '课程计划',
      body: '<label class="field"><span>' + T('Title') + '</span><input name="title" value="' + U.esc(l.title) + '"></label>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
              '<label class="field"><span>' + T('Date') + '</span><input type="date" name="date" value="' + U.esc(l.date) + '"></label>' +
              '<label class="field"><span>' + T('Time') + '</span><input type="time" name="time" value="' + U.esc(l.time) + '"></label></div>' +
            '<label class="field"><span>' + T('Topic') + '</span><textarea name="topic">' + U.esc(l.topic) + '</textarea></label>' +
            '<label class="field"><span>' + T('Homework') + '</span><textarea name="homework">' + U.esc(l.homework) + '</textarea></label>' +
            '<label class="field"><span>' + T('Private notes') + '</span><textarea name="notes">' + U.esc(l.notes) + '</textarea></label>',
      okText: T('Save'),
      onOk: function () {
        l.title = U.Modal.val('title') || l.title;
        l.date = U.Modal.val('date') || l.date;
        l.time = U.Modal.val('time') || l.time;
        l.topic = U.Modal.val('topic');
        l.homework = U.Modal.val('homework');
        l.notes = U.Modal.val('notes');
        S.save(); U.Modal.close(); App.render(); U.toast(T('Lesson plan saved'));
      }
    });
  };

  A.addWord = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    U.Modal.open({
      title: T('Add a word'), cn: '添加生词',
      body: '<label class="field"><span>' + T('Characters') + ' 汉字</span><input name="hz" placeholder="学习"></label>' +
            '<label class="field"><span>' + T('Pinyin') + ' 拼音</span><input name="py" placeholder="xuéxí"></label>' +
            '<label class="field"><span>' + T('Meaning') + '</span><input name="en" placeholder="to study"></label>',
      okText: T('Add'),
      onOk: function () {
        var hz = U.Modal.val('hz');
        if (!hz) { U.toast(T('Characters are required'), 'alert'); return; }
        l.words.push({ hz: hz, py: U.Modal.val('py'), en: U.Modal.val('en') });
        S.save(); U.Modal.close(); App.render(); U.toast(T('Word added'));
      }
    });
  };

  A.delWord = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    l.words.splice(+e.getAttribute('data-i'), 1);
    S.save(); App.render();
  };

  A.gradeSub = function (e) {
    var id = e.getAttribute('data-id');
    var sub = S.data.submissions.filter(function (s) { return s.id === id; })[0];
    var st = S.user(sub.studentId), l = S.lesson(sub.lessonId);
    U.Modal.open({
      title: T('Grade homework'), cn: '批改作业', wide: true,
      body: '<div style="display:flex;align-items:center;gap:11px;margin-bottom:16px">' + U.avatar(st) +
              '<div><b>' + U.esc(st.name) + '</b><div class="tiny muted">' + U.esc(l.title) +
              ' · ' + T('handed in {date}', { date: U.fmt.date(sub.submittedAt) }) + '</div></div></div>' +
            '<div class="tiny muted" style="font-weight:600">' + T('ASSIGNMENT') + '</div>' +
            '<p style="margin:3px 0 14px">' + U.esc(l.homework || '—') + '</p>' +
            '<div class="tiny muted" style="font-weight:600">' + T('STUDENT ANSWER') + '</div>' +
            '<p style="margin:3px 0 18px;padding:12px;background:var(--card-2);border:1px solid var(--line);border-radius:10px">' +
              U.esc(sub.text) + '</p>' +
            '<label class="field"><span>' + T('Grade (0–100)') + '</span>' +
              '<input type="number" name="grade" min="0" max="100" value="' + (sub.grade == null ? '' : sub.grade) + '"></label>' +
            '<label class="field"><span>' + T('Feedback') + '</span><textarea name="feedback">' + U.esc(sub.feedback) + '</textarea></label>',
      okText: T('Save grade'),
      onOk: function () {
        var g = U.Modal.val('grade');
        sub.grade = g === '' ? null : Math.max(0, Math.min(100, Math.round(+g)));
        sub.feedback = U.Modal.val('feedback');
        S.save(); U.Modal.close(); App.render(); U.toast(T('Grade saved'));
      }
    });
  };

  A.studentCard = function (e) {
    var sid = e.getAttribute('data-id');
    var cid = e.getAttribute('data-class') || (S.classesOfStudent(sid)[0] || {}).id;
    var st = S.user(sid), c = S.klass(cid);
    if (!c) { U.toast(T('This student is not in a class yet'), 'alert'); return; }
    var rows = S.attendanceOfStudent(sid, cid);
    var rate = S.attendanceRate(rows);
    var pg = S.progressOf(cid, sid) || { speaking: 0, listening: 0, reading: 0, writing: 0 };

    U.Modal.open({
      title: st.name, cn: st.cn, wide: true, cancelText: T('Close'),
      body: '<div class="grid g2" style="gap:20px">' +
          '<div>' +
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">' + U.avatar(st, 'av--lg') +
              '<div><b>' + U.esc(st.name) + gradTag(st) + '</b><div class="tiny muted">' + U.esc(st.email) + '</div>' +
              '<div class="tiny muted">' + U.esc(c.name) +
                (S.isGraduated(st) && st.graduatedAt
                  ? ' · ' + T('finished {date}', { date: U.fmt.date(st.graduatedAt) }) : '') +
              '</div></div></div>' +
            '<div style="text-align:center">' + U.ring(rate == null ? 0 : rate, T('attendance')) + '</div>' +
            '<div class="tiny muted" style="text-align:center">' + T('{n} lessons recorded', { n: rows.length }) + '</div>' +
          '</div>' +
          '<div><div class="tiny muted" style="font-weight:600;margin-bottom:4px">' + T('SKILL ASSESSMENT') + '</div>' +
            U.radar(pg) +
            '<button class="btn btn--pri btn--sm" data-act="assess" data-id="' + sid + '" data-class="' + cid + '" ' +
              'style="width:100%;justify-content:center">' + U.icon('pencil') + T('Update assessment') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="tiny muted" style="font-weight:600;margin:18px 0 6px">' + T('RECENT ATTENDANCE') + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          (rows.length ? rows.slice(-14).map(function (r) {
            return '<span class="tag tag--' + ({ present: 'green', late: 'amber', absent: 'red', excused: 'slate' })[r.status] +
              '" title="' + U.esc(r.lesson.title) + '">' + U.fmt.date(r.lesson.date) + '</span>';
          }).join('') : '<span class="muted tiny">' + T('Nothing recorded yet') + '</span>') +
        '</div>'
    });
  };

  A.assess = function (e) {
    var sid = e.getAttribute('data-id'), cid = e.getAttribute('data-class');
    var st = S.user(sid);
    var pg = S.progressOf(cid, sid);
    if (!pg) {
      pg = { id: S.uid('pg'), classId: cid, studentId: sid, speaking: 50, listening: 50, reading: 50, writing: 50, updated: S.today() };
      S.data.progress.push(pg);
    }
    var LBL = { speaking: 'Speaking', listening: 'Listening', reading: 'Reading', writing: 'Writing' };
    U.Modal.open({
      title: T('Assess {name}', { name: st.name }), cn: '评估',
      body: ['speaking', 'listening', 'reading', 'writing'].map(function (k) {
        return '<label class="field"><span>' + T(LBL[k]) + '</span>' +
          '<input type="number" name="' + k + '" min="0" max="100" value="' + pg[k] + '"></label>';
      }).join(''),
      okText: T('Save assessment'),
      onOk: function () {
        ['speaking', 'listening', 'reading', 'writing'].forEach(function (k) {
          var v = +U.Modal.val(k);
          pg[k] = Math.max(0, Math.min(100, isNaN(v) ? pg[k] : Math.round(v)));
        });
        pg.updated = S.today();
        S.save(); U.Modal.close(); App.render(); U.toast(T('Assessment saved'));
      }
    });
  };

  /* ── tuition ── */
  A.setPayPeriod = function (e) { App.filters.payPeriod = e.value; App.render(); };
  A.setPayScope = function (e) { App.filters.payScope = e.getAttribute('data-v'); App.render(); };

  /* Raise the missing invoices for a month. Students already billed are left
     alone, so pressing it twice is harmless. */
  A.billMonth = function (e) {
    var period = e.getAttribute('data-v');
    var t = me();
    var ids = S.classesOfTeacher(t.id).map(function (c) { return c.id; });
    var due = S.monthDay(period, S.BILL_DAY);
    var pending = 0;
    S.classesOfTeacher(t.id).forEach(function (c) {
      var billed = {};
      S.invoicesOfClass(c.id, period).forEach(function (p) { billed[p.studentId] = 1; });
      S.rosterOf(c.id).forEach(function (sid) { if (!billed[sid]) pending++; });
    });
    if (!pending) { U.toast(T('Everyone is already billed for {month}', { month: U.fmt.month(period) }), 'check'); return; }
    U.Modal.open({
      title: T('Bill {month}', { month: U.fmt.month(period) }), cn: '开具账单',
      body: '<p style="margin:0 0 12px">' +
          T('{n} students have no invoice for {month} yet. Each is billed the fee of their class, due on {date}.',
            { n: pending, month: U.fmt.month(period), date: U.fmt.date(due) }) + '</p>' +
        '<div class="list">' + S.classesOfTeacher(t.id).map(function (c) {
          var billed = S.invoicesOfClass(c.id, period).length;
          return '<div class="row"><span class="row__m"><b>' + U.esc(c.name) + '</b>' +
            '<small>' + T('{n} enrolled', { n: S.rosterOf(c.id).length }) + ' · ' +
            T('{n} already billed', { n: billed }) + '</small></span>' +
            '<span class="tag tag--gold num">' + U.esc(U.fmt.money(c.fee == null ? S.DEFAULT_FEE : c.fee)) + '</span></div>';
        }).join('') + '</div>',
      okText: T('Raise invoices'),
      onOk: function () {
        var made = S.billPeriod(ids, period);
        App.filters.payPeriod = period;
        U.Modal.close(); App.render();
        U.toast(T('{n} invoices raised', { n: made }), 'receipt');
      }
    });
  };

  /* Records what was actually received. Anything short of the balance stays on
     the invoice as an advance (урьдчилгаа); the full balance settles it. */
  A.payInvoice = function (e) {
    var p = S.invoice(e.getAttribute('data-id'));
    if (!p) return;
    var st = S.user(p.studentId);
    var bal = S.balanceOf(p);
    U.Modal.open({
      title: T('Record a payment'), cn: '收款',
      body: '<p class="muted tiny" style="margin:0 0 14px">' +
          T('{name} · {month} · {money}', {
            name: U.esc(st ? st.name : ''), month: U.fmt.month(p.period), money: U.fmt.money(p.amount)
          }) + (p.advance ? ' · ' + T('{money} in advance already', { money: U.fmt.money(p.advance) }) : '') + '</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field"><span>' + T('Paid on') + '</span>' +
            '<input type="date" name="paidAt" value="' + S.today() + '"></label>' +
          '<label class="field"><span>' + T('Amount received') + '</span>' +
            '<input type="number" name="got" min="0" step="1000" value="' + bal + '">' +
            '<small>' + T('Less than {money} is kept as an advance.', { money: U.fmt.money(bal) }) + '</small></label>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field"><span>' + T('Method') + '</span>' +
            '<select name="method">' + methodOptions(p.method || S.METHODS[0]) + '</select></label>' +
          '<label class="field"><span>' + T('Note') + '</span>' +
            '<input name="note" value="' + U.esc(p.note) + '" placeholder="' + T('Receipt number, who paid…') + '"></label>' +
        '</div>',
      okText: T('Record payment'),
      onOk: function () {
        var got = +U.Modal.val('got');
        if (isNaN(got) || got <= 0) { U.toast(T('Enter an amount'), 'alert'); return; }
        var opts = {
          paidAt: U.Modal.val('paidAt') || S.today(),
          method: U.Modal.val('method'),
          note: U.Modal.val('note')
        };
        var settled = got >= bal;
        if (settled) S.setPaid(p.id, opts);
        else S.addPayment(p.id, got, opts);
        U.Modal.close(); App.render();
        U.toast(settled ? T('Payment recorded')
                        : T('Advance recorded — {money} left', { money: U.fmt.money(S.balanceOf(S.invoice(p.id))) }), 'wallet');
      }
    });
  };

  A.unpayInvoice = function (e) {
    S.setUnpaid(e.getAttribute('data-id'));
    App.render();
    U.toast(T('Payment reversed'), 'back');
  };

  /* A one-off invoice: a make-up lesson, a materials fee, a student billed
     outside the monthly run. */
  A.newInvoice = function () {
    var t = me();
    var pairs = enrolments(t.id);
    if (!pairs.length) { U.toast(T('Enrol a student first'), 'alert'); return; }
    var period = payPeriod();
    if (period === 'all') period = S.thisMonth();
    U.Modal.open({
      title: T('New invoice'), cn: '新建账单',
      body: '<label class="field"><span>' + T('Student') + '</span><select name="who" data-act="invoiceWho">' +
          pairs.map(function (x) {
            return '<option value="' + x.klass.id + ':' + x.student.id + '">' +
              U.esc(x.student.name) + ' · ' + U.esc(x.klass.name) + '</option>';
          }).join('') + '</select></label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field"><span>' + T('Period') + '</span>' +
            '<input type="month" name="period" value="' + period + '"></label>' +
          '<label class="field"><span>' + T('Amount') + '</span>' +
            '<input type="number" name="amount" min="0" step="1000" value="' + (pairs[0].klass.fee == null ? S.DEFAULT_FEE : pairs[0].klass.fee) + '"></label>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field"><span>' + T('Due date') + '</span>' +
            '<input type="date" name="dueDate" value="' + S.monthDay(period, S.BILL_DAY) + '"></label>' +
          '<label class="field"><span>' + T('Advance') + '</span>' +
            '<input type="number" name="advance" min="0" step="1000" value="0">' +
            '<small>' + T('Ignored when the invoice is already paid in full.') + '</small></label>' +
        '</div>' +
        '<label class="field"><span>' + T('Method') + '</span>' +
          '<select name="method">' + methodOptions(S.METHODS[0]) + '</select></label>' +
        '<label class="field"><span>' + T('Note') + '</span><input name="note" placeholder="' + T('Receipt number, who paid…') + '"></label>' +
        '<label class="pick" style="margin-top:2px"><input type="checkbox" name="paidNow" checked>' +
          '<span><b>' + T('Paid already') + '</b><small>' + T('Records today as the payment date.') + '</small></span></label>',
      okText: T('Save invoice'),
      onOk: function () {
        var who = U.Modal.val('who').split(':');
        var per = U.Modal.val('period') || period;
        var amount = +U.Modal.val('amount');
        if (isNaN(amount) || amount < 0) { U.toast(T('Enter an amount'), 'alert'); return; }
        var paidNow = !!document.querySelector('#modal-root [name="paidNow"]:checked');
        S.addInvoice({
          classId: who[0], studentId: who[1], period: per, amount: amount,
          dueDate: U.Modal.val('dueDate') || S.monthDay(per, S.BILL_DAY),
          paidAt: paidNow ? S.today() : null,
          advance: paidNow ? 0 : +U.Modal.val('advance'),
          method: paidNow || +U.Modal.val('advance') ? U.Modal.val('method') : '',
          note: U.Modal.val('note')
        });
        App.filters.payPeriod = per;
        U.Modal.close(); App.render();
        U.toast(paidNow ? T('Payment recorded') : T('Invoice saved'), 'wallet');
      }
    });
  };

  /* the amount follows the fee of the class the chosen student sits in */
  A.invoiceWho = function (e) {
    var c = S.klass(String(e.value || '').split(':')[0]);
    var amt = document.querySelector('#modal-root [name="amount"]');
    if (c && amt) amt.value = (c.fee == null ? S.DEFAULT_FEE : c.fee);
  };

  A.editInvoice = function (e) {
    var p = S.invoice(e.getAttribute('data-id'));
    if (!p) return;
    var st = S.user(p.studentId);
    U.Modal.open({
      title: T('Edit invoice'), cn: '编辑账单',
      body: '<p class="muted tiny" style="margin:0 0 14px">' + U.esc(st ? st.name : '') + '</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field"><span>' + T('Period') + '</span>' +
            '<input type="month" name="period" value="' + U.esc(p.period) + '"></label>' +
          '<label class="field"><span>' + T('Amount') + '</span>' +
            '<input type="number" name="amount" min="0" step="1000" value="' + p.amount + '"></label>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
          '<label class="field"><span>' + T('Due date') + '</span>' +
            '<input type="date" name="dueDate" value="' + U.esc(p.dueDate) + '"></label>' +
          '<label class="field"><span>' + T('Advance') + '</span>' +
            '<input type="number" name="advance" min="0" step="1000" value="' + (p.advance || 0) + '"' +
              (p.paidAt ? ' disabled' : '') + '>' +
            '<small>' + (p.paidAt ? T('Settled in full.') : T('Held against the {money} due', { money: U.fmt.money(p.amount) })) + '</small></label>' +
        '</div>' +
        '<label class="field"><span>' + T('Note') + '</span><input name="note" value="' + U.esc(p.note) + '"></label>',
      okText: T('Save'),
      onOk: function () {
        S.updateInvoice(p.id, {
          period: U.Modal.val('period') || p.period,
          amount: U.Modal.val('amount'),
          advance: p.paidAt ? null : U.Modal.val('advance'),
          dueDate: U.Modal.val('dueDate') || p.dueDate,
          note: U.Modal.val('note')
        });
        U.Modal.close(); App.render(); U.toast(T('Invoice saved'));
      }
    });
  };

  A.delInvoice = function (e) {
    var p = S.invoice(e.getAttribute('data-id'));
    if (!p) return;
    var st = S.user(p.studentId);
    U.Modal.open({
      title: T('Delete invoice'),
      body: '<p style="margin:0">' + T('Delete the {month} invoice for {name}?', {
        month: U.fmt.month(p.period), name: '<b>' + U.esc(st ? st.name : '') + '</b>'
      }) + '</p>',
      okText: T('Delete'),
      onOk: function () {
        S.deleteInvoice(p.id);
        U.Modal.close(); App.render(); U.toast(T('Invoice deleted'), 'trash');
      }
    });
  };

  /* The fee is what future invoices are raised at — invoices already on the
     books keep the amount they were billed for. */
  A.editFee = function (e) {
    var c = S.klass(e.getAttribute('data-id'));
    if (!c) return;
    var fee = c.fee == null ? S.DEFAULT_FEE : c.fee;
    U.Modal.open({
      title: T('Monthly fee'), cn: '学费',
      body: '<p class="muted tiny" style="margin:0 0 14px">' + U.esc(c.name) + '</p>' +
        '<label class="field"><span>' + T('Fee per student, per month') + '</span>' +
          '<input type="number" name="fee" min="0" step="1000" value="' + fee + '">' +
          '<small>' + T('Invoices already raised keep their amount.') + '</small></label>',
      okText: T('Save'),
      onOk: function () {
        var v = +U.Modal.val('fee');
        if (isNaN(v) || v < 0) { U.toast(T('Enter an amount'), 'alert'); return; }
        S.updateClass(c.id, { fee: v });
        U.Modal.close(); App.render(); U.toast(T('Fee saved'));
      }
    });
  };

  global.TeacherViews = {
    init: init,
    dashboard: dashboard, classes: classes, classDetail: classDetail,
    lessons: lessons, lessonDetail: lessonDetail, homework: homework, students: students,
    payments: payments, news: news
  };
})(window);
