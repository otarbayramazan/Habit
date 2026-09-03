import { useState, useMemo } from 'react';
import { useHabits } from '@/hooks/useHabits';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import { ChevronDown, Check, Flame, Trophy, CalendarCheck, Percent, BarChart3 } from 'lucide-react';
import {
  formatDate,
  addDays,
  startOfWeek,
  parseDate,
  countCompletedDays,
  completionRate,
  calculateFrequencyStreak,
  calculateBestStreak,
  getMonthlyCounts,
} from '@/lib/dateUtils';
import type { HabitWithCompletions, FrequencyType } from '@/lib/supabase';
import type { Language } from '@/context/SettingsContext';

export function StatisticsScreen() {
  const { habits, loading } = useHabits();
  const { language } = useSettings();
  const t = useT(language as Language);
  const [selectedId, setSelectedId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedHabit = useMemo<HabitWithCompletions | null>(() => {
    if (habits.length === 0) return null;
    return habits.find((h) => h.id === selectedId) ?? habits[0];
  }, [habits, selectedId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-20 h-20 rounded-3xl bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-neutral-600" />
        </div>
        <h3 className="text-white font-semibold text-base">{t('noHabits')}</h3>
        <p className="text-neutral-500 text-sm mt-1 max-w-xs">{t('noHabitsDesc')}</p>
      </div>
    );
  }

  const color = selectedHabit?.color ?? '#4f46e5';
  const completions = selectedHabit?.completions ?? {};
  const target = selectedHabit?.target_count ?? 1;
  const year = new Date().getFullYear();

  const completed = countCompletedDays(completions, target);
  const rate = completionRate(completions, target, selectedHabit?.created_at ?? formatDate(new Date()));
  const freqType: FrequencyType = selectedHabit?.frequency_type ?? 'everyday';
  const freqDays: number[] = selectedHabit?.frequency_days ?? [];
  const currentStreak = calculateFrequencyStreak(completions, target, freqType, freqDays);
  const bestStreak = calculateBestStreak(completions, target);
  const monthlyCounts = getMonthlyCounts(completions, target, year);

  const monthLabels = [t('jan'), t('feb'), t('mar'), t('apr'), t('may'), t('jun'), t('jul'), t('aug'), t('sep'), t('oct'), t('nov'), t('dec')];

  return (
    <div className="px-4 pt-6 pb-32 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-5">{t('statistics')}</h1>

      {/* Habit selector dropdown */}
      <div className="relative mb-5">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl px-4 py-3.5 flex items-center justify-between hover:border-[#262626] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ backgroundColor: `${color}1a` }}
            >
              {selectedHabit?.emoji}
            </div>
            <span className="text-white font-medium text-sm">{selectedHabit?.title}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {dropdownOpen && (
          <div className="absolute z-30 top-full mt-1 w-full bg-[#1a1a1a] border border-[#262626] rounded-2xl shadow-2xl py-1 max-h-64 overflow-y-auto">
            {habits.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setSelectedId(h.id);
                  setDropdownOpen(false);
                }}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#262626] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                    style={{ backgroundColor: `${h.color}1a` }}
                  >
                    {h.emoji}
                  </div>
                  <span className="text-white text-sm font-medium">{h.title}</span>
                </div>
                {h.id === (selectedHabit?.id ?? '') && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Year heatmap */}
      <YearHeatmap completions={completions} target={target} color={color} year={year} />

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 mt-5">
        <MetricCard
          icon={<CalendarCheck className="w-4 h-4" />}
          value={completed}
          label={t('completedDays')}
          color={color}
        />
        <MetricCard
          icon={<Percent className="w-4 h-4" />}
          value={`${rate}%`}
          label={t('completionRate')}
          color={color}
        />
        <MetricCard
          icon={<Flame className="w-4 h-4" />}
          value={currentStreak}
          label={t('currentStreak')}
          color={color}
        />
        <MetricCard
          icon={<Trophy className="w-4 h-4" />}
          value={bestStreak}
          label={t('bestStreak')}
          color={color}
        />
      </div>

      {/* Monthly line chart */}
      <MonthlyLineChart data={monthlyCounts} labels={monthLabels} color={color} />
    </div>
  );
}

function MetricCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl bg-[#0d0d0d] border p-4 transition-colors"
      style={{ borderColor: `${color}22` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-neutral-500 text-xs mt-1">{label}</p>
    </div>
  );
}

function YearHeatmap({
  completions,
  target,
  color,
  year,
}: {
  completions: Record<string, number>;
  target: number;
  color: string;
  year: number;
}) {
  const firstDay = parseDate(`${year}-01-01`);
  const start = startOfWeek(firstDay);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getIntensity = (d: Date): number => {
    if (d.getFullYear() !== year) return -1;
    const count = completions[formatDate(d)] ?? 0;
    if (count >= target) return 1;
    if (count > 0) return 0.4;
    return 0;
  };

  return (
    <div
      className="rounded-2xl bg-[#0d0d0d] border p-4"
      style={{ borderColor: `${color}22` }}
    >
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px] min-w-max">
          {Array.from({ length: 53 }, (_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const d = addDays(addDays(start, weekIdx * 7), dayIdx);
                const intensity = getIntensity(d);
                if (intensity === -1) {
                  return <div key={dayIdx} className="w-2.5 h-2.5 rounded-sm" />;
                }
                return (
                  <div
                    key={dayIdx}
                    className="w-2.5 h-2.5 rounded-sm transition-colors"
                    style={{
                      backgroundColor:
                        intensity === 1
                          ? color
                          : intensity === 0.4
                            ? `${color}66`
                            : '#1a1a1a',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px] text-neutral-600">Less</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-[#1a1a1a]" />
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: `${color}66` }} />
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-[10px] text-neutral-600">More</span>
      </div>
    </div>
  );
}

function MonthlyLineChart({
  data,
  labels,
  color,
}: {
  data: number[];
  labels: string[];
  color: string;
}) {
  const width = 340;
  const height = 160;
  const padding = { top: 20, right: 10, bottom: 30, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data, 1);

  const points = data.map((val, i) => ({
    x: padding.left + (i / 11) * chartW,
    y: padding.top + chartH - (val / maxVal) * chartH,
  }));

  // Build smooth curve path (Catmull-Rom to Bezier)
  const smoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = smoothPath(points);
  const fillPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
    : '';

  const gradientId = `chart-gradient-${color.replace('#', '')}`;

  return (
    <div
      className="rounded-2xl bg-[#0d0d0d] border p-4"
      style={{ borderColor: `${color}22` }}
    >
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={padding.left}
            y1={padding.top + chartH * f}
            x2={padding.left + chartW}
            y2={padding.top + chartH * f}
            stroke="#1a1a1a"
            strokeWidth="1"
          />
        ))}

        {/* Fill */}
        {fillPath && <path d={fillPath} fill={`url(#${gradientId})`} />}

        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            {data[i] > 0 && (
              <circle
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#0d0d0d"
                stroke={color}
                strokeWidth="2"
              />
            )}
          </g>
        ))}

        {/* Month labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={padding.left + (i / 11) * chartW}
            y={height - 8}
            fill="#525252"
            fontSize="8"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
