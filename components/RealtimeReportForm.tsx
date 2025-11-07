'use client';

import { useState } from 'react';
import { Clock, Users, AlertCircle, Check } from 'lucide-react';

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
  const [reportType, setReportType] = useState<'wait_time' | 'crowding' | null>(null);
  const [waitTime, setWaitTime] = useState<number>(0);
  const [crowdingLevel, setCrowdingLevel] = useState<'quiet' | 'moderate' | 'busy' | 'very_busy' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reportType) {
      setError('Please select a report type');
      return;
    }

    if (reportType === 'wait_time' && waitTime <= 0) {
      setError('Please enter a valid wait time');
      return;
    }

    if (reportType === 'crowding' && !crowdingLevel) {
      setError('Please select a crowding level');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const reportData: any = {};
      
      if (reportType === 'wait_time') {
        reportData.wait_time = waitTime;
      } else if (reportType === 'crowding') {
        reportData.crowding_level = crowdingLevel;
      }

      const response = await fetch('/api/realtime/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination_id: destinationId,
          report_type: reportType,
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
        setReportType(null);
        setWaitTime(0);
        setCrowdingLevel(null);
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

      {/* Report Type Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          What would you like to report?
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setReportType('wait_time');
              setCrowdingLevel(null);
            }}
            className={`flex-1 px-3 py-2 text-xs border rounded-xl transition-colors ${
              reportType === 'wait_time'
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            <Clock className="h-4 w-4 mx-auto mb-1" />
            Wait Time
          </button>
          <button
            onClick={() => {
              setReportType('crowding');
              setWaitTime(0);
            }}
            className={`flex-1 px-3 py-2 text-xs border rounded-xl transition-colors ${
              reportType === 'crowding'
                ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
            }`}
          >
            <Users className="h-4 w-4 mx-auto mb-1" />
            Crowding
          </button>
        </div>
      </div>

      {/* Wait Time Input */}
      {reportType === 'wait_time' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Current Wait Time (minutes)
          </label>
          <input
            type="number"
            min="0"
            max="300"
            value={waitTime || ''}
            onChange={(e) => setWaitTime(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-black"
            placeholder="e.g., 15"
          />
        </div>
      )}

      {/* Crowding Level Selection */}
      {reportType === 'crowding' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Current Crowding Level
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['quiet', 'moderate', 'busy', 'very_busy'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setCrowdingLevel(level)}
                className={`px-3 py-2 text-xs border rounded-xl transition-colors capitalize ${
                  crowdingLevel === level
                    ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                {level.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      {reportType && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      )}
    </div>
  );
}

