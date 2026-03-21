import { useEffect } from 'react';

interface Props {
  src: string;
  onClose: () => void;
}

export default function Lightbox({ src, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="lightbox">
      <button type="button" className="lightbox__backdrop" onClick={onClose} tabIndex={-1} aria-label="Close" />
      <button type="button" className="lightbox__close" onClick={onClose}>
        ✕
      </button>
      <img src={src} alt="" className="lightbox__img" />
    </div>
  );
}
