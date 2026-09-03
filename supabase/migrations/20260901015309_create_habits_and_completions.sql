/*
# Create habits and habit_completions tables

## Overview
Creates the core data model for a multi-user habit tracker.
Each user owns their habits; each habit has a target number of
daily completions; each completion log records the date and count
of completions for that habit on that day.

## New Tables

### habits
- id (uuid, PK)
- user_id (uuid, FK -> auth.users, NOT NULL, defaults to auth.uid())
- title (text, NOT NULL)
- description (text, default '')
- color (text, default '#4f46e5') — hex accent color
- emoji (text, default '🎯') — emoji icon
- target_count (int, default 1) — completions per day goal
- created_at (timestamptz, default now())

### habit_completions
- id (uuid, PK)
- habit_id (uuid, FK -> habits ON DELETE CASCADE)
- user_id (uuid, FK -> auth.users, NOT NULL, defaults to auth.uid())
- date (date, NOT NULL) — the calendar day this completion is for
- count (int, default 1) — number of completions logged that day
- created_at (timestamptz, default now())
- UNIQUE(habit_id, date) — one row per habit per day

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD: users can only access rows where user_id = auth.uid().
- habit_completions also scoped directly by user_id (not through parent)
  since every row carries its own user_id.

## Notes
- user_id defaults to auth.uid() so frontend inserts that omit user_id succeed.
- Cascade delete: deleting a habit removes its completions automatically.
- One completion row per habit per day; the frontend increments/decrements count.
*/

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#4f46e5',
  emoji text NOT NULL DEFAULT '🎯',
  target_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_habits" ON habits;
CREATE POLICY "select_own_habits" ON habits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_habits" ON habits;
CREATE POLICY "insert_own_habits" ON habits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_habits" ON habits;
CREATE POLICY "update_own_habits" ON habits
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_habits" ON habits;
CREATE POLICY "delete_own_habits" ON habits
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(habit_id, date)
);

ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_completions" ON habit_completions;
CREATE POLICY "select_own_completions" ON habit_completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_completions" ON habit_completions;
CREATE POLICY "insert_own_completions" ON habit_completions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_completions" ON habit_completions;
CREATE POLICY "update_own_completions" ON habit_completions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_completions" ON habit_completions;
CREATE POLICY "delete_own_completions" ON habit_completions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_completions_date ON habit_completions(date);
