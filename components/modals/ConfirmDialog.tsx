/**
 * Confirm Dialog Component
 * Beautiful confirmation dialog using shadcn AlertDialog
 * Replaces native confirm() with accessible, animated dialogs
 */
'use client';

import * as React from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export type ConfirmDialogType = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmDialogType;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  isLoading = false,
}: ConfirmDialogProps) {
  const icons = {
    danger: <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  };

  const actionStyles = {
    danger: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white border-transparent',
    warning: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white border-transparent',
    info: 'bg-gray-900 hover:bg-gray-800 dark:bg-gray-50 dark:hover:bg-gray-200 text-white dark:text-gray-900 border-transparent',
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            {icons[type]}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={onClose}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(actionStyles[type], 'min-w-[100px]')}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook for easy confirm dialog usage
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ConfirmDialogType;
    confirmText?: string;
    cancelText?: string;
    isLoading: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    isLoading: false,
    onConfirm: () => {},
  });

  const confirm = (options: {
    title: string;
    message: string;
    type?: ConfirmDialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    setDialogState({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      isLoading: false,
      onConfirm: options.onConfirm,
    });
  };

  const handleConfirm = async () => {
    setDialogState(prev => ({ ...prev, isLoading: true }));
    try {
      await dialogState.onConfirm();
      setDialogState(prev => ({ ...prev, isOpen: false, isLoading: false }));
    } catch (error) {
      setDialogState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const handleClose = () => {
    if (!dialogState.isLoading) {
      setDialogState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const Dialog = () => (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={dialogState.title}
      message={dialogState.message}
      type={dialogState.type}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      isLoading={dialogState.isLoading}
    />
  );

  return { confirm, Dialog };
}
