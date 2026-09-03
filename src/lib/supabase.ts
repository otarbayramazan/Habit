import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
