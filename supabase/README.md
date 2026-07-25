# QADAM AI Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `migrations/202607250001_auth_history.sql`.
3. In **Authentication > Providers > Email**, keep Email/Password enabled.
4. Add the project URL and publishable (or legacy anon) key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

Never expose the `service_role` key in the browser or Sites environment.

The `analysis_history` table has Row Level Security enabled. Authenticated users
can select, insert, and delete only rows whose `user_id` matches their Supabase
user ID.
