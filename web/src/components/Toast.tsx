import { useToastStore } from '../store/toastStore';

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <button type="button" key={t.id} onClick={() => remove(t.id)} className={`toast toast--${t.type}`}>
          {t.message}
        </button>
      ))}
    </div>
  );
}
