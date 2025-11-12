'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ExperimentAssignment, ExperimentKey } from '@/lib/experiments';
import { getDefaultAssignment, getExperimentAssignment } from '@/lib/experiments';

interface UseExperimentOptions {
  userId?: string;
  skip?: boolean;
}

interface UseExperimentResult {
  assignment: ExperimentAssignment;
  enabled: boolean;
  variation: string;
  loading: boolean;
  payload: ExperimentAssignment['payload'];
  refresh: () => Promise<void>;
}

export function useExperiment(
  key: ExperimentKey,
  options: UseExperimentOptions = {}
): UseExperimentResult {
  const [assignment, setAssignment] = useState<ExperimentAssignment>(() =>
    getDefaultAssignment(key)
  );
  const [loading, setLoading] = useState<boolean>(!options.skip && !!options.userId);

  const shouldSkip = options.skip || (!options.userId && options.userId !== undefined);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (shouldSkip || !options.userId) {
        await Promise.resolve();
        if (!cancelled) {
          setAssignment(getDefaultAssignment(key));
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const result = await getExperimentAssignment(key, {
          userId: options.userId,
          context: 'client',
          bypassCache: true,
        });

        if (!cancelled) {
          setAssignment(result);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setAssignment(getDefaultAssignment(key));
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [key, options.userId, shouldSkip]);

  const refresh = useMemo(() => {
    return async () => {
      if (shouldSkip || !options.userId) {
        setAssignment(getDefaultAssignment(key));
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await getExperimentAssignment(key, {
        userId: options.userId,
        context: 'client',
        bypassCache: true,
      });
      setAssignment(result);
      setLoading(false);
    };
  }, [key, options.userId, shouldSkip]);

  return {
    assignment,
    enabled: assignment.enabled,
    variation: assignment.variation,
    loading,
    payload: assignment.payload,
    refresh,
  };
}

