import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language.split('-')[0]}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      style={selectStyle}
      aria-label="Language"
    >
      {SUPPORTED_LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #ddd',
  fontSize: 13,
  background: '#fff',
  cursor: 'pointer',
  color: '#555',
};
