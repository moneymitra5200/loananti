'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: { name: string } | null;
  handleDeleteUser: () => void;
}

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  selectedUser,
  handleDeleteUser,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
        </DialogHeader>
        <p>Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteUser}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
