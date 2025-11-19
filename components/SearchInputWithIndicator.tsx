'use client';

import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';

type AccessibleLabelProps =
  | { label: string; ariaLabel?: string }
  | { label?: string; ariaLabel: string };

export interface SearchInputWithIndicatorProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'aria-label' | 'aria-labelledby'>,
    AccessibleLabelProps {}

export const SearchInputWithIndicator = forwardRef<
  HTMLInputElement,
  SearchInputWithIndicatorProps
>(({ placeholder, className, value, onChange, label, ariaLabel, id, ...props }, ref) => {
  const [isEmpty, setIsEmpty] = useState(true);
  const internalRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();

  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;

  useEffect(() => {
    const currentValue = value ?? internalRef.current?.value ?? '';
    setIsEmpty(typeof currentValue === 'string' && currentValue.length === 0);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsEmpty(e.target.value.length === 0);
    onChange?.(e);
  };

  // Combine refs: forward the ref and keep internal ref
  const setRefs = (node: HTMLInputElement | null) => {
    internalRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }
  };

  return (
    <div className={`um-input-wrap ${isEmpty ? 'um-input-empty' : ''}`}>
      {label ? (
        <label
          htmlFor={inputId}
          id={labelId}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {label}
        </label>
      ) : null}
      <input
        ref={setRefs}
        type="text"
        className={`um-input ${className || ''}`}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        id={inputId}
        {...props}
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={label ? labelId : undefined}
      />
    </div>
  );
});

SearchInputWithIndicator.displayName = 'SearchInputWithIndicator';

