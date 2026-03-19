import { useEffect } from 'react';

export function useMetaTags(tags: Record<string, string> | null): void {
  const serialized = tags ? JSON.stringify(tags) : null;
  useEffect(() => {
    if (!serialized) return;
    const parsed = JSON.parse(serialized) as Record<string, string>;
    const added: HTMLMetaElement[] = [];
    for (const [property, content] of Object.entries(parsed)) {
      const existing = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (existing) {
        existing.setAttribute('content', content);
      } else {
        const el = document.createElement('meta');
        el.setAttribute('property', property);
        el.setAttribute('content', content);
        document.head.appendChild(el);
        added.push(el);
      }
    }
    return () => {
      for (const el of added) {
        if (document.head.contains(el)) document.head.removeChild(el);
      }
    };
  }, [serialized]);
}
