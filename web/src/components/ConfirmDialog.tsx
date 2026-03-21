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
    <div className="confirm-overlay">
      <button
        type="button"
        className="confirm-overlay__backdrop"
        onClick={onCancel}
        tabIndex={-1}
        aria-label={cancelLabel}
      />
      <div role="dialog" aria-modal="true" className="confirm-dialog">
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" onClick={onCancel} className="outline">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="btn-danger">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
