'use client';

import { ChangeEvent, useCallback, useMemo, useState } from 'react';

export type FormStatus = 'idle' | 'saving' | 'success' | 'error';

export interface ManagedFormState<T> {
  values: T;
  status: FormStatus;
  message: string | null;
  errors: Partial<Record<keyof T, string>>;
  isDirty: boolean;
  updateValue: <K extends keyof T>(key: K, value: T[K]) => void;
  setValues: (values: T) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  reset: (values?: T) => void;
  submit: (action: () => Promise<void>) => Promise<void>;
}

export function parseApiError(error: unknown, fallback: string = 'Something went wrong'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return fallback;
}

export function useManagedForm<T extends Record<string, any>>(initialValues: T): ManagedFormState<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [baseline, setBaseline] = useState<T>(initialValues);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const updateValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setStatus('idle');
  }, []);

  const reset = useCallback((next?: T) => {
    const base = next ?? baseline;
    setValues(base);
    setBaseline(base);
    setErrors({});
    setStatus('idle');
    setMessage(null);
  }, [baseline]);

  const assignValues = useCallback((next: T) => {
    setValues(next);
    setBaseline(next);
    setErrors({});
    setStatus('idle');
    setMessage(null);
  }, []);

  const submit = useCallback(async (action: () => Promise<void>) => {
    setStatus('saving');
    setMessage(null);
    setErrors({});
    try {
      await action();
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setMessage(parseApiError(error));
      throw error;
    }
  }, []);

  const isDirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(baseline), [values, baseline]);

  return {
    values,
    status,
    message,
    errors,
    isDirty,
    updateValue,
    setValues: assignValues,
    setErrors,
    reset,
    submit,
  };
}

export function handleBooleanInput<T extends Record<string, any>>(
  update: <K extends keyof T>(key: K, value: T[K]) => void,
  key: keyof T
) {
  return (value: boolean | ChangeEvent<HTMLInputElement>) => {
    if (typeof value === 'boolean') {
      update(key, value as any);
      return;
    }
    update(key, value.target.checked as any);
  };
}

export function handleTextInput<T extends Record<string, any>>(
  update: <K extends keyof T>(key: K, value: T[K]) => void,
  key: keyof T
) {
  return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    update(key, event.target.value as any);
  };
}
