import { useToastStore } from '../store/toastStore';

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            background: t.type === 'success' ? '#2d6a4f' : '#c0392b',
            color: '#fff',
            fontSize: 14,
            maxWidth: 320,
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.2s ease',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
