'use client';

import { useState } from 'react';
import { X, AlertTriangle, Send, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationSlug: string;
  destinationName: string;
}

type IssueType =
  | 'closed_permanently'
  | 'wrong_hours'
  | 'wrong_location'
  | 'wrong_contact'
  | 'wrong_description'
  | 'duplicate'
  | 'inappropriate'
  | 'other';

const issueTypes: { value: IssueType; label: string; description: string }[] = [
  { value: 'closed_permanently', label: 'Permanently Closed', description: 'This place has closed down' },
  { value: 'wrong_hours', label: 'Wrong Hours', description: 'Opening hours are incorrect' },
  { value: 'wrong_location', label: 'Wrong Location', description: 'Address or map pin is incorrect' },
  { value: 'wrong_contact', label: 'Wrong Contact Info', description: 'Phone, website, or email is wrong' },
  { value: 'wrong_description', label: 'Inaccurate Description', description: 'Description doesn\'t match reality' },
  { value: 'duplicate', label: 'Duplicate Listing', description: 'This place is listed multiple times' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Contains offensive or misleading info' },
  { value: 'other', label: 'Other Issue', description: 'Something else is wrong' },
];

export function ReportIssueModal({
  isOpen,
  onClose,
  destinationSlug,
  destinationName,
}: ReportIssueModalProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedType) {
      setError('Please select an issue type');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/destinations/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationSlug,
          issueType: selectedType,
          details: details.trim(),
          reporterEmail: user?.email || email.trim() || null,
          reporterId: user?.id || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setDetails('');
    setEmail('');
    setError(null);
    setIsSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Report an Issue</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {isSubmitted ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your report has been submitted. Our team will review it and make updates if needed.
              </p>
              <Button onClick={handleClose} variant="default" size="sm">
                Close
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Help us keep <span className="font-medium text-gray-900 dark:text-white">{destinationName}</span> accurate by reporting any issues.
              </p>

              {/* Issue Type Selection */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">What's wrong?</label>
                <div className="grid grid-cols-1 gap-2">
                  {issueTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={cn(
                        'text-left p-3 rounded-xl border transition-all',
                        selectedType === type.value
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  Additional details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide more context about the issue..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {details.length}/500
                </p>
              </div>

              {/* Email for non-authenticated users */}
              {!user && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">
                    Your email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="We'll notify you when the issue is resolved"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isSubmitted && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSubmit}
              disabled={!selectedType || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
