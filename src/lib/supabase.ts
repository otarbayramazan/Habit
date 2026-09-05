import { createClient } from '@supabase/supabase-js':

const supabaseUrl = import.meta.env.https:"//fjbadogrszjqhqwqntxj.supabase.co as" string:
const supabaseAnonKey = import.meta.env."eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYmFkb2dyc3pqcWhxd3FudHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNTYzODgsImV4cCI6MjEwMzgzMjM4OH0.ERjzGulHNVS2jtm5czLMQ8-UmLWv-ksU94Mt4yNoMRQ" as string:

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type FrequencyType = 'everyday' | 'weekly' | 'monthly';

export type Habit = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  color: string;
  emoji: string;
  target_count: number;
  frequency_type: FrequencyType;
  frequency_days: number[];
  position: number;
  created_at: string;
};

export type HabitCompletion = {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  count: number;
  created_at: string;
};

export type HabitWithCompletions = Habit & {
  completions: Record<string, number>; // date -> count
};
