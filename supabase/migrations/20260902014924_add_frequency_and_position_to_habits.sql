/*
# Add frequency and position columns to habits

## Overview
Adds frequency scheduling and manual reordering support to habits.
Previously all habits were treated as daily (every day). Now each habit
can specify a frequency type: everyday, specific days of week, or specific
days of month. A position column enables user-controlled drag ordering.

## Modified Tables

### habits
- frequency_type (text, NOT NULL, default 'everyday')
    Values: 'everyday' | 'weekly' | 'monthly'
    - 'everyday': habit is scheduled every day
    - 'weekly': habit is scheduled on specific weekdays listed in frequency_days
    - 'monthly': habit is scheduled on specific days-of-month listed in frequency_days
- frequency_days (int[], NOT NULL, default '{}')
    - For 'weekly': array of weekday numbers 0–6 (0=Sunday, 1=Monday, … 6=Saturday)
    - For 'monthly': array of day-of-month numbers 1–31
    - For 'everyday': empty array (ignored)
- position (int, NOT NULL, default 0)
    Manual sort order. Lower = higher on screen.

## Security
- No new policies needed. Existing owner-scoped CRUD policies on habits
  already cover the new columns — users can only read/update/insert/delete
  their own habits.

## Notes
1. All columns have safe defaults so existing rows and existing frontend
   inserts continue to work without modification.
2. frequency_days uses PostgreSQL int[] (integer array). The frontend will
   pass a JS array; supabase-js serializes it correctly.
3. position defaults to 0; the frontend will assign sequential positions
   when reordering. Initial load orders by position then created_at.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'frequency_type') THEN
    ALTER TABLE habits ADD COLUMN frequency_type text NOT NULL DEFAULT 'everyday';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'frequency_days') THEN
    ALTER TABLE habits ADD COLUMN frequency_days int[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'habits' AND column_name = 'position') THEN
    ALTER TABLE habits ADD COLUMN position int NOT NULL DEFAULT 0;
  END IF;
END $$;
