'use client';

import { memo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { EMISchedule } from './types';

interface EMIDateChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateChangeEMI: EMISchedule | null;
  newEMIDate: string;
  setNewEMIDate: (date: string) => void;
  dateChangeReason: string;
  setDateChangeReason: (reason: string) => void;
  changingDate: boolean;
  onChangeDate: () => Promise<void>;
}

const EMIDateChangeDialog = memo(function EMIDateChangeDialog({
  open,
  onOpenChange,
  dateChangeEMI,
  newEMIDate,
  setNewEMIDate,
  dateChangeReason,
  setDateChangeReason,
  changingDate,
  onChangeDate
}: EMIDateChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Change EMI Due Date
          </DialogTitle>
          <DialogDescription>
            EMI #{dateChangeEMI?.emiNumber} - Current Due: {formatDate(dateChangeEMI?.dueDate || new Date())}
            <br />
            Amount: ₹{formatCurrency(dateChangeEMI?.emiAmount || 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-semibold text-sm">Important</span>
            </div>
            <p className="text-xs text-blue-600">
              <strong>All subsequent EMIs will be automatically shifted by the same number of days.</strong>
              <br />
              This action will be logged for audit purposes.
            </p>
          </div>

          <div>
            <Label>New Due Date *</Label>
            <Input
              type="date"
              value={newEMIDate}
              onChange={(e) => setNewEMIDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label>Reason for Date Change *</Label>
            <Textarea
              value={dateChangeReason}
              onChange={(e) => setDateChangeReason(e.target.value)}
              placeholder="Enter reason for changing EMI date..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            className="bg-blue-500 hover:bg-blue-600"
            onClick={onChangeDate}
            disabled={changingDate || !newEMIDate || !dateChangeReason}
          >
            {changingDate ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Update Date
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default EMIDateChangeDialog;
