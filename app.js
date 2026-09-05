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
    loginRole: 'teacher'
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
      { k: 'payments', icon: 'wallet', label: 'Payments', cn: '学费' }
    ],
    student: [
      { k: 'dashboard', icon: 'home', label: 'Dashboard', cn: '概览' },
      { k: 'lessons', icon: 'calendar', label: 'My timetable', cn: '课表' },
      { k: 'vocab', icon: 'sparkles', label: 'Vocabulary', cn: '生词' },
      { k: 'homework', icon: 'file', label: 'Homework', cn: '作业' },
      { k: 'progress', icon: 'chart', label: 'My progress', cn: '进度' }
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

  /* ── login ────────────────────────────────────────────── */
  function loginView() {
    var role = App.loginRole;
    var people = role === 'teacher' ? S.teachers() : S.students();
    var zh = global.I18n.get() === 'zh';
    return '' +
      '<div class="login">' +
        '<div class="login__brand">' +
          '<video class="login__video" src="brand-loop.mp4" autoplay loop muted playsinline></video>' +
          '<div class="login__logo"><div class="logo logo--lg">' +
            '<b>ERA CHINESE.</b><span>你。让世界更美</span></div></div>' +
          '<div class="login__foot">' +
            '<div class="login__pitch">' +
              '<h1>' + T('Every lesson, register and mark in one place.') + '</h1>' +
            '</div>' +
            '<p class="login__slogan">“Сонирхогч бус Мэргэжлийн”</p>' +
            '<div class="login__facts">' +
              '<div><b>' + S.data.classes.length + '</b><span>' + T('Classes') + '</span></div>' +
              '<div><b>' + S.students().length + '</b><span>' + T('Students') + '</span></div>' +
              '<div><b>' + S.data.lessons.length + '</b><span>' + T('Lessons') + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="login__pick">' +
          '<div class="login__mark">ERA CHINESE.</div>' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">' +
            '<h2 style="font-size:23px;flex:1">' + T('Sign in') + '</h2>' + langPicker() + '</div>' +
          '<p>' + T('Pick an account to open the school.') + '</p>' +
          '<div class="roleTabs">' +
            '<button data-act="loginRole" data-v="teacher" class="' + (role === 'teacher' ? 'on' : '') + '">' + T('Teacher') + (zh ? '' : ' 教师') + '</button>' +
            '<button data-act="loginRole" data-v="student" class="' + (role === 'student' ? 'on' : '') + '">' + T('Student') + (zh ? '' : ' 学生') + '</button>' +
          '</div>' +
          '<div class="accounts">' + people.map(function (p) {
            return '<button class="acct" data-act="signIn" data-id="' + p.id + '">' + U.avatar(p) +
              '<div style="flex:1"><b>' + U.esc(p.name) + ' <span class="cn muted">' + U.esc(p.cn) + '</span></b>' +
              '<small>' + U.esc(p.title || p.email) + '</small></div>' + U.icon('chevron') + '</button>';
          }).join('') + '</div>' +
          '<p class="tiny muted" style="margin-top:22px">' +
            T('Demo school — data is stored in this browser only.') + ' ' +
            '<a href="#" data-act="resetDemo" style="color:var(--brand);font-weight:600">' + T('Reset the demo data') + '</a>.</p>' +
        '</div>' +
      '</div>';
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
            '<button class="btn btn--sm" data-act="resetDemo" title="' + T('Restore the demo school') + '">' +
              U.icon('shuffle') + T('Reset demo') + '</button>' +
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

    if (!App.session) {
      if (lastLive) { global.LiveView.unmount(); lastLive = null; }
      root.innerHTML = loginView();
      /* the autoplay attribute alone is ignored in a few browsers — nudge it */
      var clip = root.querySelector('.login__video');
      if (clip) { var p = clip.play(); if (p && p.catch) p.catch(function () {}); }
      return;
    }

    var pfx = PREFIX[App.session.role];
    if (App.route[0] !== pfx) { location.hash = homeHash(); return; }

    var page = App.route[1] || 'dashboard';
    var param = App.route[2] || null;

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
             : notFound();
      } else {
        body = page === 'dashboard' ? V.dashboard()
             : page === 'lessons' ? V.lessons()
             : page === 'lesson' ? V.lessonDetail(param)
             : page === 'vocab' ? V.vocab()
             : page === 'homework' ? V.homework()
             : page === 'progress' ? V.progress()
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
  function wireActions() {
    A.go = function (e) { App.go(e.getAttribute('data-href')); };
    A.loginRole = function (e) { App.loginRole = e.getAttribute('data-v'); render(); };

    A.setLang = function (e) {
      global.I18n.set(e.value);
      if (lastLive) { global.LiveView.unmount(); lastLive = null; }
      render(true);
      U.toast(T('Language changed'), 'globe');
    };

    A.signIn = function (e) {
      var u = S.user(e.getAttribute('data-id'));
      App.session = { userId: u.id, role: u.role };
      App.filters = {}; App.flash = null;
      saveSession();
      App.go(homeHash());
      U.toast(T('Signed in as {name}', { name: u.name }), 'check');
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
        body: '<p style="margin:0">' + T('Every class, lesson, register, grade and assessment goes back to how it started. Anything you added here is lost.') + '</p>',
        okText: T('Reset'),
        onOk: function () {
          S.reset();
          try { localStorage.removeItem('era-chinese-lite/live'); } catch (e) {}
          global.Live.load();
          App.filters = {}; App.flash = null;
          if (lastLive) { global.LiveView.unmount(); lastLive = null; }
          if (App.session && !S.user(App.session.userId)) { App.session = null; saveSession(); }
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
    global.Live.init();
    global.TeacherViews.init();
    global.StudentViews.init();
    global.LiveView.init();
    wireActions();

    App.session = loadSession();
    if (App.session) App.loginRole = App.session.role;

    document.addEventListener('click', onClick);
    document.addEventListener('change', onInput);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    global.addEventListener('hashchange', function () { render(); });
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
