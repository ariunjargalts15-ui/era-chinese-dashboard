/* ERA Chinese — small UI kit: icons, formatting, modal, toast, chart bits. */
(function (global) {
  'use strict';

  /* ── icons (stroke set, 24-grid) ──────────────────────── */
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.6V21h14V9.6"/>',
    book: '<path d="M12 6.5C10.5 5 8.5 4.4 4 4.4V19c4.5 0 6.5.6 8 2 1.5-1.4 3.5-2 8-2V4.4c-4.5 0-6.5.6-8 2.1Z"/><path d="M12 6.5V21"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    users: '<path d="M16 20v-1.6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.4"/><path d="M22 20v-1.6a4 4 0 0 0-3-3.87"/><path d="M16.5 3.6a4 4 0 0 1 0 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkSquare: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-6"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    grad: '<path d="M22 9 12 4 2 9l10 5 10-5Z"/><path d="M6 11.5V17c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-5.5"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2.5L18 20V4L6.5 10H4a1 1 0 0 0-1 1Z"/><path d="M18 9.2a3 3 0 0 1 0 5.6"/><path d="M7 14.5V19a1.5 1.5 0 0 0 3 0v-3.2"/>',
    pin: '<path d="M9 3h6l-1 6 3.5 3.5H6.5L10 9 9 3Z"/><path d="M12 12.5V21"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 15.5 19.8 18l2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
    speaker: '<path d="M11 5 6.5 9H3v6h3.5L11 19Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
    pencil: '<path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="M14.5 5.5 18.5 9.5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1"/>',
    play: '<path d="M7 4.5 19 12 7 19.5Z"/>',
    inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M4.5 5h15l1.5 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6M4 4l5 5"/>',
    video: '<rect x="2" y="6" width="13" height="12" rx="2.5"/><path d="m15 11 6-3.5v9L15 13Z"/>',
    videoOff: '<rect x="2" y="6" width="13" height="12" rx="2.5"/><path d="m15 11 6-3.5v9L15 13Z"/><path d="M3 3l18 18"/>',
    mic: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21M9 21h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19V8.6A1.8 1.8 0 0 1 5.8 6.8H11"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8.5 8.5v.1M15.5 8.5v.1M12 12v.1M8.5 15.5v.1M15.5 15.5v.1"/>',
    hand: '<path d="M7 11V5.6a1.6 1.6 0 0 1 3.2 0V11"/><path d="M10.2 10.4V4.1a1.6 1.6 0 0 1 3.2 0v6.3"/><path d="M13.4 10.9V6.2a1.6 1.6 0 0 1 3.2 0V14"/><path d="M16.6 10.9a1.6 1.6 0 0 1 3.2 0v3.4c0 3.7-2.6 6.7-6.3 6.7h-1.1c-2.4 0-4-1.1-5.2-3L4 13.4a1.6 1.6 0 0 1 2.6-1.9L7 12"/>',
    present: '<rect x="2.5" y="4" width="19" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
    wallet: '<path d="M3 8.2A2.2 2.2 0 0 1 5.2 6H17a1 1 0 0 0 0-2H6"/><rect x="3" y="6" width="18" height="14" rx="2.6"/><path d="M21 11h-4a2.5 2.5 0 0 0 0 5h4"/><path d="M17.4 13.5v.1"/>',
    receipt: '<path d="M5 3h14v18l-2.3-1.6-2.3 1.6-2.4-1.6L9.6 21l-2.3-1.6L5 21Z"/><path d="M9 8h6M9 12h6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z"/>'
  };

  function icon(name, size) {
    var d = P[name] || '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round"' +
      (size ? ' width="' + size + '" height="' + size + '"' : '') + '>' + d + '</svg>';
  }

  /* ── escaping ─────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── formatting (day and month names come from the active language) ───── */
  function parseDay(iso) {
    var p = String(iso).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function DAYS() { return global.I18n.days(); }
  function MONTHS() { return global.I18n.months(); }

  var fmt = {
    date: function (iso) {
      var d = parseDay(iso);
      return global.I18n.dateShort(DAYS()[d.getDay()], d.getDate(), MONTHS()[d.getMonth()]);
    },
    dateLong: function (iso) {
      var d = parseDay(iso);
      return global.I18n.dateLong(DAYS()[d.getDay()], d.getDate(), MONTHS()[d.getMonth()], d.getFullYear());
    },
    day: function (iso) { return DAYS()[parseDay(iso).getDay()]; },
    rel: function (iso) {
      var a = parseDay(iso), b = parseDay(Store.today());
      var n = Math.round((a - b) / 86400000);
      if (n === 0) return T('Today');
      if (n === 1) return T('Tomorrow');
      if (n === -1) return T('Yesterday');
      return n > 0 ? T('in {n} days', { n: n }) : T('{n} days ago', { n: -n });
    },
    /* Tuition is quoted in tugrik — 180000 reads as 180,000₮ */
    money: function (n) {
      var v = Math.round(+n || 0);
      var body = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (v < 0 ? '−' : '') + body + '₮';
    },
    /* a billing period, "2026-09", in the language of the month names */
    month: function (period) {
      var p = String(period || '').split('-');
      if (p.length < 2) return String(period || '');
      return p[0] + ' · ' + MONTHS()[+p[1] - 1];
    },
    initials: function (name) {
      var p = String(name).trim().split(/[\s-]+/);
      return ((p[0] || '')[0] + (p[1] || '')[0] || '?').toUpperCase();
    }
  };

  /* ── fragments ────────────────────────────────────────── */
  function avatar(user, cls) {
    if (!user) return '';
    return '<div class="av ' + (cls || '') + '" style="background:' + esc(user.color || '#8B8078') + '">' +
      esc(fmt.initials(user.name)) + '</div>';
  }

  var MARK_TAG = { present: 'green', late: 'amber', absent: 'red', excused: 'slate' };
  var MARK_LABEL = { present: 'Present', late: 'Late', absent: 'Absent', excused: 'Excused' };
  function markLabel(m) { return T(MARK_LABEL[m] || m); }
  function markTag(m) {
    if (!m) return '<span class="tag">' + T('Not marked') + '</span>';
    return '<span class="tag tag--' + MARK_TAG[m] + '">' + esc(markLabel(m)) + '</span>';
  }
  function statusTag(l) {
    if (l.status === 'completed') return '<span class="tag tag--green">' + T('Completed') + '</span>';
    if (l.status === 'in_progress') return '<span class="tag tag--red"><span class="dot"></span>' + T('Live') + '</span>';
    if (l.date === Store.today()) return '<span class="tag tag--red">' + T('Today') + '</span>';
    if (l.date < Store.today()) return '<span class="tag tag--amber">' + T('Not closed') + '</span>';
    return '<span class="tag tag--slate">' + T('Scheduled') + '</span>';
  }
  /* Weekdays are stored as English codes ("Mon · Thu") — translate for display. */
  function daysLabel(str) {
    return String(str || '').split(' · ').filter(Boolean).map(function (d) { return T(d); }).join(' · ');
  }

  /* "Lesson 5 of 12" — the position of a lesson inside its own course */
  function lessonNoTag(lesson) {
    var no = Store.lessonNo(lesson);
    return '<span class="tag tag--gold">' + T('Lesson {n} of {total}', { n: no.n, total: no.total }) + '</span>';
  }

  function bar(pct, color) {
    var p = Math.max(0, Math.min(100, pct || 0));
    return '<div class="bar"><i style="width:' + p + '%' + (color ? ';background:' + color : '') + '"></i></div>';
  }

  function ring(pct, label, color) {
    var p = Math.max(0, Math.min(100, pct || 0));
    var R = 46, C = 2 * Math.PI * R;
    return '<svg class="ring" viewBox="0 0 120 120" width="132" height="132">' +
      '<circle cx="60" cy="60" r="' + R + '" stroke="#F2ECE4" stroke-width="12"/>' +
      '<circle cx="60" cy="60" r="' + R + '" stroke="' + (color || 'var(--brand)') + '" stroke-width="12" ' +
        'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - p / 100)).toFixed(1) + '" ' +
        'transform="rotate(-90 60 60)"/>' +
      '<text x="60" y="57" text-anchor="middle" font-size="26" font-weight="700" fill="#1A1614">' + p + '%</text>' +
      '<text x="60" y="76" text-anchor="middle" font-size="11" fill="#8B8078">' + esc(label || '') + '</text>' +
      '</svg>';
  }

  /* series: [{label, value}] — value 0..100 */
  function spark(series) {
    var max = Math.max.apply(null, series.map(function (s) { return s.value; }).concat([1]));
    return '<div class="spark">' + series.map(function (s) {
      return '<div><i style="height:' + Math.max(3, s.value / max * 100) + '%" title="' + esc(s.value) + '"></i>' +
        '<span>' + esc(s.label) + '</span></div>';
    }).join('') + '</div>';
  }

  /* skills radar — {speaking, listening, reading, writing} */
  function radar(p) {
    var keys = ['speaking', 'listening', 'reading', 'writing'];
    var labels = ['Speaking', 'Listening', 'Reading', 'Writing'];
    var cx = 110, cy = 100, R = 68;
    var pts = keys.map(function (k, i) {
      var a = -Math.PI / 2 + i * Math.PI / 2;
      var v = Math.max(0, Math.min(100, p ? p[k] : 0)) / 100;
      return (cx + Math.cos(a) * R * v).toFixed(1) + ',' + (cy + Math.sin(a) * R * v).toFixed(1);
    }).join(' ');
    var web = [0.25, 0.5, 0.75, 1].map(function (f) {
      var q = keys.map(function (k, i) {
        var a = -Math.PI / 2 + i * Math.PI / 2;
        return (cx + Math.cos(a) * R * f).toFixed(1) + ',' + (cy + Math.sin(a) * R * f).toFixed(1);
      }).join(' ');
      return '<polygon points="' + q + '" fill="none" stroke="#EDE6DC" stroke-width="1"/>';
    }).join('');
    var text = keys.map(function (k, i) {
      var a = -Math.PI / 2 + i * Math.PI / 2;
      var x = cx + Math.cos(a) * (R + 24), y = cy + Math.sin(a) * (R + 18);
      return '<text x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" text-anchor="middle" font-size="10.5" fill="#8B8078">' +
        labels[i] + '</text><text x="' + x.toFixed(0) + '" y="' + (y + 13).toFixed(0) + '" text-anchor="middle" ' +
        'font-size="11.5" font-weight="700" fill="#1A1614">' + (p ? p[k] : 0) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 220 200" width="100%" height="200">' + web +
      '<polygon points="' + pts + '" fill="rgba(200,68,60,.18)" stroke="#C8443C" stroke-width="2"/>' +
      text + '</svg>';
  }

  function empty(iconName, title, sub) {
    return '<div class="empty">' + icon(iconName || 'inbox') + '<b>' + esc(title) + '</b>' +
      (sub ? '<div class="tiny">' + esc(sub) + '</div>' : '') + '</div>';
  }

  /* ── modal ────────────────────────────────────────────── */
  var Modal = {
    open: function (opts) {
      var root = document.getElementById('modal-root');
      root.innerHTML =
        '<div class="mask" data-modal-mask>' +
          '<div class="modal' + (opts.wide ? ' modal--wide' : '') + '" role="dialog" aria-modal="true">' +
            '<div class="modal__h"><h3>' + esc(opts.title) + '</h3>' +
              (opts.cn ? gloss(opts.cn) : '') +
              '<span class="sp" style="flex:1"></span>' +
              '<button type="button" data-modal-close aria-label="Close">' + icon('x') + '</button></div>' +
            '<div class="modal__b">' + opts.body + '</div>' +
            (opts.footer === false ? '' :
              '<div class="modal__f">' +
                '<button type="button" class="btn" data-modal-close>' + esc(opts.cancelText || 'Cancel') + '</button>' +
                (opts.okText ? '<button type="button" class="btn btn--pri" data-modal-ok>' + esc(opts.okText) + '</button>' : '') +
              '</div>') +
          '</div></div>';
      Modal._ok = opts.onOk || null;
      var first = root.querySelector('input,select,textarea');
      if (first) setTimeout(function () { first.focus(); }, 30);
    },
    close: function () { document.getElementById('modal-root').innerHTML = ''; Modal._ok = null; },
    body: function () { return document.querySelector('#modal-root .modal__b'); },
    val: function (name) {
      var e = document.querySelector('#modal-root [name="' + name + '"]');
      return e ? e.value.trim() : '';
    }
  };

  /* ── toast ────────────────────────────────────────────── */
  function toast(msg, iconName) {
    var root = document.getElementById('toast-root');
    var d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = icon(iconName || 'check') + '<span>' + esc(msg) + '</span>';
    root.appendChild(d);
    setTimeout(function () {
      d.style.transition = 'opacity .25s, transform .25s';
      d.style.opacity = '0'; d.style.transform = 'translateY(6px)';
      setTimeout(function () { d.remove(); }, 260);
    }, 2400);
  }

  /* ── Chinese text-to-speech (browser built-in, no network) ── */
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('Speech is not available in this browser', 'alert'); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 0.85;
      var v = window.speechSynthesis.getVoices().filter(function (x) { return /zh|Chinese/i.test(x.lang + x.name); })[0];
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  /* The Chinese glosses beside headings exist to teach the word — once the
     interface itself is Chinese they only repeat the heading, so drop them. */
  function gloss(cn, cls) {
    if (global.I18n.get() === 'zh') return '';
    return '<span class="cn muted' + (cls ? ' ' + cls : '') + '">' + esc(cn) + '</span>';
  }

  global.UI = {
    gloss: gloss, icon: icon, esc: esc, fmt: fmt, avatar: avatar, markTag: markTag, markLabel: markLabel,
    statusTag: statusTag, lessonNoTag: lessonNoTag, daysLabel: daysLabel,
    bar: bar, ring: ring, spark: spark, radar: radar, empty: empty,
    Modal: Modal, toast: toast, speak: speak
  };
})(window);
