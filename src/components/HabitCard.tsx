import { useState, useRef, useEffect } from 'react';
import type { HabitWithCompletions, FrequencyType } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useT } from '@/lib/i18n';
import { Flame, Check, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  formatDate, addDays, startOfWeek, getWeekDays, getMonthGrid,
  parseDate, startOfMonth, isScheduledOn,
  getChainSegments, calculateFrequencyStreak,
} from '@/lib/dateUtils';

type ViewType = 'week' | 'month' | 'year';

type Props = {
  habit: HabitWithCompletions;
  view: ViewType;
  onToggle: (habitId: string, date: string, target: number) => void;
  onEdit: (habit: HabitWithCompletions) => void;
  onDelete: (habit: HabitWithCompletions) => void;
  jiggleMode?: boolean;
  jiggleIndex?: number;
  isDragging?: boolean;
  onLongPress?: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
};

// Whether this habit has rest days (non-everyday frequency)
function hasRestDays(freqType: FrequencyType): boolean {
  return freqType !== 'everyday';
}

// ── Square checkbox cell ──
function SquareCell({
  count,
  target,
  color,
  isToday,
  isPast,
  isFuture,
  isScheduled,
  size,
  onClick,
  locked,
}: {
  count: number;
  target: number;
  color: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isScheduled: boolean;
  size: 'sm' | 'md';
  onClick: () => void;
  locked: boolean;
}) {
  const completed = count >= target;
  const partial = count > 0 && count < target;
  const isMulti = target > 1;
  const dim = size === 'sm' ? 'w-full aspect-square rounded-[3px]' : 'rounded-md';
  const isLocked = locked || isPast || isFuture;

  // Non-scheduled day in a rest-day habit: empty space, band passes through
  if (!isScheduled) {
    return <div className={`${dim}`} style={{ width: '100%', aspectRatio: '1' }} />;
  }

  if (isLocked) {
    return (
      <div
        className={`relative ${dim} flex items-center justify-center ${isToday ? 'ring-1 ring-white/40' : ''}`}
        style={{
          backgroundColor: completed ? color : partial ? `${color}40` : '#1a1a1a',
          width: '100%',
          aspectRatio: '1',
          opacity: isFuture ? 0.2 : completed || partial ? 0.6 : 0.3,
        }}
      >
        {completed && !isMulti && (
          <Check className={size === 'sm' ? 'w-2 h-2 text-white' : 'w-3 h-3 text-white'} strokeWidth={3} />
        )}
        {isMulti && count > 0 && (
          <span
            className={`${size === 'sm' ? 'text-[7px]' : 'text-[9px]'} font-bold leading-none text-white`}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {count}/{target}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`relative ${dim} transition-all active:scale-90 flex items-center justify-center cursor-pointer hover:brightness-125 ${
        isToday ? 'ring-1 ring-white/40' : ''
      }`}
      style={{
        backgroundColor: completed ? color : partial ? `${color}40` : '#1a1a1a',
        width: '100%',
        aspectRatio: '1',
      }}
    >
      {completed && !isMulti && (
        <Check className={size === 'sm' ? 'w-2 h-2 text-white' : 'w-3 h-3 text-white'} strokeWidth={3} />
      )}
      {isMulti && count > 0 && (
        <span
          className={`${size === 'sm' ? 'text-[7px]' : 'text-[9px]'} font-bold leading-none text-white`}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {count}/{target}
        </span>
      )}
    </button>
  );
}

// ── WEEK VIEW with chain band ──
function WeekView({
  dates,
  completions,
  target,
  color,
  frequencyType,
  frequencyDays,
  dayLabels,
  today,
  onToggle,
  jiggleMode,
}: {
  dates: Date[];
  completions: Record<string, number>;
  target: number;
  color: string;
  frequencyType: FrequencyType;
  frequencyDays: number[];
  dayLabels: string[];
  today: Date;
  onToggle: (date: string) => void;
  jiggleMode: boolean;
}) {
  const isFuture = (d: Date) => d > today;
  const isPast = (d: Date) => d < today;
  const isToday = (d: Date) => formatDate(d) === formatDate(today);
  const showBand = hasRestDays(frequencyType);

  // Build chain segments — only if habit has rest days
  const segments = showBand
    ? getChainSegments(dates, completions, target, frequencyType, frequencyDays)
    : [];

  // SVG coordinates: 7 columns, each cell is cellW percent wide
  const cellW = 100 / 7;
  const lineY = 50;
  // Band thickness: slightly thinner than cell height. Cell height in % is 100,
  // but we use the actual pixel approach — the SVG viewBox is 0 0 100 100 with
  // preserveAspectRatio none, so strokeWidth is in user units. We want the band
  // to be ~80% of the square's height. The squares fill the full cell height,
  // so band = 80 (out of 100 viewBox height).
  const bandThickness = 80;

  return (
    <div className="relative">
      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {dates.map((d, i) => (
          <span key={i} className="text-[10px] text-neutral-500 font-medium text-center">
            {dayLabels[i]}
          </span>
        ))}
      </div>

      <div className="relative" style={{ minHeight: '36px' }}>
        {/* Chain band SVG (behind cells) */}
        {showBand && segments.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ overflow: 'visible', zIndex: 1 }}
          >
            {segments.map((seg, i) => {
              const x1 = seg.startIdx * cellW + cellW / 2;
              const x2 = seg.endIdx * cellW + cellW / 2;
              // Only draw if there's a gap (more than 1 cell apart)
              if (seg.endIdx <= seg.startIdx) return null;
              return (
                <rect
                  key={i}
                  x={Math.min(x1, x2)}
                  y={lineY - bandThickness / 2}
                  width={Math.abs(x2 - x1)}
                  height={bandThickness}
                  fill={color}
                  rx={2}
                  opacity={0.85}
                />
              );
            })}
          </svg>
        )}

        {/* Square cells (above band) */}
        <div className="relative grid grid-cols-7 gap-1.5" style={{ zIndex: 2 }}>
          {dates.map((d, i) => {
            const scheduled = isScheduledOn(d, frequencyType, frequencyDays);
            const locked = jiggleMode || isFuture(d) || isPast(d);
            return (
              <div key={i} className="flex flex-col items-center">
                <SquareCell
                  count={completions[formatDate(d)] ?? 0}
                  target={target}
                  color={color}
                  isToday={isToday(d)}
                  isPast={isPast(d)}
                  isFuture={isFuture(d)}
                  isScheduled={scheduled}
                  size="md"
                  onClick={() => {
                    if (jiggleMode || isFuture(d) || isPast(d)) return;
                    onToggle(formatDate(d));
                  }}
                  locked={locked}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MONTH VIEW with chain band ──
function MonthView({
  weeks,
  completions,
  target,
  color,
  frequencyType,
  frequencyDays,
  currentMonth,
  today,
  onToggle,
  jiggleMode,
}: {
  weeks: Date[][];
  completions: Record<string, number>;
  target: number;
  color: string;
  frequencyType: FrequencyType;
  frequencyDays: number[];
  currentMonth: number;
  today: Date;
  onToggle: (date: string) => void;
  jiggleMode: boolean;
}) {
  const isFuture = (d: Date) => d > today;
  const isPast = (d: Date) => d < today;
  const isToday = (d: Date) => formatDate(d) === formatDate(today);
  const showBand = hasRestDays(frequencyType);

  const allDates = weeks.flat();
  const segments = showBand
    ? getChainSegments(allDates, completions, target, frequencyType, frequencyDays)
    : [];

  const cols = 7;
  const rows = weeks.length;
  const cellWPct = 100 / cols;
  const cellHPct = 100 / rows;
  // Band thickness in viewBox units — ~75% of cell height
  const bandH = cellHPct * 0.75;

  // Generate chain paths as thick rectangles between consecutive completed scheduled days
  // For same-row segments, draw a rect. For cross-row segments, draw a path.
  const chainRects: { x: number; y: number; w: number; h: number }[] = [];
  const chainPaths: string[] = [];

  for (const seg of segments) {
    if (seg.endIdx <= seg.startIdx) continue;

    // Walk through each consecutive pair in the segment
    for (let i = seg.startIdx; i < seg.endIdx; i++) {
      const nextIdx = i + 1;
      const col1 = i % cols;
      const row1 = Math.floor(i / cols);
      const col2 = nextIdx % cols;
      const row2 = Math.floor(nextIdx / cols);

      const cx1 = col1 * cellWPct + cellWPct / 2;
      const cy1 = row1 * cellHPct + cellHPct / 2;
      const cx2 = col2 * cellWPct + cellWPct / 2;
      const cy2 = row2 * cellHPct + cellHPct / 2;

      if (row1 === row2) {
        // Same row: draw a rect from cx1 to cx2
        const x = Math.min(cx1, cx2);
        const w = Math.abs(cx2 - cx1);
        chainRects.push({ x, y: cy1 - bandH / 2, w, h: bandH });
      } else {
        // Cross-row: draw a thick path
        chainPaths.push(`M ${cx1} ${cy1} L ${cx2} ${cy2}`);
      }
    }
  }

  return (
    <div className="relative">
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
          <span key={i} className="text-[8px] text-neutral-600 text-center font-medium">{l}</span>
        ))}
      </div>

      <div className="relative">
        {/* Chain band SVG overlay (behind cells) */}
        {showBand && (chainRects.length > 0 || chainPaths.length > 0) && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ overflow: 'visible', zIndex: 1 }}
          >
            {chainRects.map((r, i) => (
              <rect
                key={`r${i}`}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={color}
                rx={1}
                opacity={0.85}
              />
            ))}
            {chainPaths.map((path, i) => (
              <path
                key={`p${i}`}
                d={path}
                stroke={color}
                strokeWidth={bandH}
                strokeLinecap="round"
                fill="none"
                vectorEffect="non-scaling-stroke"
                opacity={0.85}
              />
            ))}
          </svg>
        )}

        {/* Grid cells (above band) */}
        <div className="relative" style={{ zIndex: 2 }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-0.5 mb-0.5">
              {week.map((d, di) => {
                const otherMonth = d.getMonth() !== currentMonth;
                const scheduled = isScheduledOn(d, frequencyType, frequencyDays);
                const locked = jiggleMode || isFuture(d) || isPast(d);

                if (otherMonth) {
                  return <div key={di} className="w-full aspect-square" />;
                }

                return (
                  <div key={di} className="w-full aspect-square">
                    <SquareCell
                      count={completions[formatDate(d)] ?? 0}
                      target={target}
                      color={color}
                      isToday={isToday(d)}
                      isPast={isPast(d)}
                      isFuture={isFuture(d)}
                      isScheduled={scheduled}
                      size="sm"
                      onClick={() => {
                        if (jiggleMode || isFuture(d) || isPast(d)) return;
                        onToggle(formatDate(d));
                      }}
                      locked={locked}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── YEAR VIEW (heatmap, no chain band — too small) ──
function YearView({
  yearCells,
  yearStart,
  completions,
  target,
  color,
  frequencyType,
  frequencyDays,
  year,
  today,
  dayLabels,
  language,
  onToggle,
  jiggleMode,
}: {
  yearCells: { d: Date; weekIdx: number; dayIdx: number }[];
  yearStart: Date;
  completions: Record<string, number>;
  target: number;
  color: string;
  frequencyType: FrequencyType;
  frequencyDays: number[];
  year: number;
  today: Date;
  dayLabels: string[];
  language: string;
  onToggle: (date: string) => void;
  jiggleMode: boolean;
}) {
  const isFuture = (d: Date) => d > today;
  const isPast = (d: Date) => d < today;
  const isToday = (d: Date) => formatDate(d) === formatDate(today);

  return (
    <div className="overflow-hidden">
      <div className="flex gap-[2px]">
        <div className="flex flex-col gap-[2px] pr-1 shrink-0" style={{ width: '8px' }}>
          {dayLabels.map((l, i) => (
            <div key={i} className="flex items-center justify-end" style={{ height: 'calc((100% - 12px) / 7)' }}>
              <span className="text-[6px] text-neutral-600 leading-none">{i % 2 === 0 ? l[0] : ''}</span>
            </div>
          ))}
        </div>
        <div
          className="grid gap-[2px] flex-1"
          style={{ gridTemplateColumns: 'repeat(53, minmax(0, 1fr))' }}
        >
          {yearCells.map(({ d, weekIdx, dayIdx }) => {
            const otherYear = d.getFullYear() !== year;
            const scheduled = isScheduledOn(d, frequencyType, frequencyDays);
            const completed = scheduled && (completions[formatDate(d)] ?? 0) >= target;
            const partial = scheduled && (completions[formatDate(d)] ?? 0) > 0 && (completions[formatDate(d)] ?? 0) < target;
            const todayCell = isToday(d);
            const future = isFuture(d);
            const past = isPast(d);
            const locked = jiggleMode || future || past;

            if (otherYear) {
              return <div key={`${weekIdx}-${dayIdx}`} style={{ gridColumn: weekIdx + 1, gridRow: dayIdx + 1 }}>
                <div className="w-full aspect-square rounded-[2px]" />
              </div>;
            }

            return (
              <div key={`${weekIdx}-${dayIdx}`} style={{ gridColumn: weekIdx + 1, gridRow: dayIdx + 1 }}>
                <button
                  onClick={() => {
                    if (jiggleMode) return;
                    if (future || past) return;
                    onToggle(formatDate(d));
                  }}
                  disabled={jiggleMode || future || past}
                  className={`w-full aspect-square rounded-[2px] transition-all ${
                    locked ? 'cursor-default' : 'cursor-pointer active:scale-90 hover:brightness-125'
                  } ${todayCell ? 'ring-1 ring-white/30' : ''}`}
                  style={{
                    backgroundColor: completed ? color : partial ? `${color}50` : scheduled ? '#1a1a1a' : 'transparent',
                    opacity: future ? 0.12 : past && !completed && !partial ? 0.25 : scheduled ? 1 : 0.3,
                  }}
                >
                  {completed && target > 1 && (
                    <span className="text-[6px] font-bold text-white leading-none flex items-center justify-center h-full">
                      {completions[formatDate(d)]}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative mt-1 h-3" style={{ paddingLeft: '12px' }}>
        {Array.from({ length: 12 }, (_, m) => {
          const monthStart = startOfMonth(new Date(year, m, 1));
          const weekIdx = Math.round((monthStart.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const monthAbbr = new Date(year, m, 1).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' });
          const pct = (weekIdx / 53) * 100;
          return (
            <span key={m} className="text-[7px] text-neutral-600 absolute whitespace-nowrap" style={{ left: `${pct}%` }}>
              {monthAbbr}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function HabitCard({
  habit,
  view,
  onToggle,
  onEdit,
  onDelete,
  jiggleMode = false,
  jiggleIndex = 0,
  isDragging = false,
  onLongPress,
  onDragStart,
}: Props) {
  const { language } = useSettings();
  const t = useT(language);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const freqType: FrequencyType = habit.frequency_type ?? 'everyday';
  const freqDays: number[] = habit.frequency_days ?? [];
  const streak = calculateFrequencyStreak(habit.completions, habit.target_count, freqType, freqDays);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (jiggleMode) {
      onDragStart?.(e);
      return;
    }
    longPressFired.current = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress?.();
    }, 400);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!jiggleMode && longPressTimer.current && pointerStart.current) {
      const dx = Math.abs(e.clientX - pointerStart.current.x);
      const dy = Math.abs(e.clientY - pointerStart.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (longPressFired.current || jiggleMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const now = new Date();
  const weekDays = getWeekDays(now);
  const dayLabels = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];
  const monthGrid = getMonthGrid(now);
  const monthLabel = now.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long' });
  const currentMonth = now.getMonth();

  const year = now.getFullYear();
  const yearStart = startOfWeek(parseDate(`${year}-01-01`));

  const jiggleClass = jiggleMode && !isDragging
    ? `jiggle jiggle-delay-${jiggleIndex % 4}`
    : '';

  const dragStyle: React.CSSProperties = isDragging
    ? { opacity: 0.4, transform: 'scale(0.98)' }
    : {};

  const handleToggle = (date: string) => onToggle(habit.id, date, habit.target_count);

  const renderHeader = (compact: boolean) => (
    <div className={`flex items-start ${compact ? 'mb-2' : 'mb-4'}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={`${compact ? 'w-8 h-8 text-base' : 'w-11 h-11 text-xl'} rounded-xl flex items-center justify-center shrink-0`}
          style={{ backgroundColor: `${habit.color}1a` }}
        >
          {habit.emoji}
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{habit.title}</h3>
          {!compact && habit.description && (
            <p className="text-neutral-500 text-xs truncate">{habit.description}</p>
          )}
          {!compact && habit.target_count > 1 && (
            <p className="text-neutral-600 text-[10px] mt-0.5">{habit.target_count}× / {t('days')}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className={`flex items-center gap-0.5 px-1.5 ${compact ? 'py-0.5' : 'py-1'} rounded-lg`}
          style={{ backgroundColor: streak > 0 ? `${habit.color}1a` : '#1a1a1a' }}
        >
          <Flame
            className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}
            style={{ color: streak > 0 ? habit.color : '#525252' }}
          />
          <span
            className={`${compact ? 'text-xs' : 'text-sm'} font-bold`}
            style={{ color: streak > 0 ? habit.color : '#525252' }}
          >
            {streak}
          </span>
        </div>

        {!jiggleMode && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-[#1a1a1a] transition-colors`}
            >
              <MoreVertical className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 w-32 bg-[#1a1a1a] border border-[#262626] rounded-xl shadow-2xl py-1">
                <button
                  onClick={() => { onEdit(habit); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-300 hover:bg-[#262626] flex items-center gap-2 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('edit')}
                </button>
                <button
                  onClick={() => { onDelete(habit); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-950/30 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('delete')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── MONTH VIEW ──
  if (view === 'month') {
    return (
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleCardClick}
        className={`rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] p-3 transition-colors hover:border-[#262626] ${jiggleClass} ${jiggleMode ? 'cursor-grab active:cursor-grabbing touch-none select-none' : ''}`}
        style={dragStyle}
      >
        {renderHeader(true)}
        <span className="text-[10px] text-neutral-400 font-medium block text-center mb-1.5">{monthLabel}</span>
        <MonthView
          weeks={monthGrid}
          completions={habit.completions}
          target={habit.target_count}
          color={habit.color}
          frequencyType={freqType}
          frequencyDays={freqDays}
          currentMonth={currentMonth}
          today={today}
          onToggle={handleToggle}
          jiggleMode={jiggleMode}
        />
      </div>
    );
  }

  // ── WEEK VIEW ──
  if (view === 'week') {
    return (
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleCardClick}
        className={`rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] p-4 transition-colors hover:border-[#262626] ${jiggleClass} ${jiggleMode ? 'cursor-grab active:cursor-grabbing touch-none select-none' : ''}`}
        style={dragStyle}
      >
        {renderHeader(false)}
        <WeekView
          dates={weekDays}
          completions={habit.completions}
          target={habit.target_count}
          color={habit.color}
          frequencyType={freqType}
          frequencyDays={freqDays}
          dayLabels={dayLabels}
          today={today}
          onToggle={handleToggle}
          jiggleMode={jiggleMode}
        />
      </div>
    );
  }

  // ── YEAR VIEW ──
  const yearCells: { d: Date; weekIdx: number; dayIdx: number }[] = [];
  for (let w = 0; w < 53; w++) {
    for (let d = 0; d < 7; d++) {
      const date = addDays(addDays(yearStart, w * 7), d);
      yearCells.push({ d: date, weekIdx: w, dayIdx: d });
    }
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleCardClick}
      className={`rounded-2xl bg-[#0d0d0d] border border-[#1a1a1a] p-4 transition-colors hover:border-[#262626] ${jiggleClass} ${jiggleMode ? 'cursor-grab active:cursor-grabbing touch-none select-none' : ''}`}
      style={dragStyle}
    >
      {renderHeader(false)}
      <YearView
        yearCells={yearCells}
        yearStart={yearStart}
        completions={habit.completions}
        target={habit.target_count}
        color={habit.color}
        frequencyType={freqType}
        frequencyDays={freqDays}
        year={year}
        today={today}
        dayLabels={dayLabels}
        language={language}
        onToggle={handleToggle}
        jiggleMode={jiggleMode}
      />
    </div>
  );
}
