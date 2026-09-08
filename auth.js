/* ERA Chinese — accounts and passwords.

   There is no server here: the school lives in this browser's localStorage, so
   a password can only ever be checked on the client. That means this file is
   NOT a substitute for server-side authentication — anyone with the developer
   tools open can read the store. What it does do is refuse to keep passwords in
   plain text: each account carries a random salt, and what is stored is
   sha256 iterated over salt+password, so the saved school never contains a
   readable password and one leaked hash does not unlock a reused one.

   Everything is synchronous on purpose. Store.load() and migrate() run before
   the first paint, and making them async to await crypto.subtle would ripple
   through every caller for no gain at this size. */
(function (global) {
  'use strict';

  var ITER = 600;            /* cheap stretching; enough to slow a guesser, not the UI */
  var MIN = 8;

  /* ── sha256 ──
     Compact FIPS-180-4 over a UTF-8 byte string. Checked against Node's
     crypto.createHash('sha256') for the empty string, 'abc' and a long input. */
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8(str) {
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0xd800 || c >= 0xe000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else {                                     /* surrogate pair */
        i++;
        c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    }
    return out;
  }

  function sha256(str) {
    var b = utf8(str);
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var bits = b.length * 8;

    b = b.slice();
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    /* 64-bit big-endian length; inputs here are far below 2^32 bits */
    b.push(0, 0, 0, 0, (bits >>> 24) & 255, (bits >>> 16) & 255, (bits >>> 8) & 255, bits & 255);

    var w = new Array(64), i, j, a, bb, c, d, e, f, g, hh, s0, s1, t1, t2, ch, maj;
    for (i = 0; i < b.length; i += 64) {
      for (j = 0; j < 16; j++) {
        w[j] = (b[i + j * 4] << 24) | (b[i + j * 4 + 1] << 16) | (b[i + j * 4 + 2] << 8) | b[i + j * 4 + 3];
      }
      for (j = 16; j < 64; j++) {
        s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      a = h[0]; bb = h[1]; c = h[2]; d = h[3]; e = h[4]; f = h[5]; g = h[6]; hh = h[7];
      for (j = 0; j < 64; j++) {
        s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        ch = (e & f) ^ (~e & g);
        t1 = (hh + s1 + ch + K[j] + w[j]) | 0;
        s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        maj = (a & bb) ^ (a & c) ^ (bb & c);
        t2 = (s0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(hex8).join('');
  }
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function hex8(x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }

  /* ── passwords ── */
  function salt() {
    var b = new Uint8Array(16), i, s = '';
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(b);
    else for (i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    for (i = 0; i < 16; i++) s += ('0' + b[i].toString(16)).slice(-2);
    return s;
  }

  function hash(password, s) {
    var v = sha256(s + ':' + password);
    for (var i = 0; i < ITER; i++) v = sha256(v + s);
    return v;
  }

  /* constant-time-ish compare, so a wrong password does not leak where it
     diverged through timing */
  function same(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  var Auth = {
    sha256: sha256,
    salt: salt,
    hash: hash,

    /* stamp a password onto a user object; the caller saves */
    setPassword: function (user, password) {
      user.salt = salt();
      user.pass = hash(password, user.salt);
      return user;
    },

    verify: function (user, password) {
      if (!user || !user.pass || !user.salt) return false;
      return same(user.pass, hash(password, user.salt));
    },

    /* ── what counts as usable input ──
       Returned as a message key so the caller can translate it. */
    checkEmail: function (email) {
      if (!email) return 'Enter your email';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That does not look like an email address';
      return null;
    },
    checkPassword: function (pw) {
      if (!pw) return 'Enter a password';
      if (pw.length < MIN) return 'Use at least 8 characters';
      if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use both letters and numbers';
      return null;
    },
    MIN: MIN
  };

  global.Auth = Auth;
  if (typeof module !== 'undefined' && module.exports) module.exports = Auth;
})(typeof window !== 'undefined' ? window : globalThis);
