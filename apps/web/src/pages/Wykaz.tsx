import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { WykazFiltersModern } from "@/components/wykaz/WykazFiltersModern";
import { WykazTableModern } from "@/components/wykaz/WykazTableModern";
import { WykazDetails } from "@/components/wykaz/WykazDetails";
import { useWykazData } from "@/hooks/useWykazData";
import { Journal, exportToCSV, WykazFilters as Filters, fetchSingleJournal } from "@/lib/wykazApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, RefreshCw } from "lucide-react";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
export default function Wykaz() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'points' | 'title' | 'if_proxy' | 'h_index'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isEnriching, setIsEnriching] = useState(false);
  useEffect(() => {
    // Auto-detect latest published_date
    const fetchLatestDate = async () => {
      const { data } = await supabase
        .from('journals_master')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.updated_at) {
        setLatestDate(data.updated_at);
      }
    };
    fetchLatestDate();
  }, []);
  const filters: Filters = {
    q: searchParams.get('q') || undefined,
    minPoints: searchParams.get('minPoints') ? parseInt(searchParams.get('minPoints')!) : undefined,
    maxPoints: searchParams.get('maxPoints') ? parseInt(searchParams.get('maxPoints')!) : undefined,
    discipline: searchParams.get('discipline') || undefined,
    oa_statuses: searchParams.get('oa_status') ? searchParams.get('oa_status')!.split(',') : undefined,
    apc_range: searchParams.get('apc_range') || undefined,
    erih_plus: searchParams.get('erih_plus') === 'true' ? true : undefined,
    has_doaj: searchParams.get('has_doaj') === 'true' ? true : undefined,
    country_codes: searchParams.get('country_codes') ? searchParams.get('country_codes')!.split(',') : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  };
  const {
    data,
    isLoading,
    error,
    hasMore,
    isTimeout,
    retry
  } = useWykazData(filters);
  const handleFiltersChange = (newFilters: Filters) => {
    const params = new URLSearchParams();
    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.minPoints !== undefined) params.set('minPoints', newFilters.minPoints.toString());
    if (newFilters.maxPoints !== undefined) params.set('maxPoints', newFilters.maxPoints.toString());
    if (newFilters.discipline) params.set('discipline', newFilters.discipline);
    if (newFilters.oa_statuses?.length) params.set('oa_status', newFilters.oa_statuses.join(','));
    if (newFilters.apc_range) params.set('apc_range', newFilters.apc_range);
    if (newFilters.erih_plus) params.set('erih_plus', 'true');
    if (newFilters.has_doaj) params.set('has_doaj', 'true');
    if (newFilters.country_codes?.length) params.set('country_codes', newFilters.country_codes.join(','));
    setSearchParams(params);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field as any);
      setSortOrder(field === 'title' ? 'asc' : 'desc');
    }
  };

  // Synchronous - just open sidebar immediately
  const handleRowClick = (journal: Journal) => {
    setSelectedJournal(journal);
    setDetailsOpen(true);
  };

  // Auto-enrichment runs AFTER sidebar is open
  useEffect(() => {
    if (!detailsOpen || !selectedJournal) return;
    
    const journalId = selectedJournal.journal_id || selectedJournal.id || 
                      selectedJournal.issn_print || selectedJournal.issn_electronic;
    if (!journalId) return;

    let isCancelled = false;
    
    const enrichJournal = async () => {
      setIsEnriching(true);
      try {
        await supabase.functions.invoke('enrich-journal-all', {
          body: { journalId }
        });
        
        const freshJournal = await fetchSingleJournal(journalId);
        if (freshJournal && !isCancelled) {
          setSelectedJournal(freshJournal);
        }
      } catch (error) {
        console.error('Auto-enrich failed:', error);
      } finally {
        if (!isCancelled) {
          setIsEnriching(false);
        }
      }
    };
    
    // Small delay to let Sheet animation complete
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
        if (freshJournal) {
          setSelectedJournal(freshJournal);
        }
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsEnriching(false);
    }
  };
  const handleExport = () => {
    exportToCSV(data);
  };
  return <div className="min-h-screen flex flex-col bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background border-b border-border/50 pt-16">
        <div className="container max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Wykaz czasopism punktowanych MEiN</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mb-3 font-normal">
            Interaktywne narzędzie wyszukiwania czasopism w wykazie MEiN posiadające znamiona przydatności w meandrach - szerzej znanej w węższym gronie  - "punktozy" Nauki.                                                
          </p>
          {latestDate && <p className="text-sm text-muted-foreground">
              Aktualny wykaz z dnia: <strong>{format(new Date(latestDate), 'dd MMMM yyyy', {
              locale: pl
            })}</strong>
            </p>}
        </div>
      </section>

      <WykazFiltersModern filters={filters} onFiltersChange={handleFiltersChange} />

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        {isTimeout && <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Baza danych jest przeciążona. Spróbuj ponownie za chwilę lub zawęź filtry wyszukiwania.</span>
              <Button variant="outline" size="sm" onClick={retry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Ponów
              </Button>
            </AlertDescription>
          </Alert>}

        {error && !isTimeout && <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Nie udało się pobrać danych. Spróbuj ponownie.</span>
              <Button variant="outline" size="sm" onClick={retry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Ponów
              </Button>
            </AlertDescription>
          </Alert>}

        {hasMore && <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Wyświetlono 50 wyników. Zawęź filtry, aby zobaczyć dokładniejsze rezultaty.
            </AlertDescription>
          </Alert>}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                'Wczytywanie...'
              ) : (
                <>
                  Znaleziono <span className="font-semibold text-foreground">{data.length}</span> czasopism
                </>
              )}
            </p>
            {hasMore && (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Limit 50 wyników
              </Badge>
            )}
          </div>
          <Button onClick={handleExport} disabled={data.length === 0 || isLoading} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Eksport CSV
          </Button>
        </div>

        <WykazTableModern 
          data={data} 
          isLoading={isLoading} 
          onRowClick={handleRowClick}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
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