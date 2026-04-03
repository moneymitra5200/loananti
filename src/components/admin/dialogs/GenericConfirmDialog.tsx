'use client';

import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface GenericConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'default' | 'destructive' | 'success' | 'warning';
  onConfirm: () => void;
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function GenericConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  loading = false,
  icon,
}: GenericConfirmDialogProps) {
  const getConfirmButtonClass = () => {
    switch (confirmVariant) {
      case 'destructive':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      default:
        return 'bg-primary hover:bg-primary/90';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`p-2 rounded-full ${
                confirmVariant === 'destructive' ? 'bg-red-100' :
                confirmVariant === 'success' ? 'bg-emerald-100' :
                confirmVariant === 'warning' ? 'bg-amber-100' :
                'bg-blue-100'
              }`}>
                {icon}
              </div>
            )}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={getConfirmButtonClass()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
