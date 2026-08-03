import type { ReactNode } from 'react';

interface ImportDialogShellProps {
  title: string;
  hint: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  loading: boolean;
  loadingLabel: string;
  submitLabel: string;
  cancelLabel: string;
  submitDisabled?: boolean;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}

/** Shared overlay/backdrop/form chrome for the recipe-import dialogs (URL, pasted text) */
export default function ImportDialogShell({
  title,
  hint,
  onSubmit,
  onClose,
  loading,
  loadingLabel,
  submitLabel,
  cancelLabel,
  submitDisabled,
  error,
  wide,
  children,
}: ImportDialogShellProps) {
  return (
    <div className="confirm-overlay">
      <button
        type="button"
        className="confirm-overlay__backdrop"
        onClick={onClose}
        tabIndex={-1}
        aria-label={cancelLabel}
      />
      <div role="dialog" aria-modal="true" className={wide ? 'confirm-dialog confirm-dialog--wide' : 'confirm-dialog'}>
        <h2 className="import-dialog__title">{title}</h2>
        <p className="import-dialog__hint">{hint}</p>
        <form onSubmit={onSubmit} className="import-dialog__form">
          {children}
          {error && <p className="form-error">{error}</p>}
          <div className="confirm-dialog__actions">
            <button type="button" onClick={onClose} className="outline">
              {cancelLabel}
            </button>
            <button type="submit" disabled={loading || submitDisabled}>
              {loading ? loadingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
