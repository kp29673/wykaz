import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { WykazFiltersModern } from "@/components/wykaz/WykazFiltersModern";
import { WykazTableModern } from "@/components/wykaz/WykazTableModern";
import { WykazDetails } from "@/components/wykaz/WykazDetails";
import { useWykazData } from "@/hooks/useWykazData";
import { Journal, exportToCSV, WykazFilters as Filters, WykazSortField, fetchSingleJournal } from "@/lib/wykazApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, RefreshCw, X } from "lucide-react";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const INITIAL_VISIBLE_RESULTS = 50;
const RESULT_STEP = 50;

function parseListParam(value: string | null): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

function getJournalNumber(journal: Journal, field: WykazSortField): number | null {
  const value = field === 'points'
    ? journal.points
    : field === 'impact_factor'
      ? journal.impact_factor
      : field === 'if_proxy'
        ? journal.if_proxy
        : field === 'h_index'
          ? journal.h_index
          : null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function compareJournals(a: Journal, b: Journal, field: WykazSortField, order: 'asc' | 'desc'): number {
  const direction = order === 'asc' ? 1 : -1;

  if (field === 'title') {
    return a.title.localeCompare(b.title, 'pl', { sensitivity: 'base' }) * direction;
  }

  const aValue = getJournalNumber(a, field);
  const bValue = getJournalNumber(b, field);
  if (aValue === null && bValue === null) return a.title.localeCompare(b.title, 'pl', { sensitivity: 'base' });
  if (aValue === null) return 1;
  if (bValue === null) return -1;
  if (aValue === bValue) return a.title.localeCompare(b.title, 'pl', { sensitivity: 'base' });
  return (aValue - bValue) * direction;
}

export default function Wykaz() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<WykazSortField>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_RESULTS);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    const fetchLatestDate = async () => {
      const { data } = await supabase
        .from('journals_master')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.updated_at) setLatestDate(data.updated_at);
    };
    fetchLatestDate();
  }, []);

  const selectedDisciplines = useMemo(() => {
    const explicit = parseListParam(searchParams.get('disciplines'));
    if (explicit.length) return explicit;
    return parseListParam(searchParams.get('discipline'));
  }, [searchParams]);

  const filters: Filters = {
    q: searchParams.get('q') || undefined,
    minPoints: searchParams.get('minPoints') ? parseInt(searchParams.get('minPoints')!) : undefined,
    maxPoints: searchParams.get('maxPoints') ? parseInt(searchParams.get('maxPoints')!) : undefined,
    disciplines: selectedDisciplines.length ? selectedDisciplines : undefined,
    discipline: selectedDisciplines[0],
    oa_statuses: searchParams.get('oa_status') ? searchParams.get('oa_status')!.split(',') : undefined,
    apc_range: searchParams.get('apc_range') || undefined,
    erih_plus: searchParams.get('erih_plus') === 'true' ? true : undefined,
    has_doaj: searchParams.get('has_doaj') === 'true' ? true : undefined,
    country_codes: searchParams.get('country_codes') ? searchParams.get('country_codes')!.split(',') : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    limit: Math.max(visibleCount, INITIAL_VISIBLE_RESULTS),
  };

  const {
    data,
    count,
    isLoading,
    error,
    hasMore,
    isTimeout,
    retry
  } = useWykazData(filters);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_RESULTS);
  }, [
    filters.q,
    filters.minPoints,
    filters.maxPoints,
    selectedDisciplines.join(','),
    filters.oa_statuses?.join(','),
    filters.apc_range,
    filters.erih_plus,
    filters.has_doaj,
    filters.country_codes?.join(','),
    sortBy,
    sortOrder,
  ]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => compareJournals(a, b, sortBy, sortOrder));
  }, [data, sortBy, sortOrder]);

  const visibleData = useMemo(() => sortedData.slice(0, visibleCount), [sortedData, visibleCount]);
  const canShowMore = visibleCount < sortedData.length;
  const displayedTotal = count || sortedData.length;

  const handleFiltersChange = (newFilters: Filters) => {
    const params = new URLSearchParams();
    const disciplines = newFilters.disciplines?.length
      ? newFilters.disciplines
      : (newFilters.discipline ? [newFilters.discipline] : []);

    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.minPoints !== undefined) params.set('minPoints', newFilters.minPoints.toString());
    if (newFilters.maxPoints !== undefined) params.set('maxPoints', newFilters.maxPoints.toString());
    if (disciplines.length) params.set('disciplines', disciplines.join(','));
    if (newFilters.oa_statuses?.length) params.set('oa_status', newFilters.oa_statuses.join(','));
    if (newFilters.apc_range) params.set('apc_range', newFilters.apc_range);
    if (newFilters.erih_plus) params.set('erih_plus', 'true');
    if (newFilters.has_doaj) params.set('has_doaj', 'true');
    if (newFilters.country_codes?.length) params.set('country_codes', newFilters.country_codes.join(','));
    setSearchParams(params);
  };

  const toggleDiscipline = (discipline: string) => {
    const updated = selectedDisciplines.includes(discipline)
      ? selectedDisciplines.filter((item) => item !== discipline)
      : [...selectedDisciplines, discipline];
    handleFiltersChange({ ...filters, disciplines: updated.length ? updated : undefined, discipline: updated[0] });
  };

  const clearDiscipline = (discipline: string) => {
    const updated = selectedDisciplines.filter((item) => item !== discipline);
    handleFiltersChange({ ...filters, disciplines: updated.length ? updated : undefined, discipline: updated[0] });
  };

  const handleSort = (field: string) => {
    const nextField = field as WykazSortField;
    if (sortBy === nextField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(nextField);
      setSortOrder(nextField === 'title' ? 'asc' : 'desc');
    }
  };

  const handleRowClick = (journal: Journal) => {
    setSelectedJournal(journal);
    setDetailsOpen(true);
  };

  useEffect(() => {
    if (!detailsOpen || !selectedJournal) return;
    const journalId = selectedJournal.journal_id || selectedJournal.id || selectedJournal.issn_print || selectedJournal.issn_electronic;
    if (!journalId) return;

    let isCancelled = false;
    const enrichJournal = async () => {
      setIsEnriching(true);
      try {
        await supabase.functions.invoke('enrich-journal-all', { body: { journalId } });
        const freshJournal = await fetchSingleJournal(journalId);
        if (freshJournal && !isCancelled) setSelectedJournal(freshJournal);
      } catch (error) {
        console.error('Auto-enrich failed:', error);
      } finally {
        if (!isCancelled) setIsEnriching(false);
      }
    };

    const timer = setTimeout(enrichJournal, 150);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [detailsOpen, selectedJournal?.journal_id]);

  const handleRefreshJournal = async () => {
    if (!selectedJournal) return;
    setIsEnriching(true);
    try {
      const preferredId = selectedJournal.journal_id || selectedJournal.id || selectedJournal.issn_print || selectedJournal.issn_electronic;
      if (preferredId) {
        const freshJournal = await fetchSingleJournal(preferredId);
        if (freshJournal) setSelectedJournal(freshJournal);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleExport = () => {
    exportToCSV(visibleData);
  };

  return <div className="min-h-screen flex flex-col bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <section className="bg-gradient-to-b from-primary/5 to-background border-b border-border/50 pt-16">
        <div className="container max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Wykaz czasopism punktowanych MEiN</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mb-3 font-normal">
            Interaktywne narzędzie wyszukiwania czasopism w wykazie MEiN posiadające znamiona przydatności w meandrach - szerzej znanej w węższym gronie  - "punktozy" Nauki.
          </p>
          {latestDate && <p className="text-sm text-muted-foreground">
              Aktualny wykaz z dnia: <strong>{format(new Date(latestDate), 'dd MMMM yyyy', { locale: pl })}</strong>
            </p>}
        </div>
      </section>

      <WykazFiltersModern filters={filters} onFiltersChange={handleFiltersChange} />

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        {isTimeout && <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Baza danych jest przeciążona. Spróbuj ponownie za chwilę lub zawęź filtry wyszukiwania.</span>
              <Button variant="outline" size="sm" onClick={retry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Ponów
              </Button>
            </AlertDescription>
          </Alert>}

        {error && !isTimeout && <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>Nie udało się pobrać danych. Spróbuj ponownie.</span>
              <Button variant="outline" size="sm" onClick={retry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Ponów
              </Button>
            </AlertDescription>
          </Alert>}

        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Wczytywanie...' : <>Pokazano <span className="font-semibold text-foreground">{visibleData.length}</span>{displayedTotal > visibleData.length ? <> z <span className="font-semibold text-foreground">{displayedTotal}</span></> : null} czasopism</>}
              </p>
              {hasMore && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  są kolejne wyniki po stronie serwera
                </Badge>
              )}
            </div>
            <Button onClick={handleExport} disabled={visibleData.length === 0 || isLoading} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Eksport CSV widocznych wyników
            </Button>
          </div>

          {selectedDisciplines.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-muted/30 p-3">
              <span className="text-xs font-medium text-muted-foreground">Dyscypliny:</span>
              {selectedDisciplines.map((discipline) => (
                <button
                  key={discipline}
                  type="button"
                  onClick={() => clearDiscipline(discipline)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  {discipline}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleFiltersChange({ ...filters, disciplines: undefined, discipline: undefined })}>
                Wyczyść dyscypliny
              </Button>
            </div>
          )}
        </div>

        <WykazTableModern
          data={visibleData}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          selectedDisciplines={selectedDisciplines}
          onDisciplineToggle={toggleDiscipline}
        />

        {canShowMore && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => setVisibleCount((current) => current + RESULT_STEP)}>
              Pokaż kolejne {Math.min(RESULT_STEP, sortedData.length - visibleCount)}
            </Button>
          </div>
        )}
      </main>

      <WykazDetails
        journal={selectedJournal}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onRefresh={handleRefreshJournal}
        isEnriching={isEnriching}
      />

      <Footer />
    </div>;
}
