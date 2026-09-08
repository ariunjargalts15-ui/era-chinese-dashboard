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

  var Cloud = {
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
        /* One message for a wrong password and an unknown address alike, the
           same as the local path: telling a stranger which they got right
           tells them who has an account here. */
        if (res.error) return { error: 'Wrong email or password' };
        return { session: res.data.session };
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
        if (res.error) {
          return { error: /registered|exists/i.test(res.error.message)
            ? 'An account with that email already exists'
            : res.error.message };
        }
        /* With email confirmation switched on there is no session yet, and the
           person has to click a link before they can get in. Say so rather
           than dropping them on a sign-in form that will not work. */
        if (!res.data.session) return { confirm: true };
        return { session: res.data.session };
      });
    },

    signOut: function () {
      var c = this.client;
      if (this.channel) { try { c.removeChannel(this.channel); } catch (e) {} this.channel = null; }
      return c ? c.auth.signOut() : Promise.resolve();
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
