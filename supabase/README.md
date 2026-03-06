# Supabase Setup

## Running Migrations

### Option 1: Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and select your project
2. Open **SQL Editor**
3. Copy the contents of `migrations/20250306120000_initial_schema.sql`
4. Paste and run

### Option 2: Supabase CLI

```bash
npx supabase init   # if not already initialized
npx supabase link   # link to your remote project
npx supabase db push
```

## Environment Variables

Ensure `.env.local` contains:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
