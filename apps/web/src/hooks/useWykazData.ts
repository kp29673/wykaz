import { useState, useEffect, useCallback } from 'react';
import { fetchJournals, WykazFilters, Journal } from '@/lib/wykazApi';

export function useWykazData(filters: WykazFilters) {
  const [data, setData] = useState<Journal[]>([]);
  const [count, setCount] = useState(0);
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
      setCount(result.count ?? result.data.length);
      setHasMore(result.hasMore);
      setIsTimeout(result.timeout || false);
    } catch (err) {
      setError(err as Error);
      setData([]);
      setCount(0);
      setIsTimeout(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.q, 
    filters.minPoints, 
    filters.maxPoints, 
    filters.discipline,
    filters.disciplines?.join(','),
    filters.oa_statuses?.join(','),
    filters.apc_range,
    filters.erih_plus,
    filters.has_doaj,
    filters.country_codes?.join(','),
    filters.sort_by,
    filters.sort_order,
    filters.limit,
    filters.offset,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [loadData]);

  return { data, count, isLoading, error, hasMore, isTimeout, retry: loadData };
}
