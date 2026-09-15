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
      { k: 'chat', icon: 'mail', label: 'Messages', cn: '消息' },
      { k: 'course', icon: 'grad', label: 'Course content', cn: '学习内容' },
      { k: 'news', icon: 'megaphone', label: 'News', cn: '公告' }
    ],
    student: [
      { k: 'dashboard', icon: 'home', label: 'Dashboard', cn: '概览' },
      { k: 'learn', icon: 'target', label: 'Learning path', cn: '学习路径' },
      { k: 'chat', icon: 'mail', label: 'Messages', cn: '消息' },
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
    { k: 'contact', label: 'Contact', cn: '联系' }
  ];
  /* no public noticeboard: school news is read after signing in */
  var PUB_PAGES = ['contact', 'login', 'join'];

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

    var body = contactPage();

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
            (global.Cloud && global.Cloud.client ? '' :
            '<div class="login__facts">' +
              '<div><b>' + S.data.classes.length + '</b><span>' + T('Classes') + '</span></div>' +
              '<div><b>' + S.activeStudents().length + '</b><span>' + T('Students') + '</span></div>' +
              '<div><b>' + S.data.lessons.length + '</b><span>' + T('Lessons') + '</span></div>' +
            '</div>') +
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
            : App.authNotice
              ? '<div class="auth__err auth__ok">' + U.icon('mail', 15) + U.esc(App.authNotice) + '</div>'
              : '') +

          (join
            ? '<form class="auth__form" data-form="join">' +
                field('name', 'Full name', 'text', 'user', 'name') +
                field('email', 'Email', 'email', 'mail', 'username') +
                field('password', 'Password', 'password', 'lock', 'new-password') +
                field('confirm', 'Repeat password', 'password', 'lock', 'new-password') +
                /* a request, not an enrolment — the school still places them */
                (!(global.Cloud && global.Cloud.client) && S.data.classes.length
                  ? '<label class="field"><span>' + T('Which course interests you?') + '</span>' +
                      '<select name="wantsClassId">' +
                        '<option value="">' + T('Not sure yet') + '</option>' +
                        S.data.classes.map(function (c) {
                          return '<option value="' + c.id + '">' + U.esc(c.name) +
                            (c.days ? ' · ' + U.esc(U.daysLabel(c.days)) + ' ' + U.esc(c.time || '') : '') +
                            '</option>';
                        }).join('') +
                      '</select></label>'
                  : '') +
                '<p class="tiny muted" style="margin:-2px 0 2px">' +
                  T('At least 8 characters, with letters and numbers.') +
                  (!(global.Cloud && global.Cloud.client) && S.data.classes.length ? ' ' + T('The school will confirm your class.') : '') + '</p>' +
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
            '<div style="margin-top:10px"><a href="#/p/contact">' + T('Contact') + '</a></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function siteHeader(page) {
    return '<header class="site__head"><div class="site__bar">' +
        '<a class="site__logo" href="#/p/login">' +
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
    var sc = S.contact();
    function row(label, ic, text, href) {
      var val = U.icon(ic, 15) + U.esc(text);
      return '<div class="foot__row">' +
        '<span class="foot__lbl">' + T(label) + ':</span>' +
        (href
          ? '<a class="foot__val foot__link" href="' + U.esc(href) + '"' +
              (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '') + '>' + val + '</a>'
          : '<span class="foot__val">' + val + '</span>') +
      '</div>';
    }
    return '<footer class="site__foot">' +
        '<div class="foot__in">' +
          '<div class="foot__contact">' +
            row('Phone', 'phone', sc.phone, 'tel:' + sc.phone) +
            row('Facebook', 'facebook', sc.facebookName, sc.facebook) +
            row('Instagram', 'instagram', sc.instagramName, sc.instagram) +
            row('Address', 'map', sc.address, '') +
          '</div>' +
        '</div>' +
        '<div class="foot__legal">© ' + new Date().getFullYear() + ' ' + U.esc(sc.name) +
          ' · ' + U.esc(sc.cn) + '</div>' +
      '</footer>';
  }

  function contactPage() {
    var sc = S.contact();
    return '<div class="site__hero">' +
        '<h1>' + T('Contact') + '</h1>' +
        '<p>' + T('Come in, call, or write — whichever suits you.') + '</p>' +
      '</div>' +
      '<div class="grid g4">' +
        contactCard('phone', T('Phone'), sc.phone, 'tel:' + sc.phone) +
        contactCard('facebook', 'Facebook', sc.facebookName, sc.facebook) +
        contactCard('instagram', 'Instagram', sc.instagramName, sc.instagram) +
        contactCard('map', T('Address'), sc.address, '') +
      '</div>';
  }

  function contactCard(ic, k, v, href) {
    var inner = '<div class="av" style="background:var(--brand)">' + U.icon(ic) + '</div>' +
      '<div class="stat__k" style="margin-top:12px">' + U.esc(k) + '</div>' +
      '<div style="font-weight:700;margin-top:4px">' + U.esc(v) + '</div>';
    return '<div class="card"><div class="card__b">' +
      (href ? '<a href="' + U.esc(href) + '"' + (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '') +
        ' style="color:inherit;text-decoration:none">' + inner + '</a>' : inner) +
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

  function splash() {
    return '<div class="splash">' +
      '<div class="logo logo--lg"><b>ERA CHINESE.</b><span>你。让世界更美</span></div>' +
      '<p>' + T('Opening the school…') + '</p></div>';
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
              (l.k === 'chat' && S.unreadCount(me.id) ? '<span class="navBadge">' + S.unreadCount(me.id) + '</span>' : '') +
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

    /* fetching the school; a flash of the sign-in form would be a lie */
    if (App.booting) { root.innerHTML = splash(); return; }

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

    /* The account can go while the tab is still open: another tab starts the
       school over, or the demo accounts are cleared out on an upgrade. Sign
       out cleanly rather than drawing a shell around nobody. */
    if (!S.user(App.session.userId)) {
      if (lastLive) { global.LiveView.unmount(); lastLive = null; }
      App.session = null; App.filters = {}; App.flash = null;
      saveSession();
      location.hash = '';
      root.innerHTML = publicPage();
      return;
    }

    var pfx = PREFIX[App.session.role];
    if (App.route[0] !== pfx) { location.hash = homeHash(); return; }

    var page = App.route[1] || 'dashboard';
    var param = App.route[2] || null;

    /* The online classroom is the one page where a typed URL could put someone
       in a room that is none of their business, so the router turns them
       around before any of it is built. Live.mayJoin() is the single answer
       to that question — the page, the heartbeat and the chat all ask it too. */
    if (page === 'live') {
      var why = global.Live.mayJoin(param, S.user(App.session.userId));
      if (why) {
        location.hash = homeHash();
        U.toast(T(why), 'lock');
        return;
      }
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
             : page === 'course' ? global.LearnViews.editor()
             : page === 'chat' ? global.ChatViews.page(param)
             : notFound();
      } else {
        body = page === 'dashboard' ? V.dashboard()
             : page === 'lessons' ? V.lessons()
             : page === 'lesson' ? V.lessonDetail(param)
             : page === 'learn' ? global.LearnViews.path(param)
             : page === 'chat' ? global.ChatViews.page(param)
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

    /* A redraw can land mid-sentence — a message arriving from another device
       repaints the page. Whatever field had focus keeps its text and caret. */
    var focused = document.activeElement;
    var keep = focused && focused.id && /^(INPUT|TEXTAREA)$/.test(focused.tagName)
      ? { id: focused.id, value: focused.value, start: focused.selectionStart, end: focused.selectionEnd }
      : null;

    root.innerHTML = shell(title, cn, body);
    App.unreadShown = S.unreadCount(App.session.userId);
    document.body.classList.remove('nav-open');

    if (keep) {
      var again = document.getElementById(keep.id);
      if (again) {
        again.value = keep.value;
        try { again.focus(); again.setSelectionRange(keep.start, keep.end); } catch (e) {}
      }
    }
    if (page === 'chat') global.ChatViews.after(param);

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

    /* Both doors work the same way from here whether the school is in this
       browser or in Supabase; only who checks the password differs. The forms
       are disabled while the answer is on its way, since a second press would
       otherwise fire a second sign-in. */
    function busy(on) {
      App.authBusy = on;
      var btn = document.querySelector('.auth__form button[type="submit"]');
      if (btn) btn.disabled = on;
    }

    /* The local school answers straight away and stays synchronous — going
       through a promise for it would only invent a window where the form is
       submitted twice. Only the cloud path waits. */
    A.doLogin = function (form) {
      if (App.authBusy) return;
      App.authNotice = null;
      var email = val(form, 'email'), password = val(form, 'password');

      if (!(global.Cloud && global.Cloud.client)) {
        var local = S.signIn(email, password);
        if (local.error) { App.authError = local.error; render(); return; }
        enter(local.user);
        return;
      }

      busy(true);
      global.Cloud.signIn(email, password).then(function (r) {
        if (r.error) return r;
        return startCloudSession();
      }).then(function (r) {
        busy(false);
        if (r.error) { App.authError = r.error; render(); return; }
        enter(r.user);
      }).catch(function (e) {
        busy(false);
        App.authError = (e && e.message) || 'Wrong email or password';
        render();
      });
    };

    A.doJoin = function (form) {
      if (App.authBusy) return;
      var data = {
        name: val(form, 'name'), email: val(form, 'email'),
        password: val(form, 'password'), confirm: val(form, 'confirm'),
        wantsClassId: val(form, 'wantsClassId')
      };

      if (!(global.Cloud && global.Cloud.client)) {
        var local = S.registerStudent(data);
        if (local.error) { App.authError = local.error; render(); return; }
        enter(local.user);
        U.toast(T('Welcome to the school'), 'grad');
        return;
      }

      busy(true);
      global.Cloud.register(data).then(function (r) {
        if (r.error || r.confirm) return r;
        return startCloudSession();
      }).then(function (r) {
        busy(false);
        if (r.error) { App.authError = r.error; render(); return; }
        if (r.confirm) {
          /* email confirmation is on: there is no session until they click
             the link, so do not drop them on a form that cannot work yet */
          App.authError = null;
          App.authNotice = T('We sent a confirmation link to {email}. Open it, then sign in here.', { email: r.email });
          App.go('#/p/login');
          return;
        }
        enter(r.user);
        U.toast(T('Welcome to the school'), 'grad');
      }).catch(function (e) {
        busy(false);
        App.authError = (e && e.message) || 'Something went wrong';
        render();
      });
    };

    /* Signed in against Supabase: pull the school down, start listening for
       what other devices do, and work out who this session belongs to. */
    function startCloudSession() {
      var uid = null;
      return global.Cloud.session().then(function (sess) {
        uid = sess && sess.user && sess.user.id;
        if (!uid) throw { auth: 'Wrong email or password' };
        return global.Cloud.hydrate();
      }).then(function (data) {
        S.adopt(data);
        if (S.user(uid)) return S.user(uid);
        /* The login worked but its profile row is not readable yet — the
           sign-up trigger runs on the server, and a first read can beat it.
           Wait a moment and look once more before giving up. */
        return new Promise(function (res) { setTimeout(res, 800); })
          .then(function () { return global.Cloud.hydrate(); })
          .then(function (d2) { S.adopt(d2); return S.user(uid); });
      }).then(function (me) {
        if (!me) {
          /* Signed in, but the database has no profile for them: schema.sql
             was never run, or its trigger is missing. Undo the half sign-in
             and say what is actually wrong. */
          global.Cloud.signOut();
          S.detach();
          return { error: 'Your account has no profile in the school database yet. Ask the school to finish setting it up.' };
        }
        global.Cloud.watch(function () {
          global.Cloud.hydrate().then(function (fresh) { S.refresh(fresh); });
        });
        /* the online classroom lives in its own tables, and only reaches
           another device if we listen for it */
        global.Live.sync.watch(function () { global.Live.pull(); });
        /* the classroom tables are optional to signing in: if they are not
           there yet, the school still opens */
        return global.Live.pull().then(function () { return { user: me }; },
                                        function () { return { user: me }; });
      }).catch(function (e) {
        if (e && e.auth) return { error: e.auth };
        if (global.console) console.error('sign-in:', e && e.message);
        S.detach();
        global.Cloud.signOut();
        return { error: /fetch|network|failed to/i.test((e && e.message) || '')
          ? 'Could not reach the school. Check your internet connection.'
          : 'The school could not be opened. Try again in a moment.' };
      });
    }
    App.startCloudSession = startCloudSession;
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
          /* In cloud mode the password is not in the browser to check against;
             Supabase requires a live session to change it, which is the same
             guarantee by a different route. */
          if (!(global.Cloud && global.Cloud.client) &&
              !global.Auth.verify(me, U.Modal.val('cur'))) {
            U.toast(T('Current password is wrong'), 'alert'); return;
          }
          if (U.Modal.val('pw') !== U.Modal.val('pw2')) {
            U.toast(T('The two passwords do not match'), 'alert'); return;
          }
          if (global.Cloud && global.Cloud.client) {
            global.Cloud.changePassword(U.Modal.val('pw')).then(function (r) {
              if (r.error) { U.toast(T(r.error), 'alert'); return; }
              U.Modal.close(); U.toast(T('Password changed'), 'check');
            });
            return;
          }
          var r = S.setPassword(me.id, U.Modal.val('pw'));
          if (r.error) { U.toast(T(r.error), 'alert'); return; }
          U.Modal.close(); U.toast(T('Password changed'), 'check');
        }
      });
    };

    A.logout = function () {
      if (lastLive) { global.LiveView.unmount(); lastLive = null; }
      var cloud = global.Cloud && global.Cloud.client;
      App.session = null; App.filters = {}; App.flash = null; App.learn = null; App.authError = null;
      saveSession();
      location.hash = '';
      if (cloud) {
        /* whatever the last click changed goes up before the session ends */
        S.flushNow().then(function () { return global.Cloud.signOut(); })
          .then(function () { S.detach(); render(true); });
      }
      render(true);
    };
    A.burger = function () { document.body.classList.toggle('nav-open'); };
    /* There is no "start over" button, on purpose. It sat in the top bar next
       to the date, one press from erasing every student, register, grade and
       invoice in the school — and on a school that is actually being used,
       nothing that destructive belongs a click away from ordinary navigation.
       Store.reset() is still there for a deliberate reset from the console;
       the README says how. */
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
    var kind = form.getAttribute('data-form');
    if (kind === 'chat') { global.ChatViews.send(form); return; }
    var fn = kind === 'join' ? A.doJoin : A.doLogin;
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
    var lastSyncError = 0;
    S.onSyncError = function () {
      if (Date.now() - lastSyncError < 8000) return;
      lastSyncError = Date.now();
      U.toast(T('A change could not be saved. Check your connection — it will be retried.'), 'alert');
    };

    S.onChange(function () {
      if (!App.session) return;
      /* a message that arrives while the person is elsewhere gets a toast;
         one in the conversation already open simply appears. The count it is
         compared with is the one the last paint showed, so the very first
         message after opening the page is announced too. */
      var n = S.user(App.session.userId) ? S.unreadCount(App.session.userId) : 0;
      if (App.unreadShown != null && n > App.unreadShown && App.route[1] !== 'chat') {
        U.toast(T('New message'), 'mail');
      }
      render();
    });

    /* ── which school is this ──
       Unconfigured, the app is what it always was: this browser's copy, a
       session per tab. Configured, the session belongs to the browser and
       comes from Supabase, and the school is fetched before the first paint
       so nobody sees an empty dashboard that then fills in. */
    var cloud = global.Cloud && global.Cloud.init();
    if (!cloud) {
      App.session = loadSession();
    } else {
      App.session = null;
      App.booting = true;
      /* Supabase sends people back from the confirmation email with either a
         session or an error in the address. An expired or reused link must
         say so, not drop them on a sign-in form with no explanation. */
      var h = String(location.hash || '');
      if (/error_description=/.test(h)) {
        var m = /error_description=([^&]+)/.exec(h);
        var desc = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
        App.authError = /expired|invalid/i.test(desc)
          ? 'That confirmation link has expired or was already used. Sign in, or register again to get a new one.'
          : 'Something went wrong';
        history.replaceState(null, '', location.pathname + '#/p/login');
      }
      global.Cloud.session().then(function (sess) {
        if (!sess) return null;
        return App.startCloudSession().then(function (r) {
          if (r && r.user) {
            App.session = { userId: r.user.id, role: r.user.role };
            saveSession();
            /* arriving from the confirmation link: clear the tokens out of the address */
            if (/access_token=/.test(String(location.hash))) location.hash = homeHash();
          } else if (r && r.error) {
            App.authError = r.error;
          }
        });
      }).catch(function (e) {
        if (global.console) console.error('could not reach the school:', e && e.message);
        App.cloudError = true;
      }).then(function () {
        App.booting = false;
        if (App.session && !location.hash) location.hash = homeHash();
        else render(true);
      });
    }

    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('change', onInput);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    global.addEventListener('hashchange', function () {
      App.authError = null;
      /* the "check your email" note belongs to the sign-in page it was sent to */
      if (!/^#\/p\/login/.test(location.hash)) App.authNotice = null;
      render();
    });
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

    if (App.booting) return;                 /* the cloud path paints when ready */
    if (App.session && !location.hash) location.hash = homeHash();
    else render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
