import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="error-boundary">
      <h2 className="error-boundary__title">{t('error.title')}</h2>
      <p className="error-boundary__message">{t('error.message')}</p>
      <button type="button" onClick={onReset}>
        {t('error.retry')}
      </button>
    </div>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
