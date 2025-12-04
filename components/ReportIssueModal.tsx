'use client';

import { useState } from 'react';
import { AlertTriangle, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FormField,
  TextareaField,
  FormErrorSummary,
  SubmitButton,
} from '@/components/ui/form-field';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Report an Issue
          </DialogTitle>
          <DialogDescription>
            Help us keep <span className="font-medium text-gray-900 dark:text-white">{destinationName}</span> accurate by reporting any issues.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
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
            <div className="space-y-4">
              {/* Issue Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">What's wrong?</label>
                <div className="grid grid-cols-1 gap-2 max-h-[240px] overflow-y-auto pr-1">
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
              <TextareaField
                id="report-details"
                label="Additional details (optional)"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide more context about the issue..."
                rows={3}
                maxLength={500}
                showValidation={false}
              />

              {/* Email for non-authenticated users */}
              {!user && (
                <FormField
                  id="report-email"
                  label="Your email (optional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="We'll notify you when the issue is resolved"
                  helperText="We'll notify you when the issue is resolved"
                  showValidation={false}
                />
              )}

              {/* Error */}
              {error && <FormErrorSummary errors={[error]} />}
            </div>
          )}
        </div>

        {!isSubmitted && (
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <SubmitButton
              size="sm"
              onClick={handleSubmit}
              disabled={!selectedType}
              isLoading={isSubmitting}
              loadingText="Submitting..."
              type="button"
            >
              <Send className="h-4 w-4" />
              Submit Report
            </SubmitButton>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
