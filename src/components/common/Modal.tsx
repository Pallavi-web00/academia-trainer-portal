import React, { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  sizeClassName?: string;
  children: ReactNode;
}

let openModalCount = 0;
let previousBodyOverflow = '';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  ariaLabel,
  sizeClassName = 'max-w-lg',
  children
}) => {
  const onCloseRef = useRef(onClose);
  const dialogRef = useRef<HTMLElement>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    if (openModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModalCount += 1;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialogRef.current.focus();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const firstFocusableElement = dialogRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusableElement ?? dialogRef.current)?.focus();
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      openModalCount -= 1;
      if (openModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/45 p-2 sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <section
        ref={dialogRef}
        className={`my-auto flex max-h-[calc(100dvh-1rem)] w-full ${sizeClassName} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    document.body
  );
};
