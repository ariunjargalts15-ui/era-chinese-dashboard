/* ERA Chinese — shell, router, sign-in. */
(function (global) {
  'use strict';

  var SESSION_KEY = 'era-chinese-lite/session';
  var U, S, A;

  var App = {
    session: null,        /* {userId, role} */
    route: [],            /* hash segments after # */
    filters: {},          /* per-page filter state, not persisted */
    flash: null,          /* flashcard practice state */
    authError: null       /* what the last sign-in or registration attempt said */
  };
  global.App = App;

  /* ── navigation model ─────────────────────────────────── */
  var NAV = {
    teacher: [
      { k: 'dashboard', icon: 'home', label: 'Dashboard', cn: '概览' },
      { k: 'classes', icon: 'layers', label: 'My classes', cn: '班级' },
      { k: 'lessons', icon: 'book', label: 'Lessons', cn: '课程' },
      { k: 'homework', icon: 'inbox', label: 'Homework', cn: '作业' },
      { k: 'students', icon: 'users', label: 'Students', cn: '学生' },
      { k: 'payments', icon: 'wallet', label: 'Payments', cn: '学费' },
      { k: 'news', icon: 'megaphone', label: 'News', cn: '公告' }
    ],
    student: [
      { k: 'dashboard', icon: 'home', label: 'Dashboard', cn: '概览' },
      { k: 'lessons', icon: 'calendar', label: 'My timetable', cn: '课表' },
      { k: 'vocab', icon: 'sparkles', label: 'Vocabulary', cn: '生词' },
      { k: 'homework', icon: 'file', label: 'Homework', cn: '作业' },
      { k: 'progress', icon: 'chart', label: 'My progress', cn: '进度' },
      { k: 'tuition', icon: 'wallet', label: 'My tuition', cn: '学费' },
      { k: 'news', icon: 'megaphone', label: 'News', cn: '公告' }
    ]
  };
  var PREFIX = { teacher: 't', student: 's' };

  var DETAIL = {
    lesson: { label: 'Lesson', cn: '课程' },
    'class': { label: 'Class', cn: '班级' },
    live: { label: 'Online classroom', cn: '在线课堂' }
  };

  /* ── session ──────────────────────────────────────────── */
  /* Who is signed in lives in sessionStorage, not localStorage, so each browser
     tab has its own account: the teacher can run the lesson in one tab while a
     student follows it in another, both against the same school. */
  function loadSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return S.user(s.userId) ? s : null;
    } catch (e) { return null; }
  }
  function saveSession() {
    try {
      if (App.session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(App.session));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* ignore */ }
  }

  /* ── routing ──────────────────────────────────────────── */
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    return h ? h.split('/').filter(Boolean) : [];
  }
  App.go = function (hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  };
  function homeHash() { return '#/' + PREFIX[App.session.role] + '/dashboard'; }

  /* ── language picker ──────────────────────────────────── */
  function langPicker(dark) {
    var cur = global.I18n.get();
    return '<div class="lang' + (dark ? ' lang--dark' : '') + '">' + U.icon('globe') +
      '<select data-act="setLang" aria-label="Language">' +
        global.I18n.LANGS.map(function (l) {
          return '<option value="' + l.id + '"' + (l.id === cur ? ' selected' : '') + '>' + l.label + '</option>';
        }).join('') +
      '</select></div>';
  }

  /* ── the public site ──────────────────────────────────
     What someone sees before they have an account: the noticeboard, what the
     school teaches, and the two doors in — sign in, or open a student account.
     Everything here is a header, a page and a footer, so the school reads as a
     site rather than as a bare login prompt. */

  var PUB = [
    { k: 'news', label: 'News', cn: '公告' },
    { k: 'classes', label: 'Courses', cn: '课程' },
    { k: 'contact', label: 'Contact', cn: '联系' }
  ];
  var PUB_PAGES = ['news', 'classes', 'contact', 'login', 'join'];

  function publicPage() {
    /* Opening the app lands on the sign-in screen, the way it always has —
       the brand panel and its clip are the first thing the school shows.
       The rest of the public site hangs off the link underneath it. */
    var page = App.route[0] === 'p' ? (App.route[1] || 'login') : 'login';
    if (PUB_PAGES.indexOf(page) === -1) page = 'login';

    /* Signing in and joining keep the split screen: the brand panel on the
       left, the form on the right. The rest of the public site is a header,
       a page and a footer. */
    if (page === 'login' || page === 'join') return authScreen(page);

    var body = page === 'classes' ? coursesPage()
             : page === 'contact' ? contactPage()
             : newsPage();

    return '<div class="site">' +
        siteHeader(page) +
        '<main class="site__main">' + body + '</main>' +
        siteFooter() +
      '</div>';
  }

  /* ── the split screen ──
     The calligraphy loop runs behind a dark scrim on the left; the right side
     is whichever door was asked for. The heading is the only place the words
     "Sign in" appear on this screen. */
  function authScreen(page) {
    var zh = global.I18n.get() === 'zh';
    var join = page === 'join';
    return '<div class="login">' +
        '<div class="login__brand">' +
          '<video class="login__video" src="brand-loop.mp4" autoplay loop muted playsinline></video>' +
          '<div class="login__logo"><div class="logo logo--lg">' +
            '<b>ERA CHINESE.</b><span>你。让世界更美</span></div></div>' +
          '<div class="login__foot">' +
            (zh ? '<div class="login__pitch"><h1>' + T('Every lesson, register and mark in one place.') + '</h1></div>' : '') +
            '<p class="login__slogan">“Сонирхогч бус Мэргэжлийн”</p>' +
            '<div class="login__facts">' +
              '<div><b>' + S.data.classes.length + '</b><span>' + T('Classes') + '</span></div>' +
              '<div><b>' + S.activeStudents().length + '</b><span>' + T('Students') + '</span></div>' +
              '<div><b>' + S.data.lessons.length + '</b><span>' + T('Lessons') + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="login__pick">' +
          '<div class="login__mark">ERA CHINESE.</div>' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">' +
            '<h2 style="font-size:23px;flex:1">' +
              (join ? T('Create a student account') : T('Sign in')) + '</h2>' +
            langPicker() + '</div>' +
          '<p>' + (join
            ? T('This opens a student account. Teacher and staff accounts are created by the school.')
            : T('Staff and students use the same door — the account decides what opens.')) + '</p>' +

          (App.authError
            ? '<div class="auth__err">' + U.icon('alert', 15) + U.esc(T(App.authError)) + '</div>'
            : '') +

          (join
            ? '<form class="auth__form" data-form="join">' +
                field('name', 'Full name', 'text', 'user', 'name') +
                field('email', 'Email', 'email', 'mail', 'username') +
                field('password', 'Password', 'password', 'lock', 'new-password') +
                field('confirm', 'Repeat password', 'password', 'lock', 'new-password') +
                '<p class="tiny muted" style="margin:-2px 0 2px">' +
                  T('At least 8 characters, with letters and numbers.') + '</p>' +
                '<button class="btn btn--pri btn--wide" type="submit">' + T('Create an account') + '</button>' +
              '</form>'
            : '<form class="auth__form" data-form="login">' +
                field('email', 'Email', 'email', 'mail', 'username') +
                field('password', 'Password', 'password', 'lock', 'current-password') +
                '<button class="btn btn--pri btn--wide" type="submit">' + T('Sign in') + '</button>' +
              '</form>') +

          '<div class="auth__foot">' +
            (join
              ? T('Already have one?') + ' <a href="#/p/login">' + T('Sign in') + '</a>'
              : T('No account yet?') + ' <a href="#/p/join">' + T('Create a student account') + '</a>') +
            /* the noticeboard is a page of its own now, so the way to it has
               to be visible from the door — with its count, as the tab had */
            '<div style="margin-top:10px"><a href="#/p/news">' +
              U.icon('megaphone', 14) + ' ' + T('School news') +
              (S.published().length ? ' · ' + S.published().length : '') + '</a>' +
              '<span class="muted"> · </span>' +
              '<a href="#/p/classes">' + T('Courses') + '</a>' +
              '<span class="muted"> · </span>' +
              '<a href="#/p/contact">' + T('Contact') + '</a></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function siteHeader(page) {
    return '<header class="site__head"><div class="site__bar">' +
        '<a class="site__logo" href="#/p/news">' +
          '<b>ERA CHINESE.</b><span>你。让世界更美</span></a>' +
        '<nav class="site__nav">' +
          PUB.map(function (n) {
            return '<a href="#/p/' + n.k + '" class="' + (page === n.k ? 'on' : '') + '">' +
              T(n.label) + '</a>';
          }).join('') +
        '</nav>' +
        '<div class="site__acts">' +
          langPicker() +
          '<a class="btn btn--ghost" href="#/p/login">' + T('Sign in') + '</a>' +
          '<a class="btn btn--cta" href="#/p/join">' + T('Create an account') + '</a>' +
        '</div>' +
        '<button class="site__burger" data-act="siteMenu">' + U.icon('menu') + '</button>' +
      '</div></header>';
  }

  function siteFooter() {
    var sc = S.data.school;
    function line(label, phone, email) {
      return '<div class="foot__row">' +
        '<span class="foot__lbl">' + T(label) + ':</span>' +
        '<span class="foot__val">' + U.icon('phone', 14) + U.esc(phone) + '</span>' +
        '<a class="foot__mail" href="mailto:' + U.esc(email) + '">' + U.esc(email) + '</a>' +
      '</div>';
    }
    return '<footer class="site__foot">' +
        '<div class="foot__in">' +
          '<div class="foot__contact">' +
            line('Sales', sc.phone, sc.email) +
            line('Support', sc.phone2, sc.support) +
            '<div class="foot__row">' +
              '<span class="foot__lbl">' + T('Address') + ':</span>' +
              '<span class="foot__val">' + U.icon('map', 14) + U.esc(sc.address) + '</span>' +
            '</div>' +
            '<div class="foot__social">' +
              '<a href="' + U.esc(sc.facebook) + '" target="_blank" rel="noopener" aria-label="Facebook">' +
                U.icon('facebook', 17) + '</a>' +
              '<a href="' + U.esc(sc.instagram) + '" target="_blank" rel="noopener" aria-label="Instagram">' +
                U.icon('instagram', 17) + '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="foot__legal">© ' + new Date().getFullYear() + ' ' + U.esc(sc.name) +
          ' · ' + U.esc(sc.cn) + '</div>' +
      '</footer>';
  }

  /* ── noticeboard ── */
  function newsPage() {
    var notices = S.published();
    return '<div class="site__hero">' +
        '<h1>' + T('School news') + '</h1>' +
        '<p>' + T('Notices, intake dates and closures — straight from the school.') + '</p>' +
      '</div>' +
      (notices.length
        ? '<div class="notices">' + notices.map(noticeCard).join('') + '</div>'
        : '<div class="card">' + U.empty('megaphone', T('Nothing on the noticeboard yet'),
            T('School news will show up here.')) + '</div>');
  }

  function noticeCard(n) {
    var author = S.user(n.authorId);
    return '<article class="notice' + (n.pinned ? ' notice--pin' : '') + '">' +
      '<div class="notice__h">' +
        (n.pinned ? '<span class="tag tag--gold">' + U.icon('pin', 12) + T('Pinned') + '</span>' : '') +
        '<span class="sp"></span>' +
        '<span class="tiny muted">' + U.fmt.date(n.date) + '</span></div>' +
      '<b>' + U.esc(n.title) + '</b>' +
      (n.cn ? '<div class="cn muted tiny">' + U.esc(n.cn) + '</div>' : '') +
      '<p>' + U.esc(n.body) + '</p>' +
      (author ? '<div class="tiny muted">' + T('by {name}', { name: U.esc(author.name) }) + '</div>' : '') +
    '</article>';
  }

  /* ── what the school teaches ──
     Real classes out of the store, so a visitor sees the actual timetable. */
  function coursesPage() {
    return '<div class="site__hero">' +
        '<h1>' + T('Courses') + '</h1>' +
        '<p>' + T('Every group running right now, with its level, timetable and monthly fee.') + '</p>' +
      '</div>' +
      '<div class="grid g3">' + S.data.classes.map(function (c) {
        var teacher = S.user(c.teacherId);
        var studying = S.rosterOf(c).filter(function (id) { return !S.isGraduated(id); }).length;
        return '<div class="card course"><div class="card__b">' +
          '<span class="tag tag--slate">' + U.esc(c.level) + '</span>' +
          '<h3 style="margin:10px 0 2px">' + U.esc(c.name) + '</h3>' +
          '<div class="cn muted">' + U.esc(c.cn) + '</div>' +
          '<div class="course__meta">' +
            '<div>' + U.icon('clock', 14) + U.esc(U.daysLabel(c.days) + ' · ' + c.time) + '</div>' +
            (teacher ? '<div>' + U.icon('user', 14) + U.esc(teacher.name) + '</div>' : '') +
            '<div>' + U.icon('users', 14) + T('{n} studying', { n: studying }) + '</div>' +
          '</div>' +
          '<div class="course__fee"><b>' + U.esc(U.fmt.money(c.fee == null ? 0 : c.fee)) + '</b>' +
            '<span class="muted tiny"> / ' + T('month') + '</span></div>' +
        '</div></div>';
      }).join('') + '</div>' +
      '<div class="site__cta">' +
        '<b>' + T('Want to join one of these?') + '</b>' +
        '<a class="btn btn--cta" href="#/p/join">' + T('Create an account') + '</a>' +
      '</div>';
  }

  function contactPage() {
    var sc = S.data.school;
    return '<div class="site__hero">' +
        '<h1>' + T('Contact') + '</h1>' +
        '<p>' + T('Come in, call, or write — whichever suits you.') + '</p>' +
      '</div>' +
      '<div class="grid g3">' +
        contactCard('phone', T('Sales'), sc.phone, 'tel:' + sc.phone) +
        contactCard('mail', T('Email'), sc.email, 'mailto:' + sc.email) +
        contactCard('map', T('Address'), sc.address, '') +
      '</div>';
  }

  function contactCard(ic, k, v, href) {
    var inner = '<div class="av" style="background:var(--brand)">' + U.icon(ic) + '</div>' +
      '<div class="stat__k" style="margin-top:12px">' + U.esc(k) + '</div>' +
      '<div style="font-weight:700;margin-top:4px">' + U.esc(v) + '</div>';
    return '<div class="card"><div class="card__b">' +
      (href ? '<a href="' + U.esc(href) + '" style="color:inherit;text-decoration:none">' + inner + '</a>' : inner) +
      '</div></div>';
  }

  /* ── the two doors in ──
     Sign-in takes an email and a password and says nothing about which of the
     two was wrong. Registration is students only: a teacher account reads the
     whole school, so those are created from inside by someone already holding
     one. See auth.js for what client-side passwords are and are not worth.
     Both are drawn by authScreen() above; this is the shared field. */
  function field(name, label, type, ic, auto) {
    return '<label class="field field--ic"><span>' + T(label) + '</span>' +
      '<span class="field__wrap">' + U.icon(ic, 16) +
        '<input name="' + name + '" type="' + type + '" autocomplete="' + (auto || 'off') + '"></span></label>';
  }

  /* ── shell ────────────────────────────────────────────── */
  function shell(title, cn, body) {
    var me = S.user(App.session.userId);
    var role = App.session.role;
    var links = NAV[role];
    var pfx = PREFIX[role];
    var active = App.route[1] || 'dashboard';
    var zh = global.I18n.get() === 'zh';

    return '' +
      '<div class="shell">' +
        '<nav class="nav">' +
          '<div class="nav__top"><div class="logo">' +
            '<b>ERA CHINESE.</b><span>你。让世界更美</span></div></div>' +
          '<div class="nav__role">' + (role === 'teacher' ? T('Teacher') + (zh ? '' : ' · 教师') : T('Student') + (zh ? '' : ' · 学生')) + '</div>' +
          '<div class="nav__links">' + links.map(function (l) {
            var on = active === l.k ||
                     (l.k === 'lessons' && (active === 'lesson' || active === 'live')) ||
                     (l.k === 'classes' && active === 'class');
            return '<a href="#/' + pfx + '/' + l.k + '" class="' + (on ? 'on' : '') + '">' +
              U.icon(l.icon) + '<span>' + T(l.label) + '</span>' +
              (zh ? '' : '<span class="cn" style="margin-left:auto;opacity:.55;font-size:11px">' + l.cn + '</span>') + '</a>';
          }).join('') + '</div>' +
          '<div class="nav__foot">' +
            '<div class="nav__me">' + U.avatar(me) +
              '<div style="min-width:0"><b>' + U.esc(me.name) + '</b><small>' + U.esc(me.email) + '</small></div></div>' +
            '<button data-act="changePassword" style="margin-bottom:7px">' +
              U.icon('lock') + T('Change password') + '</button>' +
            '<button data-act="logout">' + U.icon('logout') + T('Sign out') + '</button>' +
          '</div>' +
        '</nav>' +
        '<div class="main">' +
          '<header class="topbar">' +
            '<button class="burger" data-act="burger" aria-label="Menu">' + U.icon('menu') + '</button>' +
            '<h2>' + U.esc(title) + '</h2>' + (zh ? '' : '<span class="cn">' + U.esc(cn) + '</span>') +
            '<span class="topbar__sp"></span>' +
            langPicker() +
            '<span class="tag tag--gold">' + U.fmt.dateLong(S.today()) + '</span>' +
            (role === 'teacher'
              ? '<button class="btn btn--sm" data-act="resetDemo" title="' + T('Restore the demo school') + '">' +
                  U.icon('shuffle') + T('Reset demo') + '</button>'
              : '') +
          '</header>' +
          '<div class="page">' + body + '</div>' +
        '</div>' +
      '</div>';
  }

  /* ── render ───────────────────────────────────────────── */
  var lastLive = null;

  function render(force) {
    var root = document.getElementById('app');
    App.route = parseHash();

    /* signed out: the public site, whatever the hash says */
    if (!App.session) {
      if (lastLive) { global.LiveView.unmount(); lastLive = null; }
      root.innerHTML = publicPage();
      document.body.classList.remove('nav-open');
      /* the autoplay attribute alone is ignored in a few browsers — nudge it */
      var clip = root.querySelector('.login__video');
      if (clip) { var pl = clip.play(); if (pl && pl.catch) pl.catch(function () {}); }
      return;
    }

    var pfx = PREFIX[App.session.role];
    if (App.route[0] !== pfx) { location.hash = homeHash(); return; }

    var page = App.route[1] || 'dashboard';
    var param = App.route[2] || null;

    /* a graduate has no live room to walk back into, even by a stale link */
    if (page === 'live' && App.session.role === 'student' && S.isGraduated(App.session.userId)) {
      location.hash = homeHash();
      return;
    }

    /* The online classroom holds a live video iframe and a whiteboard canvas —
       rebuilding the page would drop the call, so once it is mounted only its
       own regions are refreshed. */
    if (page === 'live' && !force && lastLive === param && global.LiveView.isMounted(param)) {
      global.LiveView.refresh();
      return;
    }
    if (lastLive && (page !== 'live' || lastLive !== param)) {
      global.LiveView.unmount();
      lastLive = null;
    }

    var V = App.session.role === 'teacher' ? global.TeacherViews : global.StudentViews;
    var body, title, cn;

    var navItem = NAV[App.session.role].filter(function (n) { return n.k === page; })[0];
    if (navItem) { title = T(navItem.label); cn = navItem.cn; }
    else if (DETAIL[page]) { title = T(DETAIL[page].label); cn = DETAIL[page].cn; }
    else { title = T('Not found'); cn = ''; }

    try {
      if (page === 'live') {
        body = global.LiveView.page(param);
      } else if (App.session.role === 'teacher') {
        body = page === 'dashboard' ? V.dashboard()
             : page === 'classes' ? V.classes()
             : page === 'class' ? V.classDetail(param)
             : page === 'lessons' ? V.lessons()
             : page === 'lesson' ? V.lessonDetail(param)
             : page === 'homework' ? V.homework()
             : page === 'students' ? V.students()
             : page === 'payments' ? V.payments()
             : page === 'news' ? V.news()
             : notFound();
      } else {
        body = page === 'dashboard' ? V.dashboard()
             : page === 'lessons' ? V.lessons()
             : page === 'lesson' ? V.lessonDetail(param)
             : page === 'vocab' ? V.vocab()
             : page === 'homework' ? V.homework()
             : page === 'progress' ? V.progress()
             : page === 'tuition' ? V.tuition()
             : page === 'news' ? V.news()
             : notFound();
      }
    } catch (err) {
      body = '<div class="card"><div class="card__b">' +
        '<h3>' + T('Something went wrong on this page') + '</h3>' +
        '<p class="muted tiny" style="white-space:pre-wrap">' + U.esc(err && err.message) + '</p></div></div>';
      if (global.console) console.error(err);
    }

    root.innerHTML = shell(title, cn, body);
    document.body.classList.remove('nav-open');

    if (page === 'live') {
      lastLive = param;
      global.LiveView.mount(param);
    }
  }
  App.render = render;

  function notFound() {
    return '<div class="card">' + U.empty('alert', T('Page not found'), T('The link may be out of date.')) + '</div>';
  }

  /* ── shared actions ───────────────────────────────────── */
  function val(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? el.value.trim() : '';
  }

  function wireActions() {
    A.go = function (e) { App.go(e.getAttribute('data-href')); };
    A.siteMenu = function () { document.body.classList.toggle('nav-open'); };

    A.setLang = function (e) {
      global.I18n.set(e.value);
      if (lastLive) { global.LiveView.unmount(); lastLive = null; }
      render(true);
      U.toast(T('Language changed'), 'globe');
    };

    /* Both doors end here: on success the session is opened and the school
       takes over the page; on failure the message goes above the form and the
       typed email is left alone so it need not be retyped. */
    function enter(u) {
      App.session = { userId: u.id, role: u.role };
      App.filters = {}; App.flash = null; App.authError = null;
      saveSession();
      App.go(homeHash());
      U.toast(T('Signed in as {name}', { name: u.name }), 'check');
    }

    A.doLogin = function (form) {
      var r = S.signIn(val(form, 'email'), val(form, 'password'));
      if (r.error) { App.authError = r.error; render(); return; }
      enter(r.user);
    };

    A.doJoin = function (form) {
      var r = S.registerStudent({
        name: val(form, 'name'), email: val(form, 'email'),
        password: val(form, 'password'), confirm: val(form, 'confirm')
      });
      if (r.error) { App.authError = r.error; render(); return; }
      enter(r.user);
      U.toast(T('Welcome to the school'), 'grad');
    };
    /* Seeded accounts all start on the same password, so changing it has to be
       reachable from anywhere — it sits under the account in the sidebar. */
    A.changePassword = function () {
      U.Modal.open({
        title: T('Change password'), cn: '修改密码',
        body: '<label class="field"><span>' + T('Current password') + '</span>' +
            '<input name="cur" type="password" autocomplete="current-password"></label>' +
          '<label class="field"><span>' + T('New password') + '</span>' +
            '<input name="pw" type="password" autocomplete="new-password"></label>' +
          '<label class="field"><span>' + T('Repeat password') + '</span>' +
            '<input name="pw2" type="password" autocomplete="new-password"></label>' +
          '<p class="tiny muted" style="margin:0">' +
            T('At least 8 characters, with letters and numbers.') + '</p>',
        okText: T('Change password'),
        onOk: function () {
          var me = S.user(App.session.userId);
          if (!global.Auth.verify(me, U.Modal.val('cur'))) {
            U.toast(T('Current password is wrong'), 'alert'); return;
          }
          if (U.Modal.val('pw') !== U.Modal.val('pw2')) {
            U.toast(T('The two passwords do not match'), 'alert'); return;
          }
          var r = S.setPassword(me.id, U.Modal.val('pw'));
          if (r.error) { U.toast(T(r.error), 'alert'); return; }
          U.Modal.close(); U.toast(T('Password changed'), 'check');
        }
      });
    };

    A.logout = function () {
      if (lastLive) { global.LiveView.unmount(); lastLive = null; }
      App.session = null; App.filters = {}; App.flash = null;
      saveSession();
      location.hash = '';
      render(true);
    };
    A.burger = function () { document.body.classList.toggle('nav-open'); };
    A.resetDemo = function () {
      U.Modal.open({
        title: T('Reset the demo school'),
        body: '<p style="margin:0">' + T('Every class, lesson, register, grade and assessment goes back to how it started. Anything you added here is lost.') + '</p>' +
          '<p style="margin:10px 0 0;color:var(--red);font-weight:600">' +
          T('Every account opened since then is deleted too, and everyone is signed out.') + '</p>',
        okText: T('Reset'),
        onOk: function () {
          S.reset();
          try { localStorage.removeItem('era-chinese-lite/live'); } catch (e) {}
          global.Live.load();
          App.filters = {}; App.flash = null;
          if (lastLive) { global.LiveView.unmount(); lastLive = null; }
          if (App.session && !S.user(App.session.userId)) {
            App.session = null; saveSession(); location.hash = '';
          }
          U.Modal.close(); render(true); U.toast(T('Demo school restored'), 'shuffle');
        }
      });
    };
  }

  /* ── event wiring ─────────────────────────────────────── */
  function onClick(ev) {
    var closeEl = ev.target.closest('[data-modal-close]');
    if (closeEl) { ev.preventDefault(); U.Modal.close(); return; }

    var okEl = ev.target.closest('[data-modal-ok]');
    if (okEl) { ev.preventDefault(); if (U.Modal._ok) U.Modal._ok(); return; }

    if (ev.target.classList && ev.target.classList.contains('mask')) { U.Modal.close(); return; }

    var el = ev.target.closest('[data-act]');
    if (!el) {
      if (document.body.classList.contains('nav-open') && !ev.target.closest('.nav')) {
        document.body.classList.remove('nav-open');
      }
      return;
    }
    /* <select> and <textarea> fire their own change/input events instead */
    if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return;

    var fn = A[el.getAttribute('data-act')];
    if (!fn) return;
    if (el.tagName === 'A' && el.getAttribute('href') === '#') ev.preventDefault();
    ev.stopPropagation();
    fn(el, ev);
  }

  /* The sign-in and registration forms submit rather than click, so Enter in a
     password field works the way it does on every other site. */
  function onSubmit(ev) {
    var form = ev.target.closest ? ev.target.closest('form[data-form]') : null;
    if (!form) return;
    ev.preventDefault();
    var fn = form.getAttribute('data-form') === 'join' ? A.doJoin : A.doLogin;
    fn(form);
  }

  function onInput(ev) {
    var el = ev.target.closest && ev.target.closest('[data-act]');
    if (!el || (el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT')) return;
    var fn = A[el.getAttribute('data-act')];
    if (fn) fn(el, ev);
  }

  function onKey(ev) {
    if (ev.key === 'Escape' && document.querySelector('#modal-root .mask')) { U.Modal.close(); return; }
    if (document.querySelector('#modal-root .mask')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    if (!App.session || !App.flash || App.route[1] !== 'vocab') return;
    if (ev.key === 'ArrowRight') { ev.preventDefault(); A.flashNext(); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); A.flashPrev(); }
    else if (ev.key === ' ') { ev.preventDefault(); A.flip(); }
  }

  /* ── boot ─────────────────────────────────────────────── */
  function boot() {
    S = global.Store; U = global.UI; A = global.Actions;
    global.I18n.init();
    S.load();
    S.initSync();
    global.Live.init();
    global.TeacherViews.init();
    global.StudentViews.init();
    global.LiveView.init();
    wireActions();

    /* a mark, a new lesson, a payment saved in another tab (teacher and
       student typically each run their own) — refresh whatever is on screen.
       render() already knows to just refresh a mounted live room rather than
       rebuilding it, so a plain call is enough here too. */
    S.onChange(function () {
      if (App.session) render();
    });

    App.session = loadSession();

    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onInput);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    global.addEventListener('hashchange', function () { App.authError = null; render(); });
    global.addEventListener('beforeunload', function () {
      if (lastLive) global.LiveView.unmount();
    });

    /* a page opened in a background tab never starts its autoplay clip */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      var clip = document.querySelector('.login__video');
      if (clip && clip.paused) { var p = clip.play(); if (p && p.catch) p.catch(function () {}); }
    });

    if ('speechSynthesis' in global) { try { global.speechSynthesis.getVoices(); } catch (e) {} }

    if (App.session && !location.hash) location.hash = homeHash();
    else render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
