import { useState, useEffect, useCallback } from 'react';
import { fetchJournals, WykazFilters, Journal } from '@/lib/wykazApi';

export function useWykazData(filters: WykazFilters) {
  const [data, setData] = useState<Journal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsTimeout(false);
    
    try {
      const result = await fetchJournals(filters);
      setData(result.data);
      setHasMore(result.hasMore);
      setIsTimeout(result.timeout || false);
    } catch (err) {
      setError(err as Error);
      setData([]);
      setIsTimeout(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.q, 
    filters.minPoints, 
    filters.maxPoints, 
    filters.discipline,
    filters.oa_statuses?.join(','),
    filters.apc_range,
    filters.erih_plus,
    filters.has_doaj,
    filters.country_codes?.join(','),
    filters.sort_by,
    filters.sort_order,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300); // debounce

    return () => clearTimeout(timeoutId);
  }, [loadData]);

  return { data, isLoading, error, hasMore, isTimeout, retry: loadData };
}
