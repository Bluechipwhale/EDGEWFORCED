import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  icon: Icon = PackageOpen,
  actionText,
  onAction
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center surface-card-subtle rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 my-4">
      <div className="p-3 rounded-full bg-orange-500/10 text-orange-500 mb-3">
        <Icon size={28} />
      </div>
      <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h4>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-4">{description}</p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn-primary text-xs py-2 px-3">
          {actionText}
        </button>
      )}
    </div>
  );
}
