import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import bg from './locales/bg.json';
import cs from './locales/cs.json';
import da from './locales/da.json';
import de from './locales/de.json';
import el from './locales/el.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fi from './locales/fi.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import hr from './locales/hr.json';
import hu from './locales/hu.json';
import id from './locales/id.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import lt from './locales/lt.json';
import lv from './locales/lv.json';
import nl from './locales/nl.json';
import no from './locales/no.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ptBR from './locales/pt-BR.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import sk from './locales/sk.json';
import sv from './locales/sv.json';
import th from './locales/th.json';
import tr from './locales/tr.json';
import uk from './locales/uk.json';
import vi from './locales/vi.json';
import zh from './locales/zh.json';
import zhTW from './locales/zh-TW.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'uk', label: 'Ukrainian — Українська' },
  { code: 'ru', label: 'Russian — Русский' },
  { code: 'bg', label: 'Bulgarian — Български' },
  { code: 'cs', label: 'Czech — Čeština' },
  { code: 'da', label: 'Danish — Dansk' },
  { code: 'de', label: 'German — Deutsch' },
  { code: 'el', label: 'Greek — Ελληνικά' },
  { code: 'es', label: 'Spanish — Español' },
  { code: 'fi', label: 'Finnish — Suomi' },
  { code: 'fr', label: 'French — Français' },
  { code: 'hi', label: 'Hindi — हिन्दी' },
  { code: 'hr', label: 'Croatian — Hrvatski' },
  { code: 'hu', label: 'Hungarian — Magyar' },
  { code: 'id', label: 'Indonesian — Bahasa Indonesia' },
  { code: 'it', label: 'Italian — Italiano' },
  { code: 'ja', label: 'Japanese — 日本語' },
  { code: 'ko', label: 'Korean — 한국어' },
  { code: 'lt', label: 'Lithuanian — Lietuvių' },
  { code: 'lv', label: 'Latvian — Latviešu' },
  { code: 'nl', label: 'Dutch — Nederlands' },
  { code: 'no', label: 'Norwegian — Norsk' },
  { code: 'pl', label: 'Polish — Polski' },
  { code: 'pt', label: 'Portuguese — Português' },
  { code: 'pt-BR', label: 'Brazilian Portuguese — Português (Brasil)' },
  { code: 'ro', label: 'Romanian — Română' },
  { code: 'sk', label: 'Slovak — Slovenčina' },
  { code: 'sv', label: 'Swedish — Svenska' },
  { code: 'th', label: 'Thai — ภาษาไทย' },
  { code: 'tr', label: 'Turkish — Türkçe' },
  { code: 'vi', label: 'Vietnamese — Tiếng Việt' },
  { code: 'zh', label: 'Chinese Simplified — 中文 (简体)' },
  { code: 'zh-TW', label: 'Chinese Traditional — 繁體中文' },
];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
      ru: { translation: ru },
      bg: { translation: bg },
      cs: { translation: cs },
      da: { translation: da },
      de: { translation: de },
      el: { translation: el },
      es: { translation: es },
      fi: { translation: fi },
      fr: { translation: fr },
      hi: { translation: hi },
      hr: { translation: hr },
      hu: { translation: hu },
      id: { translation: id },
      it: { translation: it },
      ja: { translation: ja },
      ko: { translation: ko },
      lt: { translation: lt },
      lv: { translation: lv },
      nl: { translation: nl },
      no: { translation: no },
      pl: { translation: pl },
      pt: { translation: pt },
      'pt-BR': { translation: ptBR },
      ro: { translation: ro },
      sk: { translation: sk },
      sv: { translation: sv },
      th: { translation: th },
      tr: { translation: tr },
      vi: { translation: vi },
      zh: { translation: zh },
      'zh-TW': { translation: zhTW },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
