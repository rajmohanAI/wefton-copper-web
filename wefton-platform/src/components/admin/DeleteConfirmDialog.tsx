'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-[60] p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div className="flex-1">
              <Dialog.Title className="text-base font-medium text-[var(--text-light)]">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-[var(--text-muted)] mt-1">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} loading={loading} disabled={loading}>
              Delete
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
