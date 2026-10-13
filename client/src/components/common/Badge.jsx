import React from 'react';

export default function Badge({ children, variant = 'neutral', size = 'md' }) {
  const styles = {
    neutral: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 font-medium',
    md: 'text-xs px-2 py-0.5 font-semibold',
    lg: 'text-sm px-2.5 py-1 font-bold'
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${styles[variant] || styles.neutral} ${sizes[size]}`}>
      {children}
    </span>
  );
}
