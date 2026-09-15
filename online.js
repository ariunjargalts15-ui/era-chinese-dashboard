/* ERA Chinese — the online lessons page.

   Teachers schedule a session for one of their classes and choose exactly
   which students are invited; only those students can enter the room (the
   rule itself lives in Live.mayJoin, and in the database policies). Students
   see the sessions they were invited to: what is live now, what is coming
   and when, and what they attended.

   Around that:
     - a countdown to each session, refreshed every half minute
     - a reminder sent to every invited student through Messages
     - "add to calendar" as an .ics file
     - a camera and microphone check before joining
     - the register filled in from who was actually in the room (live.js) */
(function (global) {
  'use strict';

  var U, S, A;
  function g() { U = global.UI; S = global.Store; A = global.Actions; }
  function me() { return S.user(global.App.session.userId); }
  var JOIN_EARLY = 15 * 60000;          /* the join button wakes up 15 minutes early */

  function live(l) {
    var r = global.Live && global.Live.room(l.id);
    return !!(r && r.active);
  }

  /* "in 2 h 5 min", "in 12 min", "started 8 min ago" */
  function countdown(l) {
    var now = Date.now(), start = S.startsAt(l), end = S.endsAt(l);
    var mins = function (ms) { return Math.max(1, Math.round(ms / 60000)); };
    if (live(l)) return T('Live now · {n} min', { n: mins(now - (global.Live.room(l.id).startedAt || now)) });
    if (now < start) {
      var m = mins(start - now);
      if (m >= 24 * 60) return T('in {d} days', { d: Math.round(m / 1440) });
      if (m >= 60) return T('in {h} h {m} min', { h: Math.floor(m / 60), m: m % 60 });
      return T('in {n} min', { n: m });
    }
    if (now < end) return T('Should have started {n} min ago', { n: mins(now - start) });
    return T('Finished');
  }

  function when(l) {
    return U.fmt.dateLong(l.date) + ' · ' + U.esc(l.time) + ' · ' + T('{n} min', { n: l.online.duration || 60 });
  }

  function avatars(ids) {
    var people = ids.map(function (id) { return S.user(id); }).filter(Boolean);
    return '<span class="onAvatars">' + people.slice(0, 6).map(function (u) { return U.avatar(u, 'av--sm'); }).join('') +
      (people.length > 6 ? '<span class="onMore">+' + (people.length - 6) + '</span>' : '') + '</span>';
  }

  function sections(list) {
    var now = Date.now();
    return {
      live: list.filter(live),
      soon: list.filter(function (l) { return !live(l) && l.status !== 'completed' && S.endsAt(l) > now; }),
      past: list.filter(function (l) { return !live(l) && (l.status === 'completed' || S.endsAt(l) <= now); }).reverse()
    };
  }

  function group(title, items, empty) {
    return '<div class="onGroup"><h3 class="onGroup__h">' + title +
      (items ? '<span class="tag">' + items.count + '</span>' : '') + '</h3>' +
      (items && items.count ? items.html : '<div class="onEmpty muted tiny">' + empty + '</div>') + '</div>';
  }

  /* ══ teacher ══ */
  function teacherPage() {
    var t = me();
    var sec = sections(S.onlineLessonsOfTeacher(t.id));
    var classes = S.classesOfTeacher(t.id).length ? S.classesOfTeacher(t.id) : S.data.classes;

    function card(l, kind) {
      var c = S.klass(l.classId);
      var a = S.data.attendance[l.id] || {};
      var present = l.online.invited.filter(function (s) { return a[s] === 'present' || a[s] === 'late'; }).length;
      var inRoom = live(l) ? global.Live.present(l.id).filter(function (p) { return p.role !== 'teacher'; }).length : 0;
      return '<article class="onCard onCard--' + kind + '">' +
        '<div class="onCard__top">' +
          (kind === 'live' ? '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + '</span>' :
           kind === 'soon' ? '<span class="tag tag--gold">' + U.icon('clock', 12) + U.esc(countdown(l)) + '</span>' :
                             '<span class="tag tag--slate">' + T('Finished') + '</span>') +
          '<span class="sp"></span><span class="tiny muted">' + U.esc(c ? c.name : '') + '</span></div>' +
        '<h4>' + U.esc(l.title) + '</h4>' +
        '<div class="tiny muted">' + when(l) + '</div>' +
        (l.topic ? '<p class="onAgenda">' + U.esc(l.topic) + '</p>' : '') +
        '<div class="onCard__who">' + avatars(l.online.invited) +
          '<span class="tiny muted">' +
            (kind === 'live' ? T('{n} of {m} in the room', { n: inRoom, m: l.online.invited.length })
             : kind === 'past' ? T('{n} of {m} attended', { n: present, m: l.online.invited.length })
             : T('{n} invited', { n: l.online.invited.length })) +
          '</span></div>' +
        '<div class="onCard__acts">' +
          (kind === 'live'
            ? '<a class="btn btn--pri" href="#/t/live/' + l.id + '">' + U.icon('video') + T('Go to the room') + '</a>'
            : kind === 'soon'
              ? '<button class="btn btn--pri" data-act="onlineStart" data-id="' + l.id + '">' + U.icon('video') + T('Start now') + '</button>' +
                '<button class="btn" data-act="onlineRemind" data-id="' + l.id + '">' + U.icon('mail', 14) +
                  (l.online.reminded ? T('Remind again') : T('Remind by message')) + '</button>' +
                '<button class="btn btn--sm" data-act="onlineEdit" data-id="' + l.id + '">' + U.icon('pencil', 14) + T('Edit') + '</button>'
              : '<a class="btn btn--sm" href="#/t/lesson/' + l.id + '">' + T('Open the register') + '</a>') +
          (kind !== 'live' ? '<button class="btn btn--sm" data-act="onlineDelete" data-id="' + l.id + '" title="' + T('Delete') + '">' + U.icon('trash', 14) + '</button>' : '') +
        '</div>' +
      '</article>';
    }
    function block(list, kind) {
      return { count: list.length, html: '<div class="onGrid">' + list.map(function (l) { return card(l, kind); }).join('') + '</div>' };
    }

    return '<div class="sect">' +
        '<p class="muted" style="margin:0;flex:1;min-width:240px">' +
          T('Only the students you invite can enter an online lesson.') + '</p>' +
        (classes.length
          ? '<button class="btn btn--pri" data-act="onlineNew">' + U.icon('plus') + T('New online lesson') + '</button>'
          : '<span class="tiny muted">' + T('Create a class first') + '</span>') +
      '</div>' +
      (sec.live.length ? group(T('Live now'), block(sec.live, 'live')) : '') +
      group(T('Coming up'), block(sec.soon, 'soon'), T('Nothing scheduled. Create an online lesson and invite students.')) +
      (sec.past.length ? group(T('Past lessons'), block(sec.past.slice(0, 12), 'past')) : '');
  }

  /* ══ student ══ */
  function studentPage() {
    var s = me();
    var sec = sections(S.onlineLessonsOfStudent(s.id));

    function card(l, kind) {
      var c = S.klass(l.classId);
      var teacher = c && S.user(c.teacherId);
      var mark = S.mark(l.id, s.id);
      var early = Date.now() >= S.startsAt(l) - JOIN_EARLY;
      var action = '';
      if (kind === 'live') {
        action = '<a class="btn btn--pri btn--lg onJoin" href="#/s/live/' + l.id + '">' + U.icon('video') + T('Join the lesson') + '</a>';
      } else if (kind === 'soon') {
        action = (early
            ? '<span class="onWait">' + U.icon('clock', 14) + T('Waiting for the teacher to open the room') + '</span>'
            : '') +
          '<a class="btn btn--sm" download="era-chinese-lesson.ics" href="' + ics(l) + '">' + U.icon('calendar', 14) + T('Add to calendar') + '</a>' +
          '<button class="btn btn--sm" data-act="deviceCheck">' + U.icon('mic', 14) + T('Test camera & mic') + '</button>';
      } else {
        action = '<span class="tag ' + (mark === 'present' || mark === 'late' ? 'tag--green' : mark ? 'tag--red' : '') + '">' +
          (mark === 'present' ? T('Attended') : mark === 'late' ? T('Late') : mark ? T('Missed') : T('Not recorded')) + '</span>';
      }
      return '<article class="onCard onCard--' + kind + '">' +
        '<div class="onCard__top">' +
          (kind === 'live' ? '<span class="tag tag--red"><span class="dot"></span>' + U.esc(countdown(l)) + '</span>' :
           kind === 'soon' ? '<span class="tag tag--gold">' + U.icon('clock', 12) + U.esc(countdown(l)) + '</span>' :
                             '<span class="tag tag--slate">' + T('Finished') + '</span>') +
          '<span class="sp"></span><span class="tiny muted">' + U.esc(c ? c.name : '') + '</span></div>' +
        '<h4>' + U.esc(l.title) + '</h4>' +
        '<div class="tiny muted">' + when(l) + (teacher ? ' · ' + U.esc(teacher.name) : '') + '</div>' +
        (l.topic ? '<p class="onAgenda">' + U.esc(l.topic) + '</p>' : '') +
        '<div class="onCard__acts">' + action + '</div>' +
      '</article>';
    }
    function block(list, kind) {
      return { count: list.length, html: '<div class="onGrid">' + list.map(function (l) { return card(l, kind); }).join('') + '</div>' };
    }

    if (!sec.live.length && !sec.soon.length && !sec.past.length) {
      return '<div class="card">' + U.empty('video', T('No online lessons yet'),
        T('When your teacher invites you to an online lesson it appears here.')) + '</div>';
    }
    return (sec.live.length ? group(T('Live now'), block(sec.live, 'live')) : '') +
      group(T('Coming up'), block(sec.soon, 'soon'), T('No upcoming online lessons.')) +
      (sec.past.length ? group(T('Past lessons'), block(sec.past.slice(0, 12), 'past')) : '');
  }

  function page() {
    g();
    return me().role === 'teacher' ? teacherPage() : studentPage();
  }

  /* a calendar file for the session, with a reminder 15 minutes before */
  function ics(l) {
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var stamp = function (ms) {
      var d = new Date(ms);
      return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
    };
    var clean = function (x) { return String(x || '').replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n'); };
    var body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ERA Chinese//Online lesson//MN',
      'BEGIN:VEVENT',
      'UID:' + l.id + '@erachinese',
      'DTSTAMP:' + stamp(Date.now()),
      'DTSTART:' + stamp(S.startsAt(l)),
      'DTEND:' + stamp(S.endsAt(l)),
      'SUMMARY:' + clean('ERA Chinese — ' + l.title),
      'DESCRIPTION:' + clean(l.topic || ''),
      'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:' + clean(l.title), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }

  /* the invitation list for whichever class is picked */
  function pickList(classId, chosen) {
    var c = S.klass(classId);
    var ids = c ? S.rosterOf(c.id) : [];
    if (!ids.length) return '<p class="tiny muted" style="margin:0">' + T('This class has no students yet.') + '</p>';
    return '<div class="onPickHead"><span class="tiny muted">' + T('{n} students', { n: ids.length }) + '</span>' +
        '<span class="sp"></span>' +
        '<button type="button" class="btn btn--sm" data-act="onlinePickAll" data-v="1">' + T('Select all') + '</button>' +
        '<button type="button" class="btn btn--sm" data-act="onlinePickAll" data-v="0">' + T('Clear') + '</button></div>' +
      '<div class="picklist">' + ids.map(function (sid) {
        var u = S.user(sid);
        return '<label class="pick"><input type="checkbox" name="invite" value="' + sid + '"' +
          (!chosen || chosen.indexOf(sid) > -1 ? ' checked' : '') + '>' +
          U.avatar(u, 'av--sm') + '<span><b>' + U.esc(u.name) + '</b><small>' + U.esc(u.email || '') + '</small></span></label>';
      }).join('') + '</div>';
  }

  function form(l) {
    var t = me();
    var classes = S.classesOfTeacher(t.id).length ? S.classesOfTeacher(t.id) : S.data.classes;
    var cid = l ? l.classId : classes[0].id;
    var on = (l && l.online) || {};
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<label class="field"><span>' + T('Class') + '</span><select name="classId" data-act="onlineClass">' +
          classes.map(function (c) {
            return '<option value="' + c.id + '"' + (c.id === cid ? ' selected' : '') + '>' + U.esc(c.name) + '</option>';
          }).join('') + '</select></label>' +
        '<label class="field"><span>' + T('Title') + '</span><input name="title" value="' + U.esc(l ? l.title : '') +
          '" placeholder="' + T('e.g. Speaking practice') + '"></label>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">' +
        '<label class="field"><span>' + T('Date') + '</span><input type="date" name="date" value="' + U.esc(l ? l.date : S.today()) + '"></label>' +
        '<label class="field"><span>' + T('Time') + '</span><input type="time" name="time" value="' + U.esc(l ? l.time : '19:00') + '"></label>' +
        '<label class="field"><span>' + T('Length') + '</span><select name="duration">' +
          [30, 45, 60, 90, 120].map(function (m) {
            return '<option value="' + m + '"' + ((on.duration || 60) === m ? ' selected' : '') + '>' + T('{n} min', { n: m }) + '</option>';
          }).join('') + '</select></label>' +
      '</div>' +
      '<label class="field"><span>' + T('What you will cover') + '</span><textarea name="agenda" rows="2" placeholder="' +
        T('Students see this before they join') + '">' + U.esc(l ? l.topic : '') + '</textarea></label>' +
      '<div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">' +
        '<label class="field"><span>' + T('Video') + '</span><select name="provider">' +
          '<option value="jitsi"' + (on.provider !== 'custom' ? ' selected' : '') + '>' + T('Built-in video room') + '</option>' +
          '<option value="custom"' + (on.provider === 'custom' ? ' selected' : '') + '>' + T('My own link (Zoom, Meet…)') + '</option>' +
        '</select></label>' +
        '<label class="field"><span>' + T('Meeting link (only for your own link)') + '</span>' +
          '<input name="url" value="' + U.esc(on.url || '') + '" placeholder="https://"></label>' +
      '</div>' +
      '<div class="field"><span>' + T('Invited students') + '</span>' +
        '<div id="onlinePick">' + pickList(cid, l ? l.online.invited : null) + '</div></div>';
  }

  function readForm() {
    var boxes = document.querySelectorAll('#modal-root input[name="invite"]');
    var invited = [];
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) invited.push(boxes[i].value);
    return {
      classId: U.Modal.val('classId'), title: U.Modal.val('title'), date: U.Modal.val('date'),
      time: U.Modal.val('time'), duration: U.Modal.val('duration'), agenda: U.Modal.val('agenda'),
      provider: U.Modal.val('provider'), url: U.Modal.val('url'), invited: invited
    };
  }

  function openForm(l) {
    U.Modal.open({
      title: l ? T('Edit online lesson') : T('New online lesson'), cn: '在线课程',
      body: form(l),
      okText: l ? T('Save') : T('Schedule'),
      onOk: function () {
        var r = S.saveOnlineLesson(readForm(), l ? l.id : null);
        if (r.error) { U.toast(T(r.error), 'alert'); return; }
        U.Modal.close(); global.App.render();
        U.toast(T('Online lesson saved — {n} students invited', { n: r.lesson.online.invited.length }), 'video');
      }
    });
  }

  global.OnlineViews = { page: page, ics: ics, countdown: countdown };

  if (typeof document === 'undefined') return;
  g();
  A = global.Actions = global.Actions || {};

  A.onlineNew = function () { g(); openForm(null); };
  A.onlineEdit = function (e) { g(); openForm(S.lesson(e.getAttribute('data-id'))); };

  A.onlineClass = function (el) {
    g();
    var box = document.getElementById('onlinePick');
    if (box) box.innerHTML = pickList(el.value, null);
  };
  A.onlinePickAll = function (e) {
    var on = e.getAttribute('data-v') === '1';
    var boxes = document.querySelectorAll('#modal-root input[name="invite"]');
    for (var i = 0; i < boxes.length; i++) boxes[i].checked = on;
  };

  A.onlineStart = function (e) {
    g();
    var l = S.lesson(e.getAttribute('data-id'));
    if (!l) return;
    var t = me();
    global.Live.start(l, t);
    global.Live.beat(l.id, t);
    if (l.status === 'scheduled') { l.status = 'in_progress'; S.save(); }
    U.toast(T('The room is open'), 'video');
    global.App.go('#/t/live/' + l.id);
  };

  /* one message to each invited student, through the ordinary Messages page */
  A.onlineRemind = function (e) {
    g();
    var l = S.lesson(e.getAttribute('data-id'));
    if (!l) return;
    var t = me();
    var text = T('Hello! The online lesson «{title}» starts on {date} at {time}. Join it from the Online lessons page.', {
      title: l.title, date: U.fmt.dateLong(l.date), time: l.time
    });
    U.Modal.open({
      title: T('Remind by message'),
      body: '<p style="margin:0 0 10px">' + T('This message goes to {n} invited students:', { n: l.online.invited.length }) + '</p>' +
        '<div class="bubble bubble--me" style="max-width:100%">' + U.esc(text) + '</div>',
      okText: T('Send'),
      onOk: function () {
        var sent = 0;
        l.online.invited.forEach(function (sid) { if (!S.sendMessage(t.id, sid, text).error) sent++; });
        l.online.reminded = Date.now();
        S.save();
        U.Modal.close(); global.App.render();
        U.toast(T('Reminder sent to {n} students', { n: sent }), 'mail');
      }
    });
  };

  A.onlineDelete = function (e) {
    g();
    var l = S.lesson(e.getAttribute('data-id'));
    if (!l) return;
    U.Modal.open({
      title: T('Delete online lesson'),
      body: '<p style="margin:0">' + T('Delete «{title}»? Its register goes with it.', { title: '<b>' + U.esc(l.title) + '</b>' }) + '</p>',
      okText: T('Delete'),
      onOk: function () { S.deleteOnlineLesson(l.id); U.Modal.close(); global.App.render(); U.toast(T('Deleted'), 'trash'); }
    });
  };

  /* ── camera and microphone check ── */
  var testStream = null, testTimer = null;
  function stopTest() {
    if (testTimer) { clearInterval(testTimer); testTimer = null; }
    if (testStream) { testStream.getTracks().forEach(function (tr) { tr.stop(); }); testStream = null; }
  }
  var closeModal = global.UI && global.UI.Modal.close;
  if (closeModal) {
    global.UI.Modal.close = function () { stopTest(); return closeModal.apply(this, arguments); };
  }

  A.deviceCheck = function () {
    g();
    U.Modal.open({
      title: T('Test camera & mic'),
      body: '<div class="devCheck">' +
          '<video id="devVideo" autoplay muted playsinline></video>' +
          '<div class="devMeter"><i id="devLevel"></i></div>' +
          '<p class="tiny muted" id="devNote">' + T('Allow the browser to use your camera and microphone.') + '</p>' +
        '</div>',
      okText: T('Done'),
      onOk: function () { U.Modal.close(); }
    });
    var note = function (txt) { var n = document.getElementById('devNote'); if (n) n.textContent = txt; };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      note(T('This browser cannot use a camera. Try Chrome or Safari.'));
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function (stream) {
      testStream = stream;
      var v = document.getElementById('devVideo');
      if (v) v.srcObject = stream;
      note(T('If you can see yourself and the bar moves when you speak, you are ready.'));
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC(), an = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(an);
      var buf = new Uint8Array(an.fftSize);
      testTimer = setInterval(function () {
        an.getByteTimeDomainData(buf);
        var peak = 0;
        for (var i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
        var bar = document.getElementById('devLevel');
        if (bar) bar.style.width = Math.min(100, peak * 1.6) + '%';
        if (!document.getElementById('devVideo')) { stopTest(); try { ctx.close(); } catch (x) {} }
      }, 80);
    }).catch(function (err) {
      note(/denied|allowed|permission/i.test(String(err && err.name + err.message))
        ? T('Access was blocked. Allow the camera and microphone in the browser settings.')
        : T('No camera or microphone was found.'));
    });
  };

  /* countdowns move on their own while the page is open */
  if (typeof setInterval === "function") setInterval(function () {
    var App = global.App;
    if (!App || !App.session || App.route[1] !== 'online') return;
    if (document.querySelector('#modal-root .mask')) return;
    var f = document.activeElement;
    if (f && /^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)) return;
    App.render();
  }, 30000);
})(typeof window !== 'undefined' ? window : globalThis);
