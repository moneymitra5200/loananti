'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle, XCircle, Send, Trash2, Save, RefreshCw, DollarSign } from 'lucide-react';

type ConfirmType = 'approve' | 'reject' | 'delete' | 'submit' | 'save' | 'send' | 'disburse' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  onConfirm: () => void;
  loading?: boolean;
}

const typeConfig: Record<ConfirmType, { icon: React.ReactNode; colorClass: string; bgClass: string }> = {
  approve: {
    icon: <CheckCircle className="h-6 w-6" />,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50 border-emerald-200',
  },
  reject: {
    icon: <XCircle className="h-6 w-6" />,
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50 border-red-200',
  },
  delete: {
    icon: <Trash2 className="h-6 w-6" />,
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50 border-red-200',
  },
  submit: {
    icon: <Send className="h-6 w-6" />,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  save: {
    icon: <Save className="h-6 w-6" />,
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50 border-green-200',
  },
  send: {
    icon: <Send className="h-6 w-6" />,
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50 border-purple-200',
  },
  disburse: {
    icon: <DollarSign className="h-6 w-6" />,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 border-amber-200',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6" />,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 border-orange-200',
  },
  info: {
    icon: <RefreshCw className="h-6 w-6" />,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 border-blue-200',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'approve',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const config = typeConfig[type];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className={`mx-auto mb-4 p-3 rounded-full ${config.bgClass} border-2`}>
            <div className={config.colorClass}>{config.icon}</div>
          </div>
          <AlertDialogTitle className="text-center text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-gray-600">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={`w-full sm:w-auto ${
              type === 'delete' || type === 'reject'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                : type === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600'
                : type === 'submit' || type === 'send'
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600'
                : type === 'disburse'
                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600'
                : 'bg-primary hover:bg-primary/90'
            } text-white`}
          >
            {loading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easier usage
export function useConfirmDialog() {
  const [state, setState] = React.useState({
    open: false,
    title: '',
    description: '',
    type: 'approve' as ConfirmType,
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  const showConfirm = React.useCallback(
    (options: {
      title: string;
      description: string;
      type?: ConfirmType;
      confirmText?: string;
      onConfirm: () => void;
    }) => {
      setState({
        open: true,
        title: options.title,
        description: options.description,
        type: options.type || 'approve',
        confirmText: options.confirmText || 'Confirm',
        onConfirm: options.onConfirm,
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    state.onConfirm();
    setState((prev) => ({ ...prev, open: false }));
  }, [state]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return {
    showConfirm,
    confirmDialogProps: {
      open: state.open,
      onOpenChange: handleOpenChange,
      title: state.title,
      description: state.description,
      type: state.type,
      confirmText: state.confirmText,
      onConfirm: handleConfirm,
    },
  };
}
