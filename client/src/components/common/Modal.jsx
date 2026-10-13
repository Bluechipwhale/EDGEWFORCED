import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, subtitle, isOpen = true, onClose, children, maxWidth = 'max-w-2xl' }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const focusable = () => [...(dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]') || [])];
    focusable()[0]?.focus();
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
      if (e.key === 'Tab') {
        const elements = focusable(), first = elements[0], last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('keydown', handleEsc); previousFocus?.focus(); };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className={`relative w-full ${maxWidth} surface-card rounded-xl p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="pt-4 overflow-y-auto flex-1 pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
