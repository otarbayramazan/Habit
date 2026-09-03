import { useCallback, useEffect, useState } from 'react';
import { supabase, type Habit, type HabitCompletion, type HabitWithCompletions, type FrequencyType } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [habitRes, compRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).order('position', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('habit_completions').select('*').eq('user_id', user.id),
    ]);
    if (habitRes.data) setHabits(habitRes.data as Habit[]);
    if (compRes.data) setCompletions(compRes.data as HabitCompletion[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const habitsWithCompletions: HabitWithCompletions[] = habits.map((h) => ({
    ...h,
    completions: Object.fromEntries(
      completions
        .filter((c) => c.habit_id === h.id)
        .map((c) => [c.date, c.count])
    ),
  }));

  const createHabit = async (data: {
    title: string;
    description: string;
    color: string;
    emoji: string;
    target_count: number;
    frequency_type?: FrequencyType;
    frequency_days?: number[];
  }) => {
    const maxPos = habits.reduce((mx, h) => Math.max(mx, h.position), 0);
    const { data: row, error } = await supabase
      .from('habits')
      .insert({
        title: data.title,
        description: data.description,
        color: data.color,
        emoji: data.emoji,
        target_count: data.target_count,
        frequency_type: data.frequency_type ?? 'everyday',
        frequency_days: data.frequency_days ?? [],
        position: maxPos + 1,
      })
      .select()
      .single();
    if (error) throw error;
    if (row) setHabits((prev) => [...prev, row as Habit]);
    return row;
  };

  const updateHabit = async (
    id: string,
    data: Partial<Pick<Habit, 'title' | 'description' | 'color' | 'emoji' | 'target_count' | 'frequency_type' | 'frequency_days'>>
  ) => {
    const { data: row, error } = await supabase.from('habits').update(data).eq('id', id).select().single();
    if (error) throw error;
    if (row) {
      setHabits((prev) => prev.map((h) => (h.id === id ? (row as Habit) : h)));
    }
  };

  const deleteHabit = async (id: string) => {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) throw error;
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setCompletions((prev) => prev.filter((c) => c.habit_id !== id));
  };

  const reorderHabits = useCallback(async (orderedIds: string[]) => {
    // Optimistic update
    setHabits((prev) => {
      const map = new Map(prev.map((h) => [h.id, h]));
      return orderedIds
        .map((id, idx) => {
          const h = map.get(id);
          return h ? { ...h, position: idx + 1 } : null;
        })
        .filter((h): h is Habit => h !== null);
    });

    // Persist to Supabase
    try {
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from('habits').update({ position: idx + 1 }).eq('id', id)
        )
      );
    } catch {
      // Re-fetch on error to restore correct order
      fetchAll();
    }
  }, [fetchAll]);

  const toggleCompletion = async (habitId: string, date: string, target: number) => {
    if (!user) return;
    const existing = completions.find((c) => c.habit_id === habitId && c.date === date);

    if (existing) {
      if (existing.count >= target) {
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
      } else {
        const newCount = existing.count + 1;
        const { error } = await supabase
          .from('habit_completions')
          .update({ count: newCount })
          .eq('id', existing.id);
        if (error) throw error;
        setCompletions((prev) =>
          prev.map((c) => (c.id === existing.id ? { ...c, count: newCount } : c))
        );
      }
    } else {
      const { data: row, error } = await supabase
        .from('habit_completions')
        .insert({ habit_id: habitId, date, count: 1 })
        .select()
        .single();
      if (error) throw error;
      setCompletions((prev) => [...prev, row as HabitCompletion]);
    }
  };

  return {
    habits: habitsWithCompletions,
    rawHabits: habits,
    completions,
    loading,
    createHabit,
    updateHabit,
    deleteHabit,
    reorderHabits,
    toggleCompletion,
    refetch: fetchAll,
  };
}
