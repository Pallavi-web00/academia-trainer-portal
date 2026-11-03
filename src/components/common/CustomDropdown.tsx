import React, {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type DropdownStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'change-requested'
  | 'ongoing'
  | 'upcoming'
  | 'cancelled';

export interface DropdownOption {
  value: string;
  label: string;
  status?: DropdownStatus;
  icon?: ReactNode;
  disabled?: boolean;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  size?: 'compact' | 'default';
}

interface PanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const statusClassNames: Record<DropdownStatus, string> = {
  pending: 'dropdown-status-pending',
  approved: 'dropdown-status-approved',
  rejected: 'dropdown-status-rejected',
  'change-requested': 'dropdown-status-change-requested',
  ongoing: 'dropdown-status-ongoing',
  upcoming: 'dropdown-status-upcoming',
  cancelled: 'dropdown-status-cancelled'
};

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  ariaLabel,
  id,
  name,
  className = '',
  disabled = false,
  required = false,
  searchable = options.length >= 8,
  clearable = false,
  searchPlaceholder = 'Search options...',
  emptyMessage = 'No matching options',
  size = 'default'
}) => {
  const generatedId = useId().replace(/:/g, '');
  const controlId = id || `dropdown-${generatedId}`;
  const listboxId = `${controlId}-options`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const [isAbove, setIsAbove] = useState(false);

  const selectedOption = options.find((option) => option.value === value);
  const visibleOptions = useMemo(() => {
    const filtered = searchable && searchText.trim()
      ? options.filter((option) =>
        option.label.toLocaleLowerCase().includes(searchText.trim().toLocaleLowerCase())
      )
      : options;

    return clearable
      ? [{ value: '', label: 'Clear selection' }, ...filtered]
      : filtered;
  }, [clearable, options, searchable, searchText]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const width = Math.min(Math.max(rect.width, 200), window.innerWidth - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
    const below = window.innerHeight - rect.bottom - margin - gap;
    const above = rect.top - margin - gap;
    const openAbove = below < 180 && above > below;
    const maxHeight = Math.max(100, Math.min(320, openAbove ? above : below));

    setIsAbove(openAbove);
    setPosition({
      top: openAbove
        ? Math.max(margin, rect.top - gap - Math.min(320, above))
        : rect.bottom + gap,
      left,
      width,
      maxHeight
    });
  }, []);

  const openMenu = useCallback((initialIndex?: number) => {
    if (disabled) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(initialIndex ?? Math.max(0, selectedIndex + (clearable ? 1 : 0)));
    setSearchText('');
    setPosition(null);
    setIsMounted(true);
    setIsClosing(false);
    setIsOpen(true);
  }, [clearable, disabled, options, value]);

  const closeMenu = useCallback((restoreFocus = false) => {
    if (!isOpen) return;
    setIsOpen(false);
    setIsClosing(true);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 160;
    closeTimer.current = window.setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
      setSearchText('');
      setPosition(null);
      closeTimer.current = null;
    }, duration);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, [isOpen]);

  const chooseOption = useCallback((option: DropdownOption) => {
    if (option.disabled) return;
    onChange(option.value);
    closeMenu(true);
  }, [closeMenu, onChange]);

  const moveActive = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => {
      if (visibleOptions.length === 0) return 0;
      let next = current;
      for (let step = 0; step < visibleOptions.length; step += 1) {
        next = (next + direction + visibleOptions.length) % visibleOptions.length;
        if (!visibleOptions[next].disabled) return next;
      }
      return current;
    });
  }, [visibleOptions]);

  const selectActive = useCallback(() => {
    const option = visibleOptions[activeIndex];
    if (option) chooseOption(option);
  }, [activeIndex, chooseOption, visibleOptions]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) openMenu();
      else moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) openMenu(options.length - 1);
      else moveActive(-1);
    } else if (event.key === 'Enter' && isOpen) {
      event.preventDefault();
      selectActive();
    } else if (event.key === ' ' && isOpen && event.target !== searchRef.current) {
      event.preventDefault();
      selectActive();
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, searchable, updatePosition]);

  useEffect(() => {
    if (isOpen && searchable && position) searchRef.current?.focus();
  }, [isOpen, position, searchable]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeMenu, isOpen]);

  useEffect(() => {
    const option = panelRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`
    );
    option?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    setActiveIndex(0);
  }, [searchText]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const panel = isMounted && position && (
    <div
      ref={panelRef}
      id={listboxId}
      className={`custom-dropdown-panel ${isAbove ? 'opens-above' : 'opens-below'} ${
        isClosing ? 'is-closing' : ''
      }`}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        zIndex: 100,
        pointerEvents: isClosing ? 'none' : undefined
      }}
      onKeyDown={handleKeyDown}
    >
      {searchable && (
        <div className="custom-dropdown-search">
          <Search aria-hidden="true" size={15} />
          <input
            ref={searchRef}
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listboxId}
            autoComplete="off"
          />
          {searchText && (
            <button
              type="button"
              className="custom-dropdown-clear-search"
              aria-label="Clear search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setSearchText('');
                searchRef.current?.focus();
              }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <div className="custom-dropdown-options" role="listbox" aria-label={ariaLabel || label || placeholder}>
        {visibleOptions.length === 0 ? (
          <div className="custom-dropdown-empty" role="status">{emptyMessage}</div>
        ) : visibleOptions.map((option, index) => {
          const isSelected = option.value !== '' && option.value === value;
          const statusClass = option.status ? statusClassNames[option.status] : '';
          return (
            <div
              key={option.value || 'clear-selection'}
              id={`${controlId}-option-${index}`}
              className={`custom-dropdown-option ${isSelected ? 'is-selected' : ''} ${
                index === activeIndex ? 'is-active' : ''
              } ${option.disabled ? 'is-disabled' : ''} ${statusClass}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              data-option-index={index}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
            >
              {option.status && <span className="custom-dropdown-status-dot" aria-hidden="true" />}
              {option.icon && <span className="custom-dropdown-option-icon">{option.icon}</span>}
              <span className="custom-dropdown-option-label">{option.label}</span>
              {isSelected && <Check className="custom-dropdown-check" size={15} aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`custom-dropdown ${className}`}>
      {label && (
        <label className="custom-dropdown-label" htmlFor={controlId}>
          {label}{required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        className={`custom-dropdown-trigger ${size === 'compact' ? 'is-compact' : ''}`}
        role="combobox"
        aria-label={ariaLabel || label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen ? `${controlId}-option-${activeIndex}` : undefined}
        aria-required={required || undefined}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => isOpen ? closeMenu() : openMenu()}
        onKeyDown={handleKeyDown}
        name={name}
      >
        <span className={`custom-dropdown-value ${selectedOption ? '' : 'is-placeholder'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`custom-dropdown-chevron ${isOpen ? 'is-open' : ''}`}
          size={16}
          aria-hidden="true"
        />
      </button>
      {name && <input type="hidden" name={name} value={value} />}
      {isMounted && position && createPortal(panel, document.body)}
    </div>
  );
};
