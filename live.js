/* ERA Chinese — the online classroom.

   Two halves:

   Live   — shared room state in its own localStorage key, broadcast to every
            other tab of this browser, so the teacher's board, chat, quiz and
            whiteboard appear on the students' screens as they happen.
   LiveView — the page. It mounts ONCE and then refreshes only the regions that
            changed, because re-rendering the page would tear down the video
            iframe and the whiteboard canvas mid-lesson. */
(function (global) {
  'use strict';
  var U, S;
  global.Actions = global.Actions || {};
  var A = global.Actions;

  /* ══ shared room state ═══════════════════════════════ */
  var KEY = 'era-chinese-lite/live';
  var CH = null;
  var listeners = [];

  /* ── the room, across devices ──
     Rooms used to live in localStorage and a BroadcastChannel, which reach
     other tabs of the same browser and nothing further. Once the school moved
     to one shared database that stopped being enough: a teacher opening the
     room on a laptop was invisible to a student on a phone, which is most of
     what an online lesson is for.

     So when Supabase is configured the room goes there too — but split three
     ways, because the room and the people in it are not owned by the same
     person. The teacher owns the room: whether it is open, what is on the
     whiteboard, the timer. Each person owns only their own presence and their
     own messages. That is what lets a student put a hand up without also
     being able to end the lesson, and it is enforced by the policies in
     schema.sql, not by this file being polite. */
  var Sync = {
    on: function () { return !!(global.Cloud && global.Cloud.client); },
    c: function () { return global.Cloud.client; },

    roomRow: function (lessonId, r, classId) {
      return {
        lesson_id: lessonId, class_id: classId,
        active: !!r.active, host: r.host || null,
        provider: r.provider || 'jitsi', room_name: r.roomName || '',
        url: r.url || '', started_at: r.startedAt || null,
        board: r.board || {}, timer: r.timer || null,
        updated_at: new Date().toISOString()
      };
    },

    /* the teacher's half */
    pushRoom: function (lessonId) {
      if (!this.on()) return;
      var r = Live.rooms[lessonId];
      if (!r) return;
      var lesson = global.Store.lesson(lessonId);
      if (!lesson) return;
      this.c().from('live_rooms')
        .upsert([this.roomRow(lessonId, r, lesson.classId)], { onConflict: 'lesson_id' })
        .then(function (res) {
          if (res && res.error && global.console) console.error('live room:', res.error.message);
        });
    },

    /* everyone's own half */
    pushPresence: function (lessonId, user, hand) {
      if (!this.on()) return;
      this.c().from('live_presence').upsert([{
        lesson_id: lessonId, user_id: user.id, name: user.name || '',
        role: user.role || 'student', hand: !!hand, at: Date.now()
      }], { onConflict: 'lesson_id,user_id' }).then(function () {});
    },

    dropPresence: function (lessonId, userId) {
      if (!this.on()) return;
      this.c().from('live_presence').delete()
        .eq('lesson_id', lessonId).eq('user_id', userId).then(function () {});
    },

    pushChat: function (lessonId, msg) {
      if (!this.on()) return;
      this.c().from('live_chat').upsert([{
        id: msg.id, lesson_id: lessonId, user_id: msg.from,
        name: msg.name || '', role: msg.role || 'student',
        text: msg.text || '', at: msg.at || Date.now()
      }], { onConflict: 'id' }).then(function () {});
    },

    /* Read back whatever this person is allowed to see. A student asking for a
       room in a class they are not in gets nothing at all — the database does
       not tell them it exists. */
    pull: function () {
      if (!this.on()) return Promise.resolve(null);
      var c = this.c();
      return Promise.all([
        c.from('live_rooms').select('*'),
        c.from('live_presence').select('*'),
        c.from('live_chat').select('*')
      ]).then(function (res) {
        var rooms = {};
        (res[0].data || []).forEach(function (row) {
          rooms[row.lesson_id] = {
            active: !!row.active, startedAt: row.started_at || null, host: row.host || null,
            provider: row.provider || 'jitsi', roomName: row.room_name || '',
            url: row.url || '',
            board: row.board || { mode: 'idle', i: 0, reveal: false, text: '', strokes: [], quiz: null, picked: '' },
            timer: row.timer || null,
            people: {}, hands: {}, chat: []
          };
        });
        (res[1].data || []).forEach(function (row) {
          var r = rooms[row.lesson_id];
          if (!r) return;
          r.people[row.user_id] = { name: row.name, role: row.role, at: row.at };
          if (row.hand) r.hands[row.user_id] = true;
        });
        (res[2].data || []).sort(function (a, b) { return (a.at || 0) - (b.at || 0); })
          .forEach(function (row) {
            var r = rooms[row.lesson_id];
            if (!r) return;
            r.chat.push({ id: row.id, from: row.user_id, name: row.name,
                          role: row.role, text: row.text, at: row.at });
          });
        return rooms;
      });
    },

    watch: function (onChange) {
      if (!this.on() || this.channel) return;
      var timer = null;
      var ch = this.c().channel('live');
      ['live_rooms', 'live_presence', 'live_chat'].forEach(function (t) {
        ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, function () {
          /* a whiteboard stroke is a row; coalesce or the page redraws
             faster than anyone can draw */
          if (timer) return;
          timer = setTimeout(function () { timer = null; onChange(); }, 200);
        });
      });
      ch.subscribe();
      this.channel = ch;
    },
    channel: null
  };

  var Live = {
    rooms: {},
    sync: Sync,

    /* Cloud mode: take the rooms the database is willing to show us. */
    pull: function () {
      var self = this;
      return Sync.pull().then(function (rooms) {
        if (!rooms) return null;
        self.rooms = rooms;
        notify();
        return rooms;
      });
    },

    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        this.rooms = raw ? JSON.parse(raw) : {};
      } catch (e) { this.rooms = {}; }
      return this.rooms;
    },

    save: function (silent) {
      try { localStorage.setItem(KEY, JSON.stringify(this.rooms)); } catch (e) { /* quota */ }
      if (!silent && CH) { try { CH.postMessage({ t: 'sync', at: Date.now() }); } catch (e) {} }
      if (!silent) notify();
    },

    /* Write and tell the other tabs, but do NOT re-render this one — used while
       the teacher is typing or drawing, so the caret and the stroke survive. */
    saveRemote: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.rooms)); } catch (e) { /* quota */ }
      if (CH) { try { CH.postMessage({ t: 'sync', at: Date.now() }); } catch (e) {} }
    },

    room: function (lessonId) { return this.rooms[lessonId] || null; },

    /* ── who is allowed in ──
       Every way into a room asks this: the router, the page, the join button,
       the heartbeat and the chat. Before it existed the only check anywhere
       was that a student had not graduated, so typing #/s/live/<any lesson>
       walked into any class in the school.

       Returns null when the person may join, or the reason they may not, so
       the caller can say something better than a blank page.

       In cloud mode the database refuses the same people independently — a
       student cannot even read a room row for a class they are not in. This
       is here to explain the refusal, not to be the only thing enforcing it. */
    mayJoin: function (lessonId, user) {
      var S = global.Store;
      if (!user) return 'Sign in first';

      var lesson = S.lesson(lessonId);
      if (!lesson) return 'That lesson does not exist';

      /* Staff run the school and cover for each other, so any teacher may
         join any room. Students are held to their own class. */
      if (user.role === 'teacher') return null;

      if (S.isGraduated(user)) return 'Your course is finished';

      var enrolled = S.classesOfStudent(user.id).some(function (c) {
        return c.id === lesson.classId;
      });
      if (!enrolled) return 'You are not in this class';

      var r = this.rooms[lessonId];
      if (!r || !r.active) return 'The lesson has not started yet';
      return null;
    },

    /* the same question, as a yes or no */
    canJoin: function (lessonId, user) { return this.mayJoin(lessonId, user) === null; },

    /* the teacher opens the room */
    start: function (lesson, teacher) {
      var on = lesson.online || {};
      this.rooms[lesson.id] = this.rooms[lesson.id] || {};
      var r = this.rooms[lesson.id];
      r.active = true;
      r.startedAt = r.startedAt || Date.now();
      r.host = teacher.id;
      r.provider = on.provider || 'jitsi';
      r.roomName = on.room || ('ERA-' + lesson.classId + '-' + lesson.id);
      r.url = on.url || '';
      r.board = r.board || { mode: 'idle', i: 0, reveal: false, text: '', strokes: [], quiz: null, picked: '' };
      r.chat = r.chat || [];
      r.people = r.people || {};
      r.hands = r.hands || {};
      r.timer = r.timer || null;
      this.save();
      Sync.pushRoom(lesson.id);
      return r;
    },

    end: function (lessonId) {
      var r = this.rooms[lessonId];
      if (!r) return;
      r.active = false;
      r.people = {};
      r.hands = {};
      r.timer = null;
      this.save();
      Sync.pushRoom(lessonId);
      /* everyone's presence goes with the room; each row is theirs to remove,
         so the teacher clears the ones RLS lets them and the rest lapse on
         the staleness cut when nobody heartbeats them any more */
      if (Sync.on()) {
        Sync.c().from('live_presence').delete().eq('lesson_id', lessonId).then(function () {});
      }
    },

    /* presence — refreshed by a heartbeat, stale entries are dropped on read */
    beat: function (lessonId, user) {
      var r = this.rooms[lessonId];
      if (!r || !r.active) return;
      /* presence is a claim to be in the room, so it is checked like any other */
      if (!this.canJoin(lessonId, user)) return;
      r.people = r.people || {};
      r.people[user.id] = { name: user.name, role: user.role, at: Date.now() };
      this.saveRemote();
      Sync.pushPresence(lessonId, user, !!(r.hands || {})[user.id]);
    },
    leave: function (lessonId, userId) {
      var r = this.rooms[lessonId];
      if (!r || !r.people) return;
      delete r.people[userId];
      if (r.hands) delete r.hands[userId];
      this.save();
      Sync.dropPresence(lessonId, userId);
    },
    present: function (lessonId) {
      var r = this.rooms[lessonId];
      if (!r || !r.people) return [];
      var cut = Date.now() - 35000;
      return Object.keys(r.people)
        .filter(function (id) { return r.people[id].at > cut; })
        .map(function (id) { return { id: id, name: r.people[id].name, role: r.people[id].role }; });
    },

    patchBoard: function (lessonId, patch) {
      var r = this.rooms[lessonId];
      if (!r) return;
      r.board = r.board || {};
      Object.keys(patch).forEach(function (k) { r.board[k] = patch[k]; });
      this.save();
      Sync.pushRoom(lessonId);
    },

    say: function (lessonId, user, text) {
      var r = this.rooms[lessonId];
      if (!r) return;
      /* speaking in a room is being in it */
      if (!this.canJoin(lessonId, user)) return;
      r.chat = r.chat || [];
      var msg = { id: S.uid('m'), from: user.id, name: user.name, role: user.role, text: text, at: Date.now() };
      r.chat.push(msg);
      if (r.chat.length > 200) r.chat = r.chat.slice(-200);
      this.save();
      Sync.pushChat(lessonId, msg);
    },

    hand: function (lessonId, userId, up) {
      var r = this.rooms[lessonId];
      if (!this.canJoin(lessonId, global.Store.user(userId))) return;
      if (!r) return;
      r.hands = r.hands || {};
      if (up) r.hands[userId] = Date.now(); else delete r.hands[userId];
      this.save();
      /* a raised hand rides on the person's own presence row, which is the
         only row they are allowed to write */
      var who = global.Store.user(userId);
      if (who) Sync.pushPresence(lessonId, who, up);
    },

    /* the meeting URL the iframe and the "open in a tab" button both use */
    meetUrl: function (r, displayName) {
      if (!r) return '';
      if (r.provider === 'custom') return r.url || '';
      if (r.provider === 'none') return '';
      var base = 'https://meet.jit.si/' + encodeURIComponent(r.roomName);
      var hash = '#config.prejoinConfig.enabled=false' +
        '&config.disableDeepLinking=true' +
        (displayName ? '&userInfo.displayName=' + encodeURIComponent('"' + displayName + '"') : '');
      return base + hash;
    },

    onChange: function (fn) { listeners.push(fn); },
    init: function () {
      this.load();
      try {
        CH = new BroadcastChannel('era-chinese-live');
        CH.onmessage = function () { Live.load(); notify(); };
      } catch (e) { CH = null; }
      global.addEventListener('storage', function (ev) {
        if (ev.key === KEY) { Live.load(); notify(); }
      });
    }
  };

  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  /* ══ the classroom page ══════════════════════════════ */
  var mounted = null;   /* {lessonId, role} */
  var heartbeat = null;
  var ticker = null;

  var LiveView = {
    init: function () { U = global.UI; S = global.Store; },

    /* Called by the router. Builds the skeleton once per lesson, then leaves
       the video pane and the whiteboard alone for the rest of the lesson. */
    page: function (lessonId) {
      return '<div id="liveRoot" data-lesson="' + U.esc(lessonId) + '"></div>';
    },

    mount: function (lessonId) {
      var root = document.getElementById('liveRoot');
      if (!root) return;
      var lesson = S.lesson(lessonId);
      var user = S.user(App.session.userId);
      if (!lesson) { root.innerHTML = '<div class="card">' + U.empty('alert', T('Lesson not found')) + '</div>'; return; }

      /* The last gate before the room is drawn. The router turns most of these
         away first, but a room that ends while somebody is walking in reaches
         here, and so does anything the router has not thought of. */
      var why = Live.mayJoin(lessonId, user);
      if (why) {
        root.innerHTML = '<div class="card"><div class="card__b" style="text-align:center;padding:40px 24px">' +
          '<div class="av" style="background:var(--amber);margin:0 auto 14px">' + U.icon('lock') + '</div>' +
          '<h3 style="font-size:18px">' + T('You cannot join this lesson') + '</h3>' +
          '<p class="muted" style="margin:8px auto 0;max-width:42ch">' + U.esc(T(why)) + '</p>' +
          '<a class="btn mt" href="' + (App.session.role === 'teacher' ? '#/t/lessons' : '#/s/lessons') + '">' +
            T('Back to lessons') + '</a>' +
        '</div></div>';
        return;
      }

      mounted = { lessonId: lessonId, role: App.session.role };

      /* announce arrival before the first paint, so the roster counts us */
      var r0 = Live.room(lessonId);
      if (r0 && r0.active) Live.beat(lessonId, user);

      root.innerHTML = skeleton(lesson, user);
      buildCanvas();
      this.refresh();

      stopTimers();
      heartbeat = setInterval(function () {
        var r = Live.room(lessonId);
        if (r && r.active) Live.beat(lessonId, user);
      }, 10000);
      ticker = setInterval(tickTimer, 500);
    },

    unmount: function () {
      if (mounted) {
        var r = Live.room(mounted.lessonId);
        if (r) Live.leave(mounted.lessonId, App.session ? App.session.userId : '');
      }
      mounted = null;
      stopTimers();
    },

    refresh: function () {
      if (!mounted) return;
      var lesson = S.lesson(mounted.lessonId);
      if (!lesson) return;
      var user = S.user(App.session.userId);
      var room = Live.room(lesson.id);
      var isTeacher = App.session.role === 'teacher';

      setHTML('liveStatus', statusHTML(lesson, room, isTeacher));
      setHTML('liveVideoBar', videoBarHTML(lesson, room, user, isTeacher));
      paintBoard(lesson, room, isTeacher);
      setHTML('liveTools', isTeacher ? toolsHTML(lesson, room) : studentPanelHTML(lesson, room, user));
      setHTML('liveRoster', rosterHTML(lesson, room, isTeacher));
      paintChat(lesson, room);
      syncVideoFrame(room, user);
    },

    isMounted: function (lessonId) { return !!mounted && mounted.lessonId === lessonId; }
  };

  function stopTimers() {
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null; }
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  function setHTML(id, html) {
    var el = document.getElementById(id);
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }

  /* ── skeleton (built once) ──────────────────────────── */
  function skeleton(lesson, user) {
    var c = S.klass(lesson.classId);
    var no = S.lessonNo(lesson);
    return '' +
      '<button class="btn btn--ghost btn--sm" data-act="leaveLive" style="margin-bottom:14px">' +
        U.icon('back') + T('Leave the classroom') + '</button>' +

      '<div class="card" style="margin-bottom:16px"><div class="card__b" style="padding:14px 18px">' +
        '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
          '<div style="flex:1;min-width:200px">' +
            '<div class="tiny muted" style="font-weight:600">' + U.esc(c.name) + ' · ' +
              T('Lesson {n} of {total}', { n: no.n, total: no.total }) + '</div>' +
            '<h2 style="font-size:19px">' + U.esc(lesson.title) + '</h2>' +
            '<div class="cn muted tiny">' + U.esc(lesson.cn) + '</div>' +
          '</div>' +
          '<div id="liveStatus"></div>' +
        '</div>' +
      '</div></div>' +

      '<div class="liveGrid">' +
        '<div>' +
          '<div class="card" style="overflow:hidden">' +
            '<div class="card__h"><h3>' + T('Video call') + '</h3><span class="sp"></span>' +
              '<div id="liveVideoBar" style="display:flex;gap:8px;align-items:center"></div></div>' +
            '<div id="liveVideo" class="liveVideo"></div>' +
          '</div>' +

          '<div class="card mt" style="overflow:hidden">' +
            '<div class="card__h"><h3>' + T('Class board') + '</h3>' +
              U.gloss('白板') + '</div>' +
            '<div id="liveBoard" class="liveBoard">' +
              '<div id="boardHtml"></div>' +
              '<div id="boardCanvasHost" hidden></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div class="card" id="liveToolsCard"><div class="card__h">' +
            '<h3>' + (App.session.role === 'teacher' ? T('Teaching tools') : T('My controls')) + '</h3>' +
            U.gloss(App.session.role === 'teacher' ? '教具' : '学生') + '</div>' +
            '<div id="liveTools" class="card__b"></div></div>' +

          '<div class="card mt"><div class="card__h"><h3>' + T('In the room') + '</h3></div>' +
            '<div id="liveRoster"></div></div>' +

          '<div class="card mt"><div class="card__h"><h3>' + T('Chat') + '</h3>' +
            U.gloss('聊天') + '</div>' +
            '<div id="liveChat" class="liveChat"></div>' +
            '<div class="liveChat__in">' +
              '<input id="chatInput" placeholder="' + T('Write a message') + '" ' +
                'onkeydown="if(event.key===\'Enter\'){event.preventDefault();window.Actions.sendChat(this);}">' +
              '<button class="btn btn--pri btn--sm" data-act="sendChatBtn">' + U.icon('chevron') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ── status pill + start/end ────────────────────────── */
  function statusHTML(lesson, room, isTeacher) {
    var live = room && room.active;
    var n = live ? Live.present(lesson.id).length : 0;
    var out = '<div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">';
    out += live
      ? '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + ' · ' + T('{n} in the room', { n: n }) + '</span>'
      : '<span class="tag tag--slate">' + T('Room closed') + '</span>';
    if (isTeacher) {
      out += live
        ? '<button class="btn btn--sm" data-act="endLive" data-id="' + lesson.id + '">' + U.icon('x') + T('End the lesson') + '</button>'
        : '<button class="btn btn--pri btn--sm" data-act="startLive" data-id="' + lesson.id + '">' + U.icon('video') + T('Open the room') + '</button>';
      out += '<button class="btn btn--sm" data-act="meetSettings" data-id="' + lesson.id + '">' + U.icon('settings') + T('Room settings') + '</button>';
    }
    out += '</div>';
    return out;
  }

  /* ── video pane ─────────────────────────────────────── */
  function videoBarHTML(lesson, room, user, isTeacher) {
    var live = room && room.active;
    var url = live ? Live.meetUrl(room, user.name) : '';
    var joined = !!document.querySelector('#liveVideo iframe');
    var out = '';
    if (live && url) {
      out += joined
        ? '<button class="btn btn--sm" data-act="hangUp">' + U.icon('videoOff') + T('Turn off video') + '</button>'
        : '<button class="btn btn--pri btn--sm" data-act="joinVideo">' + U.icon('video') + T('Join the call') + '</button>';
      out += '<a class="btn btn--sm" href="' + U.esc(url) + '" target="_blank" rel="noopener">' +
        U.icon('external') + T('New tab') + '</a>';
    }
    out += '<button class="btn btn--sm" data-act="deviceCheck">' + U.icon('mic') + T('Test camera') + '</button>';
    return out;
  }

  /* The iframe is created once and never re-created by a refresh — reloading it
     would drop the teacher and the students out of the call. */
  function syncVideoFrame(room, user) {
    var host = document.getElementById('liveVideo');
    if (!host) return;
    var live = room && room.active;
    var url = live ? Live.meetUrl(room, user.name) : '';
    var frame = host.querySelector('iframe');

    if (!live) {
      if (frame) host.innerHTML = '';
      if (!host.querySelector('.livePlaceholder')) {
        host.innerHTML = '<div class="livePlaceholder">' + U.icon('video') +
          '<b>' + T('The room is not open yet') + '</b>' +
          '<span>' + (App.session.role === 'teacher'
            ? T('Press “Open the room” to let your students in.')
            : T('Your teacher has not started the lesson.')) + '</span></div>';
      }
      return;
    }
    if (!url) {
      host.innerHTML = '<div class="livePlaceholder">' + U.icon('alert') +
        '<b>' + T('No meeting link') + '</b><span>' + T('Add one in Room settings.') + '</span></div>';
      return;
    }
    if (frame) return;                                   /* already in the call */
    if (!host.querySelector('.livePlaceholder')) {
      host.innerHTML = '<div class="livePlaceholder">' + U.icon('video') +
        '<b>' + T('The room is open') + '</b>' +
        '<span>' + T('Join when you are ready — your camera stays off until you do.') + '</span>' +
        '<button class="btn btn--pri" data-act="joinVideo" style="margin-top:12px">' +
          U.icon('video') + T('Join the call') + '</button></div>';
    }
  }

  A.joinVideo = function () {
    if (!mounted) return;
    var room = Live.room(mounted.lessonId);
    var user = S.user(App.session.userId);
    var url = Live.meetUrl(room, user.name);
    if (!url) { U.toast(T('No meeting link'), 'alert'); return; }
    var host = document.getElementById('liveVideo');
    host.innerHTML = '<iframe src="' + U.esc(url) + '" allow="camera; microphone; fullscreen; display-capture; autoplay" ' +
      'allowfullscreen title="' + T('Video call') + '"></iframe>';
    LiveView.refresh();
  };
  A.hangUp = function () {
    var host = document.getElementById('liveVideo');
    if (host) host.innerHTML = '';
    LiveView.refresh();
    U.toast(T('You left the call'));
  };

  /* camera / microphone check — plain getUserMedia, nothing leaves the machine */
  A.deviceCheck = function () {
    U.Modal.open({
      title: T('Camera and microphone'), cn: '设备检查', cancelText: T('Close'), footer: true,
      body: '<video id="devPreview" autoplay muted playsinline ' +
              'style="width:100%;border-radius:12px;background:#221C19;aspect-ratio:16/9"></video>' +
            '<div id="devLevel" class="bar" style="margin-top:12px"><i style="width:0%;background:var(--jade)"></i></div>' +
            '<p class="tiny muted" id="devMsg" style="margin:10px 0 0">' + T('Asking for permission…') + '</p>'
    });
    startPreview();
  };

  var previewStream = null;
  function startPreview() {
    var v = document.getElementById('devPreview');
    var msg = document.getElementById('devMsg');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (msg) msg.textContent = T('This browser cannot open the camera.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function (stream) {
      previewStream = stream;
      if (v) v.srcObject = stream;
      if (msg) msg.textContent = T('Camera and microphone are working. Speak to see the level move.');
      meter(stream);
    }).catch(function (err) {
      if (msg) msg.textContent = T('Could not open the camera: {msg}', { msg: err && err.name });
    });
  }
  function meter(stream) {
    try {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      var ctx = new Ctx();
      var src = ctx.createMediaStreamSource(stream);
      var an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      var buf = new Uint8Array(an.frequencyBinCount);
      (function loop() {
        var bar = document.querySelector('#devLevel > i');
        if (!bar) { stopPreview(); try { ctx.close(); } catch (e) {} return; }
        an.getByteTimeDomainData(buf);
        var peak = 0;
        for (var i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        bar.style.width = Math.min(100, Math.round(peak / 60 * 100)) + '%';
        requestAnimationFrame(loop);
      })();
    } catch (e) { /* no audio context */ }
  }
  function stopPreview() {
    if (previewStream) {
      previewStream.getTracks().forEach(function (t) { t.stop(); });
      previewStream = null;
    }
  }
  global.addEventListener('beforeunload', stopPreview);

  /* ══ the board ═══════════════════════════════════════ */
  function paintBoard(lesson, room, isTeacher) {
    var board = (room && room.board) || { mode: 'idle' };
    var host = document.getElementById('boardHtml');
    var canvasHost = document.getElementById('boardCanvasHost');
    if (!host || !canvasHost) return;

    var writing = board.mode === 'write';
    canvasHost.hidden = !writing;
    host.hidden = writing;

    if (writing) { redrawCanvas(board.strokes || []); return; }
    setHTML('boardHtml', boardHTML(lesson, room, board, isTeacher));
  }

  function boardHTML(lesson, room, board, isTeacher) {
    if (!room || !room.active) {
      return '<div class="livePlaceholder"><b>' + T('The board wakes up when the lesson starts') + '</b></div>';
    }
    if (board.mode === 'flash') {
      var w = lesson.words[board.i] || lesson.words[0];
      if (!w) return '<div class="livePlaceholder"><b>' + T('This lesson has no words yet') + '</b></div>';
      return '<div class="boardCard">' +
        '<div class="boardCard__hz">' + U.esc(w.hz) + '</div>' +
        (board.reveal
          ? '<div class="boardCard__py">' + U.esc(w.py) + '</div><div class="boardCard__en">' + U.esc(w.en) + '</div>'
          : '<div class="boardCard__hint">' + T('Waiting for the teacher to reveal it') + '</div>') +
        '<div class="tiny muted" style="margin-top:14px">' + (board.i + 1) + ' / ' + lesson.words.length + '</div>' +
        '<button class="btn btn--sm" data-act="say" data-text="' + U.esc(w.hz) + '" style="margin-top:10px">' +
          U.icon('speaker') + T('Say it') + '</button>' +
      '</div>';
    }
    if (board.mode === 'text') {
      return '<div class="boardCard"><div class="boardText">' +
        (board.text ? U.esc(board.text) : '<span class="muted">' + T('The teacher is writing…') + '</span>') +
        '</div></div>';
    }
    if (board.mode === 'picker') {
      var picked = board.picked ? S.user(board.picked) : null;
      return '<div class="boardCard">' +
        '<div class="tiny muted" style="font-weight:600;letter-spacing:.1em">' + T('YOUR TURN') + '</div>' +
        '<div class="boardCard__hz" style="font-size:46px;font-family:var(--sans);font-weight:700">' +
          (picked ? U.esc(picked.name) : '—') + '</div>' +
        (picked ? '<div class="cn muted" style="font-size:20px">' + U.esc(picked.cn) + '</div>' : '') +
      '</div>';
    }
    if (board.mode === 'quiz' && board.quiz) {
      return quizHTML(lesson, room, board.quiz, isTeacher);
    }
    return '<div class="livePlaceholder">' + U.icon('present') +
      '<b>' + T('Nothing on the board') + '</b>' +
      '<span>' + (isTeacher ? T('Pick a tool on the right.') : T('Your teacher will put something up shortly.')) + '</span></div>';
  }

  function quizHTML(lesson, room, q, isTeacher) {
    var me = App.session.userId;
    var mine = q.answers && q.answers[me];
    var tally = {};
    Object.keys(q.answers || {}).forEach(function (uid) {
      tally[q.answers[uid]] = (tally[q.answers[uid]] || 0) + 1;
    });
    var answered = Object.keys(q.answers || {}).length;

    return '<div class="boardCard" style="align-items:stretch">' +
      '<div class="tiny muted" style="font-weight:600;letter-spacing:.1em;text-align:center">' +
        T('QUICK QUIZ') + ' · ' + (q.n + 1) + ' / ' + q.total + '</div>' +
      '<div class="boardCard__hz" style="text-align:center">' + U.esc(q.hz) + '</div>' +
      '<div class="quizOpts">' + q.options.map(function (opt, i) {
        var right = q.reveal && i === q.answer;
        var wrongPick = q.reveal && mine === i && i !== q.answer;
        return '<button class="quizOpt' + (right ? ' quizOpt--right' : '') + (wrongPick ? ' quizOpt--wrong' : '') +
          (mine === i ? ' quizOpt--mine' : '') + '"' +
          (isTeacher || q.reveal || mine != null ? ' disabled' : '') +
          ' data-act="quizAnswer" data-i="' + i + '">' +
          '<span>' + U.esc(opt) + '</span>' +
          (q.reveal || isTeacher ? '<b class="num">' + (tally[i] || 0) + '</b>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="tiny muted" style="text-align:center;margin-top:10px">' +
        T('{n} answered', { n: answered }) + '</div>' +
    '</div>';
  }

  /* ── whiteboard canvas (built once, never re-created) ── */
  var drawing = false, curStroke = null;

  function buildCanvas() {
    var host = document.getElementById('boardCanvasHost');
    if (!host || host.querySelector('canvas')) return;
    host.innerHTML =
      '<div class="padWrap"><canvas id="livePad" width="960" height="540"></canvas>' +
      '<div class="padGrid"></div></div>';
    var cv = host.querySelector('canvas');
    if (App.session.role !== 'teacher') { cv.style.pointerEvents = 'none'; return; }

    cv.addEventListener('pointerdown', function (e) {
      drawing = true;
      cv.setPointerCapture(e.pointerId);
      curStroke = { c: currentInk, w: currentWidth, pts: [pt(cv, e)] };
      var r = Live.room(mounted.lessonId);
      if (r) { r.board.strokes = r.board.strokes || []; r.board.strokes.push(curStroke); }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drawing || !curStroke) return;
      curStroke.pts.push(pt(cv, e));
      drawStroke(cv.getContext('2d'), curStroke, cv.width, cv.height);
    });
    var finish = function () {
      if (!drawing) return;
      drawing = false; curStroke = null;
      Live.save();                                    /* one broadcast per stroke */
    };
    cv.addEventListener('pointerup', finish);
    cv.addEventListener('pointerleave', finish);
    cv.addEventListener('pointercancel', finish);
  }

  var currentInk = '#1A1614', currentWidth = 5;

  function pt(cv, e) {
    var b = cv.getBoundingClientRect();
    return [ +(((e.clientX - b.left) / b.width).toFixed(4)), +(((e.clientY - b.top) / b.height).toFixed(4)) ];
  }
  function drawStroke(ctx, s, w, h) {
    if (!s.pts.length) return;
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.pts[0][0] * w, s.pts[0][1] * h);
    for (var i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0] * w, s.pts[i][1] * h);
    ctx.stroke();
  }
  function redrawCanvas(strokes) {
    var cv = document.getElementById('livePad');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    strokes.forEach(function (s) { drawStroke(ctx, s, cv.width, cv.height); });
  }

  /* ══ teacher tool panel ══════════════════════════════ */
  var TOOLS = [
    { k: 'flash', icon: 'layers', label: 'Flashcards' },
    { k: 'write', icon: 'pencil', label: 'Writing pad' },
    { k: 'quiz', icon: 'checkSquare', label: 'Quick quiz' },
    { k: 'text', icon: 'file', label: 'Big text' },
    { k: 'picker', icon: 'dice', label: 'Pick a student' },
    { k: 'idle', icon: 'x', label: 'Clear' }
  ];

  function toolsHTML(lesson, room) {
    if (!room || !room.active) {
      return '<p class="muted tiny" style="margin:0">' + T('Open the room to use the tools.') + '</p>';
    }
    var board = room.board || {};
    var out = '<div class="toolGrid">' + TOOLS.map(function (t) {
      return '<button class="tool' + (board.mode === t.k ? ' tool--on' : '') + '" data-act="boardMode" data-v="' + t.k + '">' +
        U.icon(t.icon) + '<span>' + T(t.label) + '</span></button>';
    }).join('') + '</div>';

    if (board.mode === 'flash') {
      out += '<div class="toolRow">' +
        '<button class="btn btn--sm" data-act="flashBack">' + U.icon('back') + '</button>' +
        '<button class="btn btn--sm" data-act="flashReveal">' + U.icon('sparkles') +
          (board.reveal ? T('Hide') : T('Reveal')) + '</button>' +
        '<button class="btn btn--sm btn--pri" data-act="flashFwd">' + U.icon('chevron') + '</button>' +
        '</div><p class="tiny muted" style="margin:9px 0 0">' +
        T('The card on every student screen follows yours.') + '</p>';
    }
    if (board.mode === 'write') {
      out += '<div class="toolRow">' +
        ['#1A1614', '#C8443C', '#2C7A62', '#2F6FA8'].map(function (c) {
          return '<button class="ink' + (currentInk === c ? ' ink--on' : '') + '" data-act="setInk" data-v="' + c +
            '" style="background:' + c + '"></button>';
        }).join('') +
        '<button class="btn btn--sm" data-act="padUndo">' + T('Undo') + '</button>' +
        '<button class="btn btn--sm" data-act="padClear">' + T('Clear') + '</button>' +
        '</div><label class="field" style="margin:12px 0 0"><span>' + T('Grid') + '</span>' +
        '<select name="padGrid" data-act="padGridSel">' +
          '<option value="tian"' + (padGrid === 'tian' ? ' selected' : '') + '>' + T('田字格 practice grid') + '</option>' +
          '<option value="none"' + (padGrid === 'none' ? ' selected' : '') + '>' + T('Plain') + '</option>' +
        '</select></label>';
    }
    if (board.mode === 'quiz') {
      out += '<div class="toolRow">' +
        (board.quiz
          ? '<button class="btn btn--sm" data-act="quizReveal">' + T('Show the answer') + '</button>' +
            '<button class="btn btn--sm btn--pri" data-act="quizNext">' + T('Next question') + '</button>'
          : '<button class="btn btn--sm btn--pri" data-act="quizStart">' + T('Start the quiz') + '</button>') +
        '</div>';
    }
    if (board.mode === 'text') {
      out += '<label class="field" style="margin:12px 0 0"><span>' + T('Put on the board') + '</span>' +
        '<textarea id="boardTextIn" data-act="boardTextIn" placeholder="' +
        T('Type a sentence — students see it as you type') + '">' + U.esc(board.text || '') + '</textarea></label>';
    }
    if (board.mode === 'picker') {
      out += '<div class="toolRow"><button class="btn btn--sm btn--pri" data-act="pickStudent">' +
        U.icon('dice') + T('Pick someone') + '</button></div>';
    }

    /* the countdown is always available */
    out += '<div class="toolSep"></div>' +
      '<div class="tiny muted" style="font-weight:600;margin-bottom:7px">' + T('TIMER') + '</div>' +
      '<div id="liveTimer" class="timer"><b id="liveTimerVal">' + timerText(room) + '</b></div>' +
      '<div class="toolRow" style="margin-top:9px">' +
        [1, 3, 5, 10].map(function (m) {
          return '<button class="btn btn--sm" data-act="timerSet" data-v="' + m + '">' + m + '′</button>';
        }).join('') +
        '<button class="btn btn--sm" data-act="timerStop">' + T('Stop') + '</button>' +
      '</div>';
    return out;
  }

  var padGrid = 'tian';

  /* ── student panel ──────────────────────────────────── */
  function studentPanelHTML(lesson, room, user) {
    if (!room || !room.active) {
      return '<p class="muted tiny" style="margin:0">' + T('Your teacher has not started the lesson.') + '</p>';
    }
    var up = room.hands && room.hands[user.id];
    return '<button class="btn ' + (up ? 'btn--pri' : '') + '" data-act="raiseHand" ' +
        'style="width:100%;justify-content:center">' + U.icon('hand') +
        (up ? T('Lower my hand') : T('Raise my hand')) + '</button>' +
      '<div class="toolSep"></div>' +
      '<div class="tiny muted" style="font-weight:600;margin-bottom:7px">' + T('TIMER') + '</div>' +
      '<div class="timer"><b id="liveTimerVal">' + timerText(room) + '</b></div>' +
      '<div class="toolSep"></div>' +
      '<button class="btn" data-act="sOpenLesson" data-id="' + lesson.id + '" style="width:100%;justify-content:center">' +
        U.icon('book') + T('Lesson vocabulary') + '</button>';
  }

  /* ── roster / chat ──────────────────────────────────── */
  function rosterHTML(lesson, room, isTeacher) {
    var here = {};
    Live.present(lesson.id).forEach(function (p) { here[p.id] = true; });
    var hands = (room && room.hands) || {};
    var marks = S.data.attendance[lesson.id] || {};

    return '<div class="list">' + S.registerOf(lesson).map(function (sid) {
      var s = S.user(sid);
      return '<div class="row" style="padding:9px 14px">' +
        '<span class="pres' + (here[sid] ? ' pres--on' : '') + '"></span>' +
        U.avatar(s, 'av--sm') +
        '<div class="row__m"><b style="font-size:13px">' + U.esc(s.name) + '</b>' +
          '<small>' + (here[sid] ? T('in the room') : T('not here')) + '</small></div>' +
        (hands[sid] ? '<span class="tag tag--amber">' + U.icon('hand', 12) + '</span>' : '') +
        (isTeacher
          ? '<button class="btn btn--sm" data-act="liveMark" data-lesson="' + lesson.id + '" data-student="' + sid + '" ' +
            'title="' + T('Mark present') + '">' +
            (marks[sid] ? U.markTag(marks[sid]) : U.icon('checkSquare', 14)) + '</button>'
          : '') +
      '</div>';
    }).join('') + '</div>';
  }

  function paintChat(lesson, room) {
    var box = document.getElementById('liveChat');
    if (!box) return;
    var msgs = (room && room.chat) || [];
    var html = msgs.length ? msgs.map(function (m) {
      var mine = m.from === App.session.userId;
      return '<div class="msg' + (mine ? ' msg--mine' : '') + '">' +
        '<div class="msg__n">' + U.esc(m.name) + (m.role === 'teacher' ? ' · ' + T('teacher') : '') + '</div>' +
        '<div class="msg__b">' + U.esc(m.text) + '</div></div>';
    }).join('') : '<p class="tiny muted" style="padding:14px;margin:0">' + T('No messages yet.') + '</p>';
    if (box.innerHTML !== html) {
      box.innerHTML = html;
      box.scrollTop = box.scrollHeight;
    }
  }

  /* ── countdown ──────────────────────────────────────── */
  function timerText(room) {
    var t = room && room.timer;
    if (!t || !t.endsAt) return '—';
    var left = Math.max(0, Math.round((t.endsAt - Date.now()) / 1000));
    return Math.floor(left / 60) + ':' + (left % 60 < 10 ? '0' : '') + (left % 60);
  }
  function tickTimer() {
    if (!mounted) return;
    var el = document.getElementById('liveTimerVal');
    if (!el) return;
    var room = Live.room(mounted.lessonId);
    el.textContent = timerText(room);
    if (room && room.timer && room.timer.endsAt && room.timer.endsAt <= Date.now() && !room.timer.done) {
      room.timer.done = true;
      Live.save();
      U.toast(T('Time is up'), 'clock');
    }
  }

  /* ══ actions ═════════════════════════════════════════ */
  function room() { return mounted ? Live.room(mounted.lessonId) : null; }
  function lessonNow() { return mounted ? S.lesson(mounted.lessonId) : null; }

  A.startLive = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    var teacher = S.user(App.session.userId);
    Live.start(l, teacher);
    Live.beat(l.id, teacher);                 /* the teacher counts as present at once */
    if (l.status === 'scheduled') { l.status = 'in_progress'; S.save(); }
    LiveView.refresh();
    U.toast(T('The room is open'), 'video');
  };
  A.endLive = function (e) {
    Live.end(e.getAttribute('data-id'));
    var host = document.getElementById('liveVideo');
    if (host) host.innerHTML = '';
    LiveView.refresh();
    U.toast(T('Lesson ended'));
  };
  A.leaveLive = function () {
    var l = lessonNow();
    LiveView.unmount();
    App.go((App.session.role === 'teacher' ? '#/t/lesson/' : '#/s/lesson/') + (l ? l.id : ''));
  };

  A.meetSettings = function (e) {
    var l = S.lesson(e.getAttribute('data-id'));
    l.online = l.online || { provider: 'jitsi', room: '', url: '' };
    U.Modal.open({
      title: T('Room settings'), cn: '房间设置',
      body: '<label class="field"><span>' + T('Video service') + '</span><select name="provider">' +
              '<option value="jitsi"' + (l.online.provider === 'jitsi' ? ' selected' : '') + '>Jitsi Meet (' + T('built in, free') + ')</option>' +
              '<option value="custom"' + (l.online.provider === 'custom' ? ' selected' : '') + '>' + T('My own link (Zoom, Meet, Teams…)') + '</option>' +
              '<option value="none"' + (l.online.provider === 'none' ? ' selected' : '') + '>' + T('No video') + '</option>' +
            '</select></label>' +
            '<label class="field"><span>' + T('Jitsi room name') + '</span>' +
              '<input name="room" value="' + U.esc(l.online.room || '') + '">' +
              '<small>' + T('Anyone with the name can join, so keep it hard to guess.') + '</small></label>' +
            '<label class="field"><span>' + T('My own meeting link') + '</span>' +
              '<input name="url" placeholder="https://…" value="' + U.esc(l.online.url || '') + '"></label>',
      okText: T('Save'),
      onOk: function () {
        l.online.provider = U.Modal.val('provider');
        l.online.room = U.Modal.val('room') || ('ERA-' + l.classId + '-' + l.id);
        l.online.url = U.Modal.val('url');
        S.save();
        var r = room();
        if (r) { r.provider = l.online.provider; r.roomName = l.online.room; r.url = l.online.url; Live.save(); }
        U.Modal.close(); LiveView.refresh(); U.toast(T('Room settings saved'));
      }
    });
  };

  A.boardMode = function (e) {
    var mode = e.getAttribute('data-v');
    var patch = { mode: mode };
    if (mode === 'flash') { patch.i = 0; patch.reveal = false; }
    if (mode === 'quiz') { patch.quiz = null; }
    Live.patchBoard(mounted.lessonId, patch);
    LiveView.refresh();
  };
  A.flashFwd = function () {
    var b = room().board, l = lessonNow();
    Live.patchBoard(l.id, { i: Math.min(l.words.length - 1, (b.i || 0) + 1), reveal: false });
    LiveView.refresh();
  };
  A.flashBack = function () {
    var b = room().board;
    Live.patchBoard(mounted.lessonId, { i: Math.max(0, (b.i || 0) - 1), reveal: false });
    LiveView.refresh();
  };
  A.flashReveal = function () {
    Live.patchBoard(mounted.lessonId, { reveal: !room().board.reveal });
    LiveView.refresh();
  };

  A.setInk = function (e) { currentInk = e.getAttribute('data-v'); LiveView.refresh(); };
  A.padUndo = function () {
    var b = room().board;
    b.strokes = (b.strokes || []).slice(0, -1);
    Live.save(); LiveView.refresh();
  };
  A.padClear = function () {
    Live.patchBoard(mounted.lessonId, { strokes: [] });
    LiveView.refresh();
  };
  A.padGridSel = function (e) {
    padGrid = e.value;
    var w = document.querySelector('.padWrap');
    if (w) w.classList.toggle('padWrap--plain', padGrid === 'none');
  };

  A.boardTextIn = function (e) {
    var r = room();
    if (!r) return;
    r.board.text = e.value;
    Live.saveRemote();                       /* students update; this tab does not re-render */
    paintBoard(lessonNow(), r, true);        /* repaint only the board, never the textarea */
  };

  A.pickStudent = function () {
    var l = lessonNow();
    var here = Live.present(l.id).filter(function (p) { return p.role === 'student'; });
    var pool = here.length ? here.map(function (p) { return p.id; }) : S.rosterOf(l.classId);
    if (!pool.length) { U.toast(T('Nobody to pick'), 'alert'); return; }
    var pick = pool[Math.floor(Math.random() * pool.length)];
    Live.patchBoard(l.id, { picked: pick });
    LiveView.refresh();
  };

  A.timerSet = function (e) {
    var r = room();
    r.timer = { endsAt: Date.now() + (+e.getAttribute('data-v')) * 60000, done: false };
    Live.save(); LiveView.refresh();
  };
  A.timerStop = function () {
    var r = room();
    r.timer = null; Live.save(); LiveView.refresh();
  };

  /* ── quick quiz ─────────────────────────────────────── */
  function makeQuestion(lesson, n, total) {
    var words = lesson.words;
    var i = Math.floor(Math.random() * words.length);
    var right = words[i];
    var opts = [right.en];
    var guard = 0;
    while (opts.length < Math.min(4, words.length) && guard++ < 40) {
      var w = words[Math.floor(Math.random() * words.length)];
      if (opts.indexOf(w.en) < 0) opts.push(w.en);
    }
    for (var k = opts.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var t = opts[k]; opts[k] = opts[j]; opts[j] = t;
    }
    return { n: n, total: total, hz: right.hz, options: opts, answer: opts.indexOf(right.en), reveal: false, answers: {} };
  }
  A.quizStart = function () {
    var l = lessonNow();
    if (!l.words.length) { U.toast(T('This lesson has no words yet'), 'alert'); return; }
    Live.patchBoard(l.id, { mode: 'quiz', quiz: makeQuestion(l, 0, Math.min(8, l.words.length)) });
    LiveView.refresh();
  };
  A.quizNext = function () {
    var l = lessonNow(), q = room().board.quiz;
    if (q.n + 1 >= q.total) {
      Live.patchBoard(l.id, { quiz: null, mode: 'idle' });
      U.toast(T('Quiz finished'), 'sparkles');
    } else {
      Live.patchBoard(l.id, { quiz: makeQuestion(l, q.n + 1, q.total) });
    }
    LiveView.refresh();
  };
  A.quizReveal = function () {
    var q = room().board.quiz;
    q.reveal = true; Live.save(); LiveView.refresh();
  };
  A.quizAnswer = function (e) {
    var q = room().board.quiz;
    if (!q || q.reveal) return;
    q.answers = q.answers || {};
    q.answers[App.session.userId] = +e.getAttribute('data-i');
    Live.save(); LiveView.refresh();
  };

  A.raiseHand = function () {
    var r = room(), id = App.session.userId;
    Live.hand(mounted.lessonId, id, !(r.hands && r.hands[id]));
    LiveView.refresh();
  };

  A.liveMark = function (e) {
    var lid = e.getAttribute('data-lesson'), sid = e.getAttribute('data-student');
    var a = S.data.attendance[lid] || (S.data.attendance[lid] = {});
    var order = [null, 'present', 'late', 'absent', 'excused'];
    var next = order[(order.indexOf(a[sid] || null) + 1) % order.length];
    if (next) a[sid] = next; else delete a[sid];
    S.save(); LiveView.refresh();
  };

  A.sendChat = function (input) {
    var text = (input.value || '').trim();
    if (!text) return;
    Live.say(mounted.lessonId, S.user(App.session.userId), text);
    input.value = '';
    LiveView.refresh();
    input.focus();
  };
  A.sendChatBtn = function () {
    var input = document.getElementById('chatInput');
    if (input) A.sendChat(input);
  };

  /* live updates arriving from the other tab */
  Live.onChange(function () {
    if (mounted && LiveView.refresh) LiveView.refresh();
    else if (global.App && App.render && App.session) {
      /* a "live now" badge may have appeared elsewhere in the app */
      var el = document.querySelector('[data-live-badge]');
      if (el) App.render();
    }
  });

  global.Live = Live;
  global.LiveView = LiveView;
})(window);
