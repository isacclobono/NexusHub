
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ReportReasonCategory } from '@/lib/types';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemType: 'post' | 'comment' | 'user';
  reporterUserId: string;
}

const REPORT_REASONS: { value: ReportReasonCategory; label: string }[] = [
  { value: 'spam', label: 'Spam or Misleading' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'misinformation', label: 'Misinformation or Fake News' },
  { value: 'intellectual_property', label: 'Intellectual Property Violation' },
  { value: 'other', label: 'Other (Please specify)' },
];

const ReportDialog: React.FC<ReportDialogProps> = ({
  isOpen,
  onClose,
  itemId,
  itemType,
  reporterUserId,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReasonCategory | ''>('');
  const [reasonText, setReasonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReport = async () => {
    if (!selectedReason) {
      toast.error('Please select a reason for reporting.');
      return;
    }
    if (selectedReason === 'other' && !reasonText.trim()) {
      toast.error('Please provide details if you select "Other".');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          itemType,
          reporterUserId,
          reasonCategory: selectedReason,
          reasonText: selectedReason === 'other' ? reasonText : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit report.');
      }
      toast.success('Report submitted successfully. Thank you!');
      onClose(); // Close dialog on success
      // Reset form for next time
      setSelectedReason('');
      setReasonText('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit report.');
      console.error('Report submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us understand the issue. What's wrong with this {itemType}?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reportReason">Reason for reporting:</Label>
            <RadioGroup
              id="reportReason"
              value={selectedReason}
              onValueChange={(value) => setSelectedReason(value as ReportReasonCategory)}
              className="space-y-1"
            >
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={`reason-${reason.value}`} />
                  <Label htmlFor={`reason-${reason.value}`} className="font-normal">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          {selectedReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="reasonText">Please provide more details:</Label>
              <Textarea
                id="reasonText"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Explain why you are reporting this content..."
                className="min-h-[80px]"
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmitReport} disabled={isSubmitting || !selectedReason}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
