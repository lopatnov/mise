import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

interface HiddenPhotoInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
}

/** A visually hidden file input a visible button opens through `inputRef.current?.click()` */
export default function HiddenPhotoInput({ inputRef, onFile }: HiddenPhotoInputProps) {
  const { t } = useTranslation();
  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      aria-label={t('recipe.detail.changePhoto')}
      className="visually-hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        // Clear the value so choosing the same file again still fires onChange
        e.target.value = '';
      }}
    />
  );
}
