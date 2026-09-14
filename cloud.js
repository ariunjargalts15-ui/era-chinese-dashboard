/* ERA Chinese — signing in and staying in sync when the school lives in Supabase.

   Two things move to the server here, and they are the two that could never
   work on one device:

   Passwords. Supabase Auth holds them, hashed, server-side. auth.js and its
   client-side hashing stay for the localStorage mode, but when this is
   configured no password is ever checked in the browser.

   Roles. A registration always produces a student. Not because this file says
   so — because the trigger in schema.sql writes the role, and the browser has
   no say in it. A student who edits the request, the page, or the database call
   still cannot make themselves staff.

   Everything else stays where it was: the app reads one object in memory, and
   db.js keeps that object the same on every device. */
(function (global) {
  'use strict';

  /* What Supabase said, in words a student can act on. A wrong password and
     an unknown address still get the same sentence — telling a stranger which
     half they got right tells them who has an account — but an unconfirmed
     email, a rate limit or a dead connection each get their own, because
     "wrong password" there sends people round in circles. */
  function authMessage(err, kind) {
    var m = String((err && err.message) || '');
    var code = String((err && (err.code || err.error_code)) || '');
    if (/email.*not.*confirmed/i.test(m) || code === 'email_not_confirmed') {
      return 'Confirm your email first — open the link we sent you';
    }
    if (/rate limit|too many|over_email_send_rate/i.test(m + code)) {
      return kind === 'signup'
        ? 'Too many sign-ups in a short time. Try again in a few minutes.'
        : 'Too many attempts. Wait a minute and try again.';
    }
    if (/already registered|already exists|user_already_exists/i.test(m + code)) {
      return 'An account with that email already exists';
    }
    if (/password/i.test(m) && kind === 'signup') return 'That password is too weak';
    if (/signups? not allowed|signup_disabled/i.test(m + code)) return 'Registration is closed';
    if (/fetch|network|failed to/i.test(m)) return 'Could not reach the school. Check your internet connection.';
    if (/invalid.*(credentials|login|email)/i.test(m) || kind === 'signin') return 'Wrong email or password';
    return 'Something went wrong';
  }

  var Cloud = {
    authMessage: authMessage,
    client: null,
    ready: false,
    channel: null,

    configured: function () {
      var c = global.CONFIG || {};
      return !!(c.supabaseUrl && c.supabaseAnonKey && global.supabase);
    },

    /* Returns null when there is nothing to connect to, which is how the rest
       of the app knows to stay on localStorage. */
    init: function () {
      if (this.client) return this.client;
      if (!this.configured()) return null;
      this.client = global.supabase.createClient(
        global.CONFIG.supabaseUrl, global.CONFIG.supabaseAnonKey,
        { auth: { persistSession: true, autoRefreshToken: true } }
      );
      global.DB.attach(this.client);
      return this.client;
    },

    /* ── who is signed in ──
       Supabase keeps the session in localStorage and refreshes it, so this
       survives a reload and a closed laptop. It is per browser, not per tab —
       unlike the localStorage mode, where two tabs could hold two accounts. */
    session: function () {
      var c = this.client;
      if (!c) return Promise.resolve(null);
      return c.auth.getSession().then(function (res) {
        return (res && res.data && res.data.session) || null;
      });
    },

    signIn: function (email, password) {
      var c = this.client;
      return c.auth.signInWithPassword({
        email: String(email || '').trim(), password: password || ''
      }).then(function (res) {
        if (res.error) return { error: authMessage(res.error, 'signin') };
        return { session: res.data.session };
      }, function () {
        return { error: 'Could not reach the school. Check your internet connection.' };
      });
    },

    register: function (data) {
      var c = this.client;
      var A = global.Auth;
      var name = String(data.name || '').trim();
      var email = String(data.email || '').trim();
      if (!name) return Promise.resolve({ error: 'Enter your name' });
      var bad = A.checkEmail(email) || A.checkPassword(data.password);
      if (bad) return Promise.resolve({ error: bad });
      if (data.password !== data.confirm) {
        return Promise.resolve({ error: 'The two passwords do not match' });
      }
      return c.auth.signUp({
        email: email, password: data.password,
        /* the trigger reads these; it ignores anything that would set a role */
        options: { data: { name: name, wants_class_id: data.wantsClassId || null } }
      }).then(function (res) {
        if (res.error) return { error: authMessage(res.error, 'signup') };
        var user = res.data && res.data.user;
        /* With confirmation on, Supabase answers an already-registered address
           with a user that has no identities instead of an error, so nobody
           can probe which addresses exist. For our own form that silence would
           send the person to wait for an email that is never coming. */
        if (user && Array.isArray(user.identities) && user.identities.length === 0) {
          return { error: 'An account with that email already exists' };
        }
        /* confirmation is on: no session until the link in the email is used */
        if (!res.data.session) return { confirm: true, email: email };
        return { session: res.data.session };
      }, function () {
        return { error: 'Could not reach the school. Check your internet connection.' };
      });
    },

    /* Staff cannot create someone else's login from a browser — that needs the
       service key, which must never be here. What a teacher can do is leave an
       invitation: when that person signs up with the address, the trigger in
       schema.sql gives them the name and role the school recorded. */
    invite: function (data) {
      var A = global.Auth;
      var email = String(data.email || '').trim().toLowerCase();
      var name = String(data.name || '').trim();
      if (!name) return { error: 'Enter your name' };
      var bad = A.checkEmail(email);
      if (bad) return { error: bad };
      if (global.Store.userByEmail(email)) return { error: 'An account with that email already exists' };
      return global.Store.addInvite({
        email: email, name: name, cn: data.cn || '', role: 'student',
        title: data.title || '', wantsClassId: data.wantsClassId || null
      });
    },

    signOut: function () {
      var c = this.client;
      if (this.channel) { try { c.removeChannel(this.channel); } catch (e) {} this.channel = null; }
      var live = global.Live && global.Live.sync;
      if (live && live.channel) { try { c.removeChannel(live.channel); } catch (e) {} live.channel = null; }
      return c ? c.auth.signOut().catch(function () {}) : Promise.resolve();
    },

    changePassword: function (password) {
      var bad = global.Auth.checkPassword(password);
      if (bad) return Promise.resolve({ error: bad });
      return this.client.auth.updateUser({ password: password }).then(function (res) {
        return res.error ? { error: res.error.message } : { ok: true };
      });
    },

    /* ── keeping the school the same everywhere ── */
    hydrate: function () { return global.DB.hydrate(); },

    watch: function (onChange) {
      if (this.channel || !this.client) return;
      this.channel = global.DB.subscribe(onChange);
    }
  };

  global.Cloud = Cloud;
  if (typeof module !== 'undefined' && module.exports) module.exports = Cloud;
})(typeof window !== 'undefined' ? window : globalThis);
