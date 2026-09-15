/* ERA Chinese — messages between a student and their teacher.

   Two panes: the people you can write to on the left, newest conversation
   first with an unread count, and the conversation on the right. Enter sends,
   Shift+Enter starts a new line.

   The page is redrawn whenever the school changes — which, now that messages
   arrive from other devices, can be in the middle of typing. app.js keeps the
   composer's text and caret across a redraw (see keepFocus there), and the
   draft for each conversation is also held here, so switching away and back
   does not lose half a sentence. */
(function (global) {
  'use strict';

  var U, S, A;
  function g() { U = global.UI; S = global.Store; A = global.Actions; }
  function me() { return S.user(global.App.session.userId); }
  var drafts = {};

  function when(at) {
    var d = new Date(at);
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var time = pad(d.getHours()) + ':' + pad(d.getMinutes());
    return day === S.today() ? time : U.fmt.date(day) + ' ' + time;
  }

  function page(otherId) {
    g();
    var self = me();
    var pfx = self.role === 'teacher' ? 't' : 's';
    var contacts = S.chatContacts(self.id).map(function (u) {
      var last = S.lastMessage(self.id, u.id);
      return { user: u, last: last, unread: S.unreadFrom(self.id, u.id) };
    }).sort(function (a, b) {
      var la = a.last ? a.last.at : 0, lb = b.last ? b.last.at : 0;
      if (la !== lb) return lb - la;
      return String(a.user.name).localeCompare(String(b.user.name));
    });

    var other = otherId ? S.user(otherId) : null;
    if (other && !contacts.some(function (c) { return c.user.id === other.id; })) other = null;

    var list = contacts.length
      ? contacts.map(function (c) {
          var on = other && other.id === c.user.id;
          var preview = c.last
            ? (c.last.from === self.id ? T('You: ') : '') + c.last.text
            : (c.user.role === 'teacher' ? (c.user.title || T('Teacher')) : T('No messages yet'));
          return '<a class="chatContact' + (on ? ' on' : '') + '" href="#/' + pfx + '/chat/' + c.user.id + '">' +
            U.avatar(c.user) +
            '<div class="chatContact__m"><div class="chatContact__top"><b>' + U.esc(c.user.name) + '</b>' +
              (c.last ? '<span class="tiny muted">' + U.esc(when(c.last.at)) + '</span>' : '') + '</div>' +
              '<div class="chatContact__prev">' + U.esc(preview.slice(0, 80)) + '</div></div>' +
            (c.unread ? '<span class="chatBadge">' + c.unread + '</span>' : '') +
          '</a>';
        }).join('')
      : '<div class="card__b">' + U.empty('users', T('Nobody to message yet'),
          self.role === 'teacher'
            ? T('Students of your classes appear here.')
            : T('Your teachers appear here once you are in a class.')) + '</div>';

    return '<div class="chat' + (other ? ' chat--open' : '') + '">' +
      '<aside class="chat__list card">' +
        '<div class="card__h"><h3>' + T('Messages') + '</h3></div>' +
        '<div class="chat__contacts">' + list + '</div>' +
      '</aside>' +
      '<section class="chat__pane card">' + (other ? conversation(self, other, pfx) :
        '<div class="chat__empty">' + U.empty('inbox', T('Choose a conversation'),
          self.role === 'student' ? T('Ask your teacher anything about your lessons.') : T('Pick a student on the left.')) +
        '</div>') +
      '</section>' +
    '</div>';
  }

  function conversation(self, other, pfx) {
    var msgs = S.thread(self.id, other.id);
    var lastDay = null;
    var body = msgs.length ? msgs.map(function (m) {
      var d = new Date(m.at);
      var dayKey = d.toDateString();
      var sep = '';
      if (dayKey !== lastDay) {
        lastDay = dayKey;
        sep = '<div class="chatDay">' + U.esc(U.fmt.date(isoDay(d))) + '</div>';
      }
      var mine = m.from === self.id;
      return sep + '<div class="bubble' + (mine ? ' bubble--me' : '') + '">' +
        '<div class="bubble__t">' + U.esc(m.text).replace(/\n/g, '<br>') + '</div>' +
        '<div class="bubble__at">' + U.esc(when(m.at).split(' ').pop()) +
          (mine ? ' · ' + (m.readAt ? T('Seen') : T('Sent')) : '') + '</div>' +
      '</div>';
    }).join('') : '<div class="chat__first">' + T('No messages yet. Say hello!') + '</div>';

    return '<header class="chat__head">' +
        '<a class="btn btn--ghost btn--sm chat__back" href="#/' + pfx + '/chat">' + U.icon('back', 16) + '</a>' +
        U.avatar(other) +
        '<div><b>' + U.esc(other.name) + '</b><div class="tiny muted">' +
          U.esc(other.role === 'teacher' ? (other.title || T('Teacher')) : T('Student')) + '</div></div>' +
      '</header>' +
      '<div class="chat__msgs" id="chatMsgs">' + body + '</div>' +
      '<form class="chat__compose" data-form="chat" data-to="' + other.id + '">' +
        '<textarea id="chatInput" name="text" rows="1" maxlength="' + S.MESSAGE_MAX + '" data-act="chatType" data-to="' + other.id +
          '" placeholder="' + T('Write a message…') + '">' + U.esc(drafts[other.id] || '') + '</textarea>' +
        '<button class="btn btn--pri" type="submit" aria-label="' + T('Send') + '">' + U.icon('chevron', 18) + '</button>' +
      '</form>';
  }

  function isoDay(d) {
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* after a paint: open conversations read their messages and sit at the bottom */
  function after(otherId) {
    g();
    var self = me();
    if (otherId && S.user(otherId)) S.markRead(self.id, otherId);
    var box = document.getElementById('chatMsgs');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function send(form) {
    g();
    var to = form.getAttribute('data-to');
    var input = form.querySelector('[name="text"]');
    var r = S.sendMessage(me().id, to, input ? input.value : '');
    if (r.error) { U.toast(T(r.error), 'alert'); return; }
    drafts[to] = '';
    if (input) input.value = '';
    global.App.render();
    var box = document.getElementById('chatInput');
    if (box && box.focus) box.focus();
  }

  global.ChatViews = { page: page, after: after, send: send, drafts: drafts };

  if (typeof document === 'undefined') return;
  g();
  A = global.Actions = global.Actions || {};

  A.chatType = function (el) {
    drafts[el.getAttribute('data-to')] = el.value;
  };

  /* Enter sends; Shift+Enter is a new line */
  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (!t || t.id !== 'chatInput' || ev.key !== 'Enter' || ev.shiftKey || ev.isComposing) return;
    ev.preventDefault();
    var form = t.closest ? t.closest('form') : null;
    if (form) send(form);
  });
})(typeof window !== 'undefined' ? window : globalThis);
