import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentCode =
    SUPPORTED_LANGUAGES.find(
      (l) => i18n.language === l.code || i18n.language.startsWith(l.code + '-'),
    )?.code ?? 'en';

  return (
    <select
      value={currentCode}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="lang-select"
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
