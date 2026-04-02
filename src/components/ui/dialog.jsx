import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const tabbableSelector = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]'
].join(',');

export const Dialog = ({ open, onOpenChange = () => {}, children }) => {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;

    // Focus the dialog container for keyboard handling
    const el = dialogRef.current;
    if (el) {
      // find first focusable inside, otherwise focus container
      const first = el.querySelector(tabbableSelector);
      (first || el).focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.stopPropagation();
        onOpenChange(false);
        return;
      }

      if (e.key === 'Tab') {
        const nodes = Array.from(el.querySelectorAll(tabbableSelector)).filter(n => n.offsetParent !== null);
        if (nodes.length === 0) {
          // nothing to tab to, keep focus in container
          e.preventDefault();
          return;
        }
        const firstNode = nodes[0];
        const lastNode = nodes[nodes.length - 1];
        if (!e.shiftKey && document.activeElement === lastNode) {
          e.preventDefault();
          firstNode.focus();
        }
        if (e.shiftKey && document.activeElement === firstNode) {
          e.preventDefault();
          lastNode.focus();
        }
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      // restore focus
      try { previouslyFocused.current && previouslyFocused.current.focus(); } catch (e) { /* ignore */ }
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    // use very large z-index to ensure dialog is above app panels
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} className="w-full">
        {children}
      </div>
    </div>
  );
};

export const DialogOverlay = ({ onClick }) => (
  <motion.div
    className="fixed inset-0 bg-black/60 z-[9998]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
  />
);

export const DialogContent = ({ children, className = '' }) => (
  <motion.div
    className={`relative w-full max-w-2xl mx-4 z-[10000] bg-slate-900/95 p-6 rounded-lg shadow-lg ${className} max-h-[90vh] overflow-auto`}
    initial={{ opacity: 0, y: 20, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  >
    {children}
  </motion.div>
);

export const DialogHeader = ({ children }) => (
  <div className="p-4 pb-2">{children}</div>
);

export const DialogTitle = ({ children }) => (
  <h3 className="text-lg font-semibold text-white">{children}</h3>
);

export const DialogClose = ({ onClick, children }) => (
  <button onClick={onClick} aria-label="Fechar" className="absolute right-3 top-3 text-slate-400 hover:text-white">
    {children || '×'}
  </button>
);

export default Dialog;
