/* ERA Chinese — where the school is kept.

   Leave this as it is and the app runs exactly as it always has: everything in
   this browser's localStorage, one device, no account anywhere. That is fine
   for trying it out and useless for running a school.

   Fill it in and the school moves to Supabase: one database every device
   signs in to, passwords handled by the server, and each student able to read
   only their own records.

   To fill it in:
     1. Make a free project at supabase.com
     2. Open the SQL editor and run supabase/schema.sql from this repo
     3. Settings → API: copy the Project URL and the anon public key below

   The anon key belongs in the browser — it is public by design and identifies
   the project, not a person. What keeps one student out of another's grades is
   the row-level security in schema.sql, not the secrecy of this key. Never put
   the service_role key here: it bypasses all of it. */
window.CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
