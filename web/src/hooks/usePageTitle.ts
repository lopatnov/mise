import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { adminApi } from '../api/admin';

export function usePageTitle(pageTitle?: string): string {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: adminApi.getPublicSettings,
    staleTime: Infinity,
  });
  const siteTitle = data?.siteTitle ?? 'Mise';
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | ${siteTitle}` : siteTitle;
  }, [pageTitle, siteTitle]);
  return siteTitle;
}
