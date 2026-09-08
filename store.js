/* ERA Chinese — data store.
   Everything lives in one localStorage key. No server, no build step.
   Teacher and student sign in on the same browser and see the same school. */
(function (global) {
  'use strict';

  var KEY = 'era-chinese-lite/v1';

  /* cross-tab sync: teacher and student sign in as two tabs of the same
     browser, so a mark, a new lesson or anything else saved in one tab must
     reach the other without a manual refresh. */
  var CH = null;
  var listeners = [];
  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function isoDay(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return isoDay(new Date()); }
  function offset(n) { var d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); }
  function uid(p) { return (p || 'id') + '_' + Math.random().toString(36).slice(2, 9); }
  /* Tuition is billed by calendar month, so a period is just "2026-09". */
  function monthKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function thisMonth() { return monthKey(new Date()); }
  function monthOffset(n) {
    var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n);
    return monthKey(d);
  }
  function monthDay(period, day) { return period + '-' + pad(day); }

  /* Deterministic generator, so the demo school looks identical on every seed. */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* ── vocabulary decks ─────────────────────────────────── */
  var DECKS = [
    { id: 'd1', name: 'Greetings & courtesy', cn: '问候与礼貌', words: [
      ['你好', 'nǐ hǎo', 'hello'], ['谢谢', 'xièxie', 'thank you'], ['再见', 'zàijiàn', 'goodbye'],
      ['请', 'qǐng', 'please'], ['对不起', 'duìbuqǐ', 'sorry'], ['没关系', 'méi guānxi', "it's alright"],
      ['老师', 'lǎoshī', 'teacher'], ['学生', 'xuésheng', 'student'] ] },
    { id: 'd2', name: 'Numbers & time', cn: '数字与时间', words: [
      ['一', 'yī', 'one'], ['二', 'èr', 'two'], ['三', 'sān', 'three'], ['十', 'shí', 'ten'],
      ['今天', 'jīntiān', 'today'], ['明天', 'míngtiān', 'tomorrow'], ['星期', 'xīngqī', 'week'],
      ['点', 'diǎn', "o'clock"] ] },
    { id: 'd3', name: 'Family', cn: '家人', words: [
      ['家', 'jiā', 'family, home'], ['爸爸', 'bàba', 'father'], ['妈妈', 'māma', 'mother'],
      ['哥哥', 'gēge', 'elder brother'], ['妹妹', 'mèimei', 'younger sister'], ['儿子', 'érzi', 'son'],
      ['女儿', 'nǚ’ér', 'daughter'], ['岁', 'suì', 'years of age'] ] },
    { id: 'd4', name: 'Food & drink', cn: '饮食', words: [
      ['吃', 'chī', 'to eat'], ['喝', 'hē', 'to drink'], ['水', 'shuǐ', 'water'], ['茶', 'chá', 'tea'],
      ['米饭', 'mǐfàn', 'cooked rice'], ['菜', 'cài', 'dish, vegetable'], ['好吃', 'hǎochī', 'tasty'],
      ['饿', 'è', 'hungry'] ] },
    { id: 'd5', name: 'Travel', cn: '旅行', words: [
      ['旅游', 'lǚyóu', 'to travel'], ['机场', 'jīchǎng', 'airport'], ['护照', 'hùzhào', 'passport'],
      ['行李', 'xíngli', 'luggage'], ['出发', 'chūfā', 'to set off'], ['到达', 'dàodá', 'to arrive'],
      ['地图', 'dìtú', 'map'], ['附近', 'fùjìn', 'nearby'] ] },
    { id: 'd6', name: 'Health', cn: '健康', words: [
      ['医院', 'yīyuàn', 'hospital'], ['感冒', 'gǎnmào', 'to catch a cold'], ['发烧', 'fāshāo', 'to run a fever'],
      ['药', 'yào', 'medicine'], ['休息', 'xiūxi', 'to rest'], ['健康', 'jiànkāng', 'healthy'],
      ['锻炼', 'duànliàn', 'to exercise'], ['检查', 'jiǎnchá', 'to examine'] ] },
    { id: 'd7', name: 'Weather & seasons', cn: '天气与季节', words: [
      ['天气', 'tiānqì', 'weather'], ['晴', 'qíng', 'clear, sunny'], ['阴', 'yīn', 'overcast'],
      ['下雨', 'xiàyǔ', 'to rain'], ['刮风', 'guāfēng', 'to be windy'], ['温度', 'wēndù', 'temperature'],
      ['季节', 'jìjié', 'season'], ['变化', 'biànhuà', 'change'] ] },
    { id: 'd8', name: 'Meetings', cn: '会议', words: [
      ['会议', 'huìyì', 'meeting'], ['安排', 'ānpái', 'to arrange'], ['日程', 'rìchéng', 'agenda'],
      ['讨论', 'tǎolùn', 'to discuss'], ['决定', 'juédìng', 'to decide'], ['报告', 'bàogào', 'report'],
      ['客户', 'kèhù', 'client'], ['合作', 'hézuò', 'to cooperate'] ] },
    { id: 'd9', name: 'Negotiation', cn: '谈判', words: [
      ['谈判', 'tánpàn', 'to negotiate'], ['价格', 'jiàgé', 'price'], ['合同', 'hétong', 'contract'],
      ['条件', 'tiáojiàn', 'terms'], ['签字', 'qiānzì', 'to sign'], ['优惠', 'yōuhuì', 'discount'],
      ['数量', 'shùliàng', 'quantity'], ['交货', 'jiāohuò', 'delivery'] ] },
    { id: 'd10', name: 'Business email', cn: '商务邮件', words: [
      ['邮件', 'yóujiàn', 'email'], ['附件', 'fùjiàn', 'attachment'], ['回复', 'huífù', 'to reply'],
      ['收到', 'shōudào', 'to receive'], ['确认', 'quèrèn', 'to confirm'], ['通知', 'tōngzhī', 'to notify'],
      ['抱歉', 'bàoqiàn', 'apologies'], ['尽快', 'jǐnkuài', 'as soon as possible'] ] }
  ];

  function deckWords(deck) {
    return deck.words.map(function (w) { return { hz: w[0], py: w[1], en: w[2] }; });
  }

  /* ── tuition ───────────────────────────────── */
  var DEFAULT_FEE = 200000;
  /* what every seeded account starts with; see the README */
  var START_PASSWORD = 'era2026pw';
  var METHODS = ['Cash', 'Bank transfer', 'Card', 'Mobile'];
  var BILL_DAY = 5;                                 /* tuition falls due on the 5th */

  /* One invoice per student per class per month. The three months up to today
     are billed already; older months are almost all settled, this month is not. */
  function billPeriods() { return [monthOffset(-2), monthOffset(-1), thisMonth()]; }

  function seedPayments(classes, r) {
    var out = [];
    var dayNow = new Date().getDate();
    billPeriods().forEach(function (period, i) {
      var current = i === 2;
      classes.forEach(function (c) {
        c.studentIds.forEach(function (sid) {
          var paid = r() < (i === 0 ? 0.97 : i === 1 ? 0.88 : 0.55);
          var day = 1 + Math.floor(r() * 12);
          if (current && day > dayNow) day = dayNow;
          var amount = c.fee == null ? DEFAULT_FEE : c.fee;
          /* about a third of the unsettled ones have paid something up front */
          var advance = 0;
          if (!paid && r() < 0.34) {
            advance = Math.round(amount * (r() < 0.5 ? 0.5 : 0.3) / 10000) * 10000;
          }
          out.push({
            id: uid('pay'), classId: c.id, studentId: sid, period: period,
            amount: amount,
            dueDate: monthDay(period, BILL_DAY),
            paidAt: paid ? monthDay(period, day) : null,
            advance: advance,
            method: paid ? METHODS[Math.floor(r() * METHODS.length)] : '',
            note: ''
          });
        });
      });
    });
    return out;
  }

  /* ── seed ─────────────────────────────────────────────── */
  function seed() {
    var r = rng(20260905);

    var users = [
      { id: 'u_t1', role: 'teacher', name: 'Sarangerel Batbold', cn: '萨仁', email: 'sarangerel@erachinese.mn', color: '#C8443C', title: 'Senior instructor · HSK 1–3' },
      { id: 'u_t2', role: 'teacher', name: 'Li Wei', cn: '李伟', email: 'liwei@erachinese.mn', color: '#2C7A62', title: 'Native instructor · Business Chinese' },
      { id: 'u_s1', role: 'student', name: 'Anujin Erdene', cn: '安娜', email: 'anujin@student.mn', color: '#A8862A' },
      { id: 'u_s2', role: 'student', name: 'Bat-Erdene Sukh', cn: '巴特', email: 'baterdene@student.mn', color: '#4A5A6A' },
      { id: 'u_s3', role: 'student', name: 'Nomin Tuvshin', cn: '诺敏', email: 'nomin@student.mn', color: '#8A4FA0' },
      { id: 'u_s4', role: 'student', name: 'Temuulen Boldbaatar', cn: '铁木伦', email: 'temuulen@student.mn', color: '#B45A2B' },
      { id: 'u_s5', role: 'student', name: 'Solongo Dorj', cn: '索龙高', email: 'solongo@student.mn', color: '#2F6FA8' },
      { id: 'u_s6', role: 'student', name: 'Khulan Munkh', cn: '呼兰', email: 'khulan@student.mn', color: '#B03060' },
      { id: 'u_s7', role: 'student', name: 'Gantulga Baasan', cn: '甘图拉', email: 'gantulga@student.mn', color: '#3D7A4A',
        status: 'graduated', graduatedAt: offset(-9) },
      { id: 'u_s8', role: 'student', name: 'Odval Tsend', cn: '敖德娃', email: 'odval@student.mn', color: '#7A5AA8' }
    ];

    var classes = [
      { id: 'c1', name: 'HSK 1 · Foundations', cn: '初级一班', level: 'HSK 1', room: 'Room 201',
        teacherId: 'u_t1', days: 'Mon · Wed · Fri', time: '18:00', fee: 180000,
        studentIds: ['u_s1', 'u_s2', 'u_s3', 'u_s4', 'u_s5'] },
      { id: 'c2', name: 'HSK 3 · Intermediate', cn: '中级三班', level: 'HSK 3', room: 'Room 305',
        teacherId: 'u_t1', days: 'Tue · Thu', time: '19:30', fee: 220000,
        studentIds: ['u_s3', 'u_s6', 'u_s7', 'u_s8'] },
      { id: 'c3', name: 'Business Chinese', cn: '商务汉语', level: 'HSK 4+', room: 'Room 102',
        teacherId: 'u_t2', days: 'Sat', time: '10:00', fee: 320000,
        studentIds: ['u_s2', 'u_s5', 'u_s6', 'u_s8'] }
    ];

    /* [class, deck, day offset, time, homework] */
    var plan = [
      ['c1', 'd1', -18, '18:00', 'Write 5 greeting sentences and record yourself reading them aloud.'],
      ['c1', 'd2', -15, '18:00', 'Write today’s date and your class times in characters.'],
      ['c1', 'd3', -11, '18:00', 'Draw your family tree and label every member in Chinese.'],
      ['c1', 'd4', -8, '18:00', 'Write a short menu of five dishes you like.'],
      ['c1', 'd1', -4, '18:00', 'Review deck 1 and 2, then write ten sentences mixing both.'],
      ['c1', 'd2', -1, '18:00', 'Practise numbers 1–100 out loud; write 1–30 by hand.'],
      ['c1', 'd3', 0, '18:00', 'Introduce three family members in 6–8 sentences.'],
      ['c1', 'd4', 2, '18:00', ''],
      ['c1', 'd5', 5, '18:00', ''],
      ['c2', 'd5', -17, '19:30', 'Describe a trip you have taken, 120 characters.'],
      ['c2', 'd6', -13, '19:30', 'Write a dialogue between a doctor and a patient.'],
      ['c2', 'd7', -10, '19:30', 'Write a 5-day weather forecast for Ulaanbaatar.'],
      ['c2', 'd5', -6, '19:30', 'Plan a weekend trip and write the itinerary.'],
      ['c2', 'd6', -2, '19:30', 'Summarise the reading passage in your own words.'],
      ['c2', 'd7', 1, '19:30', ''],
      ['c2', 'd5', 4, '19:30', ''],
      ['c3', 'd8', -16, '10:00', 'Draft an agenda for a 30-minute project meeting.'],
      ['c3', 'd9', -12, '10:00', 'Write the key terms of a supply contract.'],
      ['c3', 'd10', -9, '10:00', 'Write a follow-up email to a client, 100–150 characters.'],
      ['c3', 'd8', -5, '10:00', 'Prepare a two-minute status report to present next class.'],
      ['c3', 'd9', 0, '10:00', 'Prepare three negotiation positions with justification.'],
      ['c3', 'd10', 3, '10:00', ''],
      ['c3', 'd8', 7, '10:00', '']
    ];

    var lessons = plan.map(function (p, i) {
      var deck = DECKS.filter(function (d) { return d.id === p[1]; })[0];
      var date = offset(p[2]);
      return {
        id: 'l' + (i + 1),
        classId: p[0],
        deckId: deck.id,
        title: deck.name,
        cn: deck.cn,
        date: date,
        time: p[3],
        topic: deck.name + ' — vocabulary, pronunciation drill and pair practice.',
        homework: p[4],
        notes: '',
        words: deckWords(deck),
        online: { provider: 'jitsi', room: 'ERA-' + p[0] + '-L' + (i + 1), url: '' },
        status: date < today() ? 'completed' : 'scheduled'
      };
    });

    /* attendance: { lessonId: { studentId: status } } */
    var attendance = {};
    lessons.forEach(function (l) {
      if (l.status !== 'completed') return;
      var cls = classes.filter(function (c) { return c.id === l.classId; })[0];
      var marks = {};
      cls.studentIds.forEach(function (sid) {
        var x = r();
        marks[sid] = x < 0.82 ? 'present' : x < 0.90 ? 'late' : x < 0.96 ? 'absent' : 'excused';
      });
      attendance[l.id] = marks;
    });

    /* homework submissions */
    var submissions = [];
    lessons.forEach(function (l) {
      if (l.status !== 'completed' || !l.homework) return;
      var cls = classes.filter(function (c) { return c.id === l.classId; })[0];
      cls.studentIds.forEach(function (sid) {
        if (r() > 0.75) return;                       // not everyone hands in
        var graded = r() < 0.8;
        submissions.push({
          id: uid('sub'),
          lessonId: l.id,
          studentId: sid,
          text: 'Completed the assignment for “' + l.title + '”. Attached my written work and practised the new words aloud.',
          submittedAt: l.date,
          grade: graded ? Math.round(66 + r() * 32) : null,
          feedback: graded ? 'Good use of the new vocabulary. Watch tone marks on the third-tone words.' : ''
        });
      });
    });

    /* skill assessment per student per class */
    var progress = [];
    classes.forEach(function (c) {
      c.studentIds.forEach(function (sid) {
        var base = 52 + r() * 34;
        progress.push({
          id: uid('pg'), classId: c.id, studentId: sid,
          speaking: Math.round(base + (r() - 0.5) * 16),
          listening: Math.round(base + (r() - 0.5) * 16),
          reading: Math.round(base + (r() - 0.5) * 16),
          writing: Math.round(base + (r() - 0.5) * 16),
          updated: offset(-Math.round(r() * 12))
        });
      });
    });

    var payments = seedPayments(classes, r);

    return {
      version: 3,
      school: {
        name: 'ERA CHINESE', cn: '时代汉语',
        /* Shown in the public header and footer. Replace these with the
           school's real details — they are the only invented values here. */
        phone: '7710-1251 (1)', phone2: '7710-1251 (2)',
        email: 'sales@erachinese.mn', support: 'support@erachinese.mn',
        address: 'Sukhbaatar District, 1st khoroo, Ulaanbaatar',
        facebook: 'https://facebook.com/erachinese',
        instagram: 'https://instagram.com/erachinese'
      },
      users: users,
      classes: classes,
      decks: DECKS,
      lessons: lessons,
      attendance: attendance,
      submissions: submissions,
      progress: progress,
      payments: payments,
      news: seedNews()
    };
  }

  /* ── news ──
     The school's noticeboard. A draft is written but not out yet; publishing is
     what puts it on the sign-in page, where anyone who has not signed in can
     read it. Pinned items lead the board however old they are. */
  function seedNews() {
    return [
      { id: 'n1', title: 'Autumn intake is open', cn: '秋季招生开始',
        body: 'Registration for the autumn HSK 1 and HSK 3 groups is open until the end of the month. ' +
              'Classes run three evenings a week and start at 18:00. Come to reception or write to us to hold a place.',
        date: offset(-3), pinned: true, published: true, authorId: 'u_t1' },
      { id: 'n2', title: 'HSK exam dates announced', cn: 'HSK 考试日期公布',
        body: 'The next official HSK sitting is in six weeks. Levels 1 to 4 are held on the Saturday, ' +
              'levels 5 and 6 on the Sunday. Tell your teacher which level you intend to sit so we can prepare you for it.',
        date: offset(-8), pinned: false, published: true, authorId: 'u_t2' },
      { id: 'n3', title: 'Mid-autumn festival — no classes', cn: '中秋节放假',
        body: 'The school is closed for the festival and every lesson that day is moved a week on. ' +
              'Your timetable already shows the new dates.',
        date: offset(-15), pinned: false, published: true, authorId: 'u_t1' },
      { id: 'n4', title: 'New Business Chinese materials', cn: '新商务汉语教材',
        body: 'Draft — waiting on the printer before this goes out.',
        date: offset(-1), pinned: false, published: false, authorId: 'u_t2' }
    ];
  }

  /* A school saved before tuition existed keeps its classes, lessons and marks —
     it only gains a fee per class and the invoices that follow from it. */
  function migrate(d) {
    if (d.version === 2) {
      var r = rng(20260905);
      d.classes.forEach(function (c) { if (c.fee == null) c.fee = DEFAULT_FEE; });
      d.payments = seedPayments(d.classes, r);
      d.version = 3;
    }
    if (!d.payments) d.payments = [];
    d.payments.forEach(function (p) { if (p.advance == null) p.advance = 0; });
    /* a school saved before the noticeboard existed gets the seeded one, so the
       feature is not an empty page on first sight */
    if (!d.news) d.news = seedNews();
    /* Accounts saved before sign-in existed have no password. Rather than lock
       the school's own staff out of it, each gets the starting password, which
       the README names and everyone should change. */
    d.users.forEach(function (u) {
      if (!u.pass) global.Auth.setPassword(u, START_PASSWORD);
    });
    return d;
  }

  /* ── public store ─────────────────────────────────────── */
  var Store = {
    data: null,

    load: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (parsed && (parsed.version === 2 || parsed.version === 3)) {
            var was = parsed.version;
            this.data = migrate(parsed);
            if (this.data.version !== was) this.save();
            return this.data;
          }
        } catch (e) { /* corrupt — reseed */ }
      }
      this.data = migrate(seed());
      this.save();
      return this.data;
    },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* quota / private mode */ }
      if (CH) { try { CH.postMessage({ t: 'sync', at: Date.now() }); } catch (e) {} }
    },

    /* Pulls what another tab just wrote — a mark, a new lesson, a payment —
       so this tab's next render shows it without the user refreshing. */
    reload: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { return; }
      if (!raw) return;
      try {
        var parsed = JSON.parse(raw);
        if (parsed && (parsed.version === 2 || parsed.version === 3)) this.data = migrate(parsed);
      } catch (e) { /* corrupt write mid-flight — keep what we have */ }
      notify();
    },

    onChange: function (fn) { listeners.push(fn); },

    initSync: function () {
      var self = this;
      try {
        CH = new BroadcastChannel('era-chinese-store');
        CH.onmessage = function () { self.reload(); };
      } catch (e) { CH = null; }
      global.addEventListener('storage', function (ev) {
        if (ev.key === KEY) self.reload();
      });
    },

    reset: function () {
      this.data = migrate(seed());
      this.save();
      return this.data;
    },

    /* ── lookups ── */
    user: function (id) { return this.data.users.filter(function (u) { return u.id === id; })[0] || null; },
    klass: function (id) { return this.data.classes.filter(function (c) { return c.id === id; })[0] || null; },
    lesson: function (id) { return this.data.lessons.filter(function (l) { return l.id === id; })[0] || null; },
    teachers: function () { return this.data.users.filter(function (u) { return u.role === 'teacher'; }); },
    /* email is the sign-in name, so it is matched case-insensitively and must
       be unique across the whole school, students and staff alike */
    userByEmail: function (email) {
      var e = String(email || '').trim().toLowerCase();
      if (!e) return null;
      return this.data.users.filter(function (u) {
        return String(u.email || '').toLowerCase() === e;
      })[0] || null;
    },
    students: function () { return this.data.users.filter(function (u) { return u.role === 'student'; }); },

    /* ── who is still studying ──
       A student who finishes stays on the roster of every class they sat in —
       that is what keeps their registers, marks and invoices reachable. Only
       their status changes, and the rest of the app reads it through these
       three: activeStudents() for lists, rosterOf() for a class as it stands
       today, registerOf() for one lesson's register. A missing status means
       active, so a school saved before graduation existed needs no migration. */
    isGraduated: function (u) {
      var x = typeof u === 'string' ? this.user(u) : u;
      return !!(x && x.status === 'graduated');
    },
    activeStudents: function () {
      var self = this;
      return this.students().filter(function (u) { return !self.isGraduated(u); });
    },
    graduates: function () {
      var self = this;
      return this.students().filter(function (u) { return self.isGraduated(u); });
    },
    /* the class as it stands today — graduates dropped */
    rosterOf: function (cid) {
      var self = this;
      var c = this.klass(cid);
      return c ? c.studentIds.filter(function (sid) { return !self.isGraduated(sid); }) : [];
    },
    /* Who belongs on one lesson's register: everyone still studying, plus
       anyone already marked on it. A graduate's past registers stay whole
       while new lessons stop asking about them. */
    registerOf: function (lesson) {
      var self = this;
      var c = this.klass(lesson.classId);
      if (!c) return [];
      var marks = this.data.attendance[lesson.id] || {};
      return c.studentIds.filter(function (sid) { return !self.isGraduated(sid) || marks[sid]; });
    },

    /* ── the noticeboard ──
       news() is everything, drafts included — the teacher's own list.
       published() is what the school actually shows: pinned first, then
       newest, which is the order both the sign-in page and the students read. */
    newsItem: function (id) {
      return (this.data.news || []).filter(function (n) { return n.id === id; })[0] || null;
    },
    news: function () { return (this.data.news || []).slice().sort(byNews); },
    published: function () {
      return (this.data.news || []).filter(function (n) { return n.published; }).sort(byNews);
    },
    addNews: function (data) {
      var n = {
        id: uid('n'), title: data.title, cn: data.cn || '', body: data.body || '',
        date: data.date || today(), pinned: !!data.pinned, published: !!data.published,
        authorId: data.authorId || ''
      };
      this.data.news = this.data.news || [];
      this.data.news.unshift(n);
      this.save();
      return n;
    },
    updateNews: function (id, data) {
      var n = this.newsItem(id);
      if (!n) return null;
      ['title', 'cn', 'body', 'date'].forEach(function (k) { if (data[k] != null) n[k] = data[k]; });
      if (data.pinned != null) n.pinned = !!data.pinned;
      if (data.published != null) n.published = !!data.published;
      this.save();
      return n;
    },
    deleteNews: function (id) {
      this.data.news = (this.data.news || []).filter(function (n) { return n.id !== id; });
      this.save();
    },

    classesOfTeacher: function (tid) {
      return this.data.classes.filter(function (c) { return c.teacherId === tid; });
    },
    classesOfStudent: function (sid) {
      return this.data.classes.filter(function (c) { return c.studentIds.indexOf(sid) > -1; });
    },
    lessonsOfClass: function (cid) {
      return this.data.lessons.filter(function (l) { return l.classId === cid; }).sort(byDate);
    },
    lessonsOfTeacher: function (tid) {
      var ids = this.classesOfTeacher(tid).map(function (c) { return c.id; });
      return this.data.lessons.filter(function (l) { return ids.indexOf(l.classId) > -1; }).sort(byDate);
    },
    lessonsOfStudent: function (sid) {
      var ids = this.classesOfStudent(sid).map(function (c) { return c.id; });
      return this.data.lessons.filter(function (l) { return ids.indexOf(l.classId) > -1; }).sort(byDate);
    },
    submission: function (lessonId, studentId) {
      return this.data.submissions.filter(function (s) {
        return s.lessonId === lessonId && s.studentId === studentId;
      })[0] || null;
    },
    progressOf: function (classId, studentId) {
      return this.data.progress.filter(function (p) {
        return p.classId === classId && p.studentId === studentId;
      })[0] || null;
    },
    /* Which lesson of the course is this — "Lesson 5 of 12" — counted by date
       within its own class, so inserting a lesson renumbers the rest. */
    lessonNo: function (lesson) {
      var list = this.lessonsOfClass(lesson.classId);
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === lesson.id) return { n: i + 1, total: list.length };
      }
      return { n: 0, total: list.length };
    },

    /* ── mutations ── */
    addClass: function (data) {
      var c = {
        id: uid('c'), name: data.name, cn: data.cn || '', level: data.level || 'HSK 1',
        room: data.room || '', teacherId: data.teacherId, days: data.days || '',
        time: data.time || '18:00', studentIds: (data.studentIds || []).slice(),
        fee: data.fee == null ? DEFAULT_FEE : Math.max(0, Math.round(data.fee))
      };
      this.data.classes.push(c);
      this.save();
      return c;
    },
    updateClass: function (id, data) {
      var c = this.klass(id);
      if (!c) return null;
      ['name', 'cn', 'level', 'room', 'days', 'time'].forEach(function (k) {
        if (data[k] != null) c[k] = data[k];
      });
      if (data.fee != null && !isNaN(+data.fee)) c.fee = Math.max(0, Math.round(+data.fee));
      this.save();
      return c;
    },
    deleteClass: function (id) {
      var lessonIds = this.lessonsOfClass(id).map(function (l) { return l.id; });
      var self = this;
      lessonIds.forEach(function (lid) { delete self.data.attendance[lid]; });
      this.data.lessons = this.data.lessons.filter(function (l) { return l.classId !== id; });
      this.data.submissions = this.data.submissions.filter(function (s) { return lessonIds.indexOf(s.lessonId) < 0; });
      this.data.progress = this.data.progress.filter(function (p) { return p.classId !== id; });
      this.data.payments = this.data.payments.filter(function (p) { return p.classId !== id; });
      this.data.classes = this.data.classes.filter(function (c) { return c.id !== id; });
      this.save();
    },
    addStudent: function (data) {
      var colors = ['#C8443C', '#2C7A62', '#A8862A', '#4A5A6A', '#8A4FA0', '#B45A2B', '#2F6FA8', '#B03060', '#3D7A4A', '#7A5AA8'];
      var u = {
        id: uid('u'), role: 'student', name: data.name, cn: data.cn || '',
        email: data.email || '', color: colors[this.data.users.length % colors.length],
        status: 'active'
      };
      this.data.users.push(u);
      this.save();
      return u;
    },

    /* ── accounts ──
       Two doors, deliberately different. A student opens their own account:
       they are the public, and making them wait on staff to be let in is how a
       school loses them. Staff cannot self-register at all — a teacher account
       reads every register, grade and invoice in the school, so it is only ever
       created from inside by someone already holding one.

       Passwords never touch this file in the clear; Auth salts and hashes them.
       See auth.js for what that is and is not worth without a server. */
    registerStudent: function (data) {
      var A = global.Auth;
      var name = String(data.name || '').trim();
      var email = String(data.email || '').trim();
      if (!name) return { error: 'Enter your name' };
      var bad = A.checkEmail(email) || A.checkPassword(data.password);
      if (bad) return { error: bad };
      if (data.password !== data.confirm) return { error: 'The two passwords do not match' };
      if (this.userByEmail(email)) return { error: 'An account with that email already exists' };

      var u = this.addStudent({ name: name, cn: data.cn || '', email: email });
      u.email = email;
      u.joinedAt = today();
      A.setPassword(u, data.password);
      this.save();
      return { user: u };
    },

    /* staff, created from inside by a teacher who is already signed in */
    addTeacher: function (data) {
      var A = global.Auth;
      var colors = ['#C8443C', '#2C7A62', '#A8862A', '#4A5A6A', '#8A4FA0'];
      var name = String(data.name || '').trim();
      var email = String(data.email || '').trim();
      if (!name) return { error: 'Enter your name' };
      var bad = A.checkEmail(email) || A.checkPassword(data.password);
      if (bad) return { error: bad };
      if (this.userByEmail(email)) return { error: 'An account with that email already exists' };

      var u = {
        id: uid('u'), role: 'teacher', name: name, cn: data.cn || '', email: email,
        title: data.title || '', color: colors[this.data.users.length % colors.length],
        joinedAt: today()
      };
      A.setPassword(u, data.password);
      this.data.users.push(u);
      this.save();
      return { user: u };
    },

    /* One message for "no such email" and "wrong password" alike — telling a
       stranger which of the two they got right tells them who has an account. */
    signIn: function (email, password) {
      var u = this.userByEmail(email);
      if (!u || !global.Auth.verify(u, password)) return { error: 'Wrong email or password' };
      return { user: u };
    },

    setPassword: function (id, password) {
      var u = this.user(id);
      if (!u) return { error: 'Wrong email or password' };
      var bad = global.Auth.checkPassword(password);
      if (bad) return { error: bad };
      global.Auth.setPassword(u, password);
      this.save();
      return { user: u };
    },
    /* Finishing is not leaving: the roster entry, the registers, the marks and
       any unsettled invoice all stay exactly where they are. Only new billing
       and new registers pass them by. */
    graduate: function (sid) {
      var u = this.user(sid);
      if (!u || u.role !== 'student') return null;
      u.status = 'graduated';
      u.graduatedAt = today();
      this.save();
      return u;
    },
    reactivate: function (sid) {
      var u = this.user(sid);
      if (!u || u.role !== 'student') return null;
      u.status = 'active';
      delete u.graduatedAt;
      this.save();
      return u;
    },
    enroll: function (classId, studentId) {
      var c = this.klass(classId);
      if (c && c.studentIds.indexOf(studentId) < 0) { c.studentIds.push(studentId); this.save(); }
    },
    unenroll: function (classId, studentId) {
      var c = this.klass(classId);
      if (!c) return;
      c.studentIds = c.studentIds.filter(function (id) { return id !== studentId; });
      this.data.progress = this.data.progress.filter(function (p) {
        return !(p.classId === classId && p.studentId === studentId);
      });
      /* unpaid invoices die with the enrolment; settled ones stay on the books */
      this.data.payments = this.data.payments.filter(function (p) {
        return !(p.classId === classId && p.studentId === studentId && !p.paidAt);
      });
      this.save();
    },

    /* ── tuition ── */
    invoice: function (id) {
      return this.data.payments.filter(function (p) { return p.id === id; })[0] || null;
    },
    invoicesOfClass: function (cid, period) {
      return this.data.payments.filter(function (p) {
        return p.classId === cid && (!period || p.period === period);
      });
    },
    invoicesOfTeacher: function (tid, period) {
      var ids = this.classesOfTeacher(tid).map(function (c) { return c.id; });
      return this.data.payments.filter(function (p) {
        return ids.indexOf(p.classId) > -1 && (!period || p.period === period);
      }).sort(byInvoice);
    },
    invoicesOfStudent: function (sid, classId) {
      return this.data.payments.filter(function (p) {
        return p.studentId === sid && (!classId || p.classId === classId);
      }).sort(byInvoice);
    },
    /* paid · overdue · partial · due — nothing is stored, the dates and the
       advance decide. Overdue wins over partial: it is the one to chase. */
    payStatus: function (p) {
      if (!p) return null;
      if (p.paidAt) return 'paid';
      if (p.dueDate < today()) return 'overdue';
      return (p.advance || 0) > 0 ? 'partial' : 'due';
    },
    /* what is still owed on an invoice — nothing once it is settled */
    balanceOf: function (p) {
      if (!p || p.paidAt) return 0;
      return Math.max(0, p.amount - (p.advance || 0));
    },
    /* Every period that carries an invoice, newest first, current month always
       included so the teacher can bill it before anything exists. */
    periodsOfTeacher: function (tid) {
      var seen = {}, out = [];
      this.invoicesOfTeacher(tid).forEach(function (p) {
        if (!seen[p.period]) { seen[p.period] = 1; out.push(p.period); }
      });
      if (!seen[thisMonth()]) out.push(thisMonth());
      return out.sort().reverse();
    },
    /* An advance is money the school already holds, so it counts as collected
       and only the balance is outstanding. */
    totals: function (rows) {
      var self = this;
      var t = { billed: 0, collected: 0, outstanding: 0, overdue: 0, overdueCount: 0,
                advance: 0, advanceCount: 0, count: rows.length };
      rows.forEach(function (p) {
        t.billed += p.amount;
        if (p.paidAt) { t.collected += p.amount; return; }
        var adv = p.advance || 0;
        var bal = self.balanceOf(p);
        if (adv > 0) { t.collected += adv; t.advance += adv; t.advanceCount++; }
        t.outstanding += bal;
        if (self.payStatus(p) === 'overdue') { t.overdue += bal; t.overdueCount++; }
      });
      return t;
    },

    addInvoice: function (data) {
      var c = this.klass(data.classId);
      var p = {
        id: uid('pay'), classId: data.classId, studentId: data.studentId,
        period: data.period || thisMonth(),
        amount: Math.max(0, Math.round(+data.amount || (c && c.fee) || DEFAULT_FEE)),
        dueDate: data.dueDate || monthDay(data.period || thisMonth(), BILL_DAY),
        paidAt: data.paidAt || null, advance: 0,
        method: data.method || '', note: data.note || ''
      };
      if (!p.paidAt) p.advance = Math.max(0, Math.min(p.amount, Math.round(+data.advance || 0)));
      this.data.payments.push(p);
      this.save();
      return p;
    },
    updateInvoice: function (id, data) {
      var p = this.invoice(id);
      if (!p) return null;
      ['period', 'dueDate', 'method', 'note'].forEach(function (k) {
        if (data[k] != null) p[k] = data[k];
      });
      if (data.amount != null && !isNaN(+data.amount)) p.amount = Math.max(0, Math.round(+data.amount));
      if (data.advance != null && !isNaN(+data.advance)) p.advance = Math.max(0, Math.round(+data.advance));
      if (p.paidAt) p.advance = 0;
      p.advance = Math.min(p.advance || 0, p.amount);
      this.save();
      return p;
    },
    setPaid: function (id, opts) {
      var p = this.invoice(id);
      if (!p) return null;
      opts = opts || {};
      p.paidAt = opts.paidAt || today();
      p.method = opts.method || p.method || METHODS[0];
      p.advance = 0;                                  /* the balance is settled */
      if (opts.note != null) p.note = opts.note;
      this.save();
      return p;
    },
    setUnpaid: function (id) {
      var p = this.invoice(id);
      if (!p) return null;
      p.paidAt = null; p.method = ''; p.advance = 0;
      this.save();
      return p;
    },
    /* Money received against an unpaid invoice. Anything that covers the whole
       amount settles it outright rather than sitting there as an advance. */
    addPayment: function (id, amount, opts) {
      var p = this.invoice(id);
      if (!p) return null;
      opts = opts || {};
      var got = Math.max(0, Math.round(+amount || 0));
      if (!got) return p;
      var adv = (p.advance || 0) + got;
      if (adv >= p.amount) return this.setPaid(id, opts);
      p.advance = adv;
      p.method = opts.method || p.method || METHODS[0];
      if (opts.note != null) p.note = opts.note;
      this.save();
      return p;
    },
    setAdvance: function (id, amount) {
      var p = this.invoice(id);
      if (!p) return null;
      p.advance = Math.max(0, Math.min(p.amount, Math.round(+amount || 0)));
      this.save();
      return p;
    },
    deleteInvoice: function (id) {
      this.data.payments = this.data.payments.filter(function (p) { return p.id !== id; });
      this.save();
    },
    /* Bill a whole month in one go: every enrolled student who has no invoice
       for that period gets one at the class fee. Already-billed students are
       left alone, so pressing it twice changes nothing. Graduates are past
       billing — what they already owe stays on the books regardless. */
    billPeriod: function (classIds, period) {
      var self = this;
      var made = 0;
      classIds.forEach(function (cid) {
        var c = self.klass(cid);
        if (!c) return;
        var billed = {};
        self.invoicesOfClass(cid, period).forEach(function (p) { billed[p.studentId] = 1; });
        self.rosterOf(cid).forEach(function (sid) {
          if (billed[sid]) return;
          self.data.payments.push({
            id: uid('pay'), classId: cid, studentId: sid, period: period,
            amount: c.fee == null ? DEFAULT_FEE : c.fee,
            dueDate: monthDay(period, BILL_DAY),
            paidAt: null, advance: 0, method: '', note: ''
          });
          made++;
        });
      });
      if (made) this.save();
      return made;
    },

    mark: function (lessonId, studentId) {
      var a = this.data.attendance[lessonId];
      return a ? (a[studentId] || null) : null;
    },

    /* ── attendance stats ── */
    attendanceOfStudent: function (sid, classId) {
      var self = this;
      var rows = [];
      this.lessonsOfStudent(sid).forEach(function (l) {
        if (classId && l.classId !== classId) return;
        var m = self.mark(l.id, sid);
        if (m) rows.push({ lesson: l, status: m });
      });
      return rows;
    },
    attendanceRate: function (rows) {
      if (!rows.length) return null;
      var ok = rows.filter(function (r) { return r.status === 'present' || r.status === 'late'; }).length;
      return Math.round(ok / rows.length * 100);
    },

    METHODS: METHODS, DEFAULT_FEE: DEFAULT_FEE, BILL_DAY: BILL_DAY,
    LEVELS: ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'HSK 4+', 'Conversation', 'Business'],
    WEEKDAYS: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],

    uid: uid, today: today, offset: offset, isoDay: isoDay,
    thisMonth: thisMonth, monthOffset: monthOffset, monthDay: monthDay
  };

  /* newest period first, then by due date — the order the teacher reads them in */
  function byInvoice(a, b) {
    return a.period === b.period ? a.dueDate.localeCompare(b.dueDate) : b.period.localeCompare(a.period);
  }

  function byDate(a, b) {
    return a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date);
  }

  /* pinned notices lead, then the newest — the order a noticeboard is read in */
  function byNews(a, b) {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.date.localeCompare(a.date);
  }

  global.Store = Store;
  global.byDate = byDate;
})(window);
