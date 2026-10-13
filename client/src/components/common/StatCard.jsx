import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'orange'
}) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <div className="surface-card rounded-xl p-4.5 sunburst-card transition-all hover:translate-y-[-2px]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="mt-2.5 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </div>

      {(subtitle || trend !== undefined) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 font-bold ${
              isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-zinc-400'
            }`}>
              {isPositive && <TrendingUp size={13} />}
              {isNegative && <TrendingDown size={13} />}
              {isPositive ? `+${trend}%` : `${trend}%`}
            </span>
          )}
          {subtitle && (
            <span className="text-zinc-500 dark:text-zinc-400 truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
