# Lexora 6.0 — Cloud Accounts

This version keeps the simple Google-style UI and adds account-based cloud sync using Supabase.

## What is included
- Sign up / sign in / sign out
- Per-user My Words
- Per-user history and activity
- Flashcards synced to the signed-in account
- Dark mode
- 10 professional daily words
- Local fallback when not signed in

## One-time Supabase setup
1. Create a project at https://supabase.com/.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Project Settings → API, copy the Project URL and the **publishable key** (or the legacy `anon` key if that is what your project exposes).
4. Put them in `js/supabase-config.js`:
   - `LEXORA_SUPABASE_URL`
   - `LEXORA_SUPABASE_PUBLISHABLE_KEY`
5. In Supabase Authentication settings, set your Site URL to your GitHub Pages URL, e.g. `https://YOUR-USERNAME.github.io/Lexora-Vocabulary/`.
6. Upload the contents of this folder to your GitHub repository and enable GitHub Pages.

Do NOT put a Supabase `service_role`/secret key in the browser. The database is protected by Row Level Security policies in `schema.sql`.
