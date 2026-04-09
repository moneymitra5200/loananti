'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffForm: {
    name: string;
    email: string;
    password: string;
  };
  setStaffForm: (form: { name: string; email: string; password: string }) => void;
  saving: boolean;
  onCreateStaff: () => void;
}

export default function StaffDialog({
  open,
  onOpenChange,
  staffForm,
  setStaffForm,
  saving,
  onCreateStaff
}: StaffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Staff Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input placeholder="Staff Name" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" placeholder="staff@example.com" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
          </div>
          <div>
            <Label>Password *</Label>
            <Input type="password" placeholder="Min 6 characters" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={onCreateStaff} disabled={saving}>
            {saving ? 'Creating...' : 'Create Staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
