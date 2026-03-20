interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export default function ConfirmDialog({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmDialogProps) {
  return (
    <div className="confirm-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button onClick={onCancel} className="btn btn--outline">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={isPending} className="btn btn--danger">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
