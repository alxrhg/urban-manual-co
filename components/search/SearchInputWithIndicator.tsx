'use client';

import React, { forwardRef, useState, useEffect, useRef } from 'react';

export interface SearchInputWithIndicatorProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export const SearchInputWithIndicator = forwardRef<
  HTMLInputElement,
  SearchInputWithIndicatorProps
>(({ placeholder, className, value, onChange, ...props }, ref) => {
  const [isEmpty, setIsEmpty] = useState(true);
  const internalRef = useRef<HTMLInputElement>(null);

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
      <input
        ref={setRefs}
        type="text"
        className={`um-input ${className || ''}`}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
});

SearchInputWithIndicator.displayName = 'SearchInputWithIndicator';

