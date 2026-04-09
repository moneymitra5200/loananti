'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Company } from '../../types';

interface ScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCompany: Company | undefined;
  scanning: boolean;
  onSubmit: () => void;
}

export default function ScanDialog({ 
  open, 
  onOpenChange, 
  selectedCompany,
  scanning,
  onSubmit 
}: ScanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Past Transactions</DialogTitle>
          <DialogDescription>
            This will scan all past loan transactions and create bank transaction records for them.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            This will scan all disbursed loans and EMI payments for {selectedCompany?.name} and create the corresponding bank transactions.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={scanning}>
            {scanning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {scanning ? 'Scanning...' : 'Start Scan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
