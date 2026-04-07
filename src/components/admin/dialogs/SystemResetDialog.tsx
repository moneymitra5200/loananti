'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, XCircle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';

interface SystemResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetConfirmText: string;
  setResetConfirmText: (text: string) => void;
  resetting: boolean;
  onReset: () => void;
}

export default function SystemResetDialog({
  open,
  onOpenChange,
  resetConfirmText,
  setResetConfirmText,
  resetting,
  onReset
}: SystemResetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm System Reset
          </DialogTitle>
          <DialogDescription>
            This will permanently delete all data in the system. Please review carefully.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* What will be deleted */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h5 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              The following will be DELETED:
            </h5>
            <ScrollArea className="max-h-64 pr-2">
              <div className="grid md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                <div className="font-medium text-red-600 col-span-2 mt-2">Loan Related:</div>
                <li className="ml-4">• All loan applications</li>
                <li className="ml-4">• All EMI schedules & payments</li>
                <li className="ml-4">• All session forms & loan forms</li>
                <li className="ml-4">• All offline loans & EMIs</li>
                <li className="ml-4">• All loan top-ups</li>
                <li className="ml-4">• All foreclosure requests</li>
                <li className="ml-4">• All EMI date change requests</li>
                <li className="ml-4">• All counter offers</li>
                <li className="ml-4">• All document requests</li>
                <li className="ml-4">• All loan restructures</li>
                <li className="ml-4">• All NPA tracking records</li>
                <li className="ml-4">• All fraud alerts</li>
                <li className="ml-4">• All loan agreements</li>
                <li className="ml-4">• All loan progress timelines</li>
                <li className="ml-4">• All pre-approved offers</li>
                
                <div className="font-medium text-red-600 col-span-2 mt-3">Financial & Accounting:</div>
                <li className="ml-4">• All credit transactions</li>
                <li className="ml-4">• All journal entries & lines</li>
                <li className="ml-4">• All bank transactions</li>
                <li className="ml-4">• All bank accounts</li>
                <li className="ml-4">• All expenses</li>
                <li className="ml-4">• All ledger balances</li>
                <li className="ml-4">• All cashier settlements</li>
                <li className="ml-4">• All daily collections</li>
                <li className="ml-4">• All payment requests</li>
                <li className="ml-4">• All secondary payment pages</li>
                
                <div className="font-medium text-red-600 col-span-2 mt-3">User & Activity Data:</div>
                <li className="ml-4">• All customer accounts</li>
                <li className="ml-4">• All notifications & reminders</li>
                <li className="ml-4">• All audit logs & workflow logs</li>
                <li className="ml-4">• All location logs</li>
                <li className="ml-4">• All action logs</li>
                <li className="ml-4">• All device fingerprints</li>
                <li className="ml-4">• All blacklist entries</li>
                <li className="ml-4">• All referrals</li>
                <li className="ml-4">• All appointments</li>
                
                <div className="font-medium text-red-600 col-span-2 mt-3">System & Other:</div>
                <li className="ml-4">• All agent performance records</li>
                <li className="ml-4">• All commission slabs</li>
                <li className="ml-4">• All grace period configs</li>
                <li className="ml-4">• All notification settings</li>
                <li className="ml-4">• All reports cache</li>
                <li className="ml-4">• All uploaded documents & files</li>
                <li className="ml-4">• All QR codes generated</li>
                <li className="ml-4">• All application fingerprints</li>
                <li className="ml-4">• All credit risk scores</li>
              </div>
            </ScrollArea>
          </div>
          
          {/* What will be preserved */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              The following will be PRESERVED:
            </h5>
            <div className="grid md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <li className="ml-4">• All user accounts (except customers)</li>
              <li className="ml-4">• All company profiles</li>
              <li className="ml-4">• All loan products (Gold, Vehicle, etc.)</li>
              <li className="ml-4">• System settings & configuration</li>
              <li className="ml-4">• Database schema/structure</li>
              <li className="ml-4">• User roles & permissions</li>
              <li className="ml-4">• Agent codes & staff codes</li>
            </div>
          </div>

          {/* Credits Reset Warning */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <h5 className="font-semibold text-amber-700 mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Credits will be RESET to zero:
            </h5>
            <div className="text-sm text-gray-600">
              All user credits and company credits will be reset to ₹0.
            </div>
          </div>
          
          <div>
            <Label>Type <span className="font-mono font-bold text-red-600">RESET_SYSTEM</span> to confirm:</Label>
            <Input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET_SYSTEM"
              className="mt-2 font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setResetConfirmText(''); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onReset}
            disabled={resetting || resetConfirmText !== 'RESET_SYSTEM'}
          >
            {resetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset System
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
