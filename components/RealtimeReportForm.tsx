'use client';

import { useState } from 'react';
import { Clock, Check } from 'lucide-react';
import {
  FormField,
  FormErrorSummary,
  SubmitButton,
} from '@/components/ui/form-field';

interface RealtimeReportFormProps {
  destinationId: number;
  destinationName: string;
  onSuccess?: () => void;
}

export function RealtimeReportForm({
  destinationId,
  destinationName,
  onSuccess,
}: RealtimeReportFormProps) {
  const [waitTime, setWaitTime] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (waitTime <= 0) {
      setError('Please enter a valid wait time');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reportData = { wait_time: waitTime };

      const response = await fetch('/api/realtime/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination_id: destinationId,
          report_type: 'wait_time',
          report_data: reportData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setWaitTime(0);
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Check className="h-5 w-5" />
          <span className="font-medium">Report submitted successfully!</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Thank you for helping other travelers.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Report Current Status</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Help others by sharing real-time information about {destinationName}
        </p>
      </div>

      {/* Wait Time Input */}
      <div className="flex items-start gap-2">
        <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-8" />
        <FormField
          id="wait-time"
          label="Current Wait Time (minutes)"
          type="number"
          min={0}
          max={300}
          value={waitTime ? String(waitTime) : ''}
          onChange={(e) => setWaitTime(parseInt(e.target.value) || 0)}
          placeholder="e.g., 15"
          className="flex-1"
          showValidation={false}
        />
      </div>

      {/* Error Message */}
      {error && <FormErrorSummary errors={[error]} />}

      {/* Submit Button */}
      <SubmitButton
        onClick={handleSubmit}
        isLoading={submitting}
        loadingText="Submitting..."
        className="w-full"
        type="button"
      >
        Submit Report
      </SubmitButton>
    </div>
  );
}

