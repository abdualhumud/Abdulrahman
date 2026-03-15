'use client';

import { useEffect } from 'react';
import { Icons } from '@/lib/icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Icon node displayed in a blue rounded square in the header. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class, e.g. 'max-w-md'. Defaults to 'max-w-md'. */
  maxWidth?: string;
  /**
   * Layout variant:
   *  - 'center'  — centred dialog with rounded corners (default)
   *  - 'right'   — slide-in panel from the right edge (full height)
   *  - 'bottom'  — sheet from the bottom on mobile, centred dialog on sm+
   */
  variant?: 'center' | 'right' | 'bottom';
}

/**
 * Reusable modal wrapper.
 * Handles: backdrop click to close, Escape key, slide/fade animations,
 * optional header with icon+title, scrollable body, and sticky footer.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'max-w-md',
  variant  = 'center',
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const isBottom = variant === 'bottom';
  const isRight  = variant === 'right';

  const wrapClass = [
    'fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm',
    isBottom ? 'items-end sm:items-center justify-center p-0 sm:p-4'
    : isRight  ? 'items-center justify-end'
    : 'items-center justify-center p-4',
  ].join(' ');

  const panelClass = [
    'bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden',
    isBottom ? `w-full sm:${maxWidth} rounded-t-3xl sm:rounded-3xl`
    : isRight  ? `h-full w-full ${maxWidth}`
    : `w-full ${maxWidth} rounded-3xl`,
  ].join(' ');

  const animation = isBottom ? 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)'
    : isRight  ? 'slideInRight 0.25s ease-out'
    : 'fadeInScale 0.2s ease-out';

  return (
    <div className={wrapClass} onClick={onClose}>
      <div
        className={panelClass}
        onClick={e => e.stopPropagation()}
        style={{ animation, maxHeight: isBottom ? '92vh' : isRight ? undefined : '90vh' }}
      >
        {/* Drag handle for bottom sheet (mobile) */}
        {isBottom && (
          <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
        )}

        {/* Header */}
        {(title || icon) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
              )}
              {title && (
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-none">{title}</p>
                  {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Icons.x size={14} />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-slate-100 dark:border-slate-700 p-4 flex-shrink-0 bg-white dark:bg-slate-800">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInScale  { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp      { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
