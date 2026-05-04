import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, Check, X, RefreshCw, Database, ChevronLeft, ChevronRight, Play, Square, AlertTriangle, Trash2 } from 'lucide-react';

interface JournalItem {
  id: string;
  journal_id: string;
  title: string;
  issn_print: string | null;
  issn_electronic: string | null;
  openalex_id: string | null;
  crossref_updated_at: string | null;
  doaj_updated_at: string | null;
  wikipedia_checked_at: string | null;
  last_enriched_at: string | null;
}

interface Stats {
  total: number;
  enriched: number;
  notEnriched: number;
  openalexCount: number;
  crossrefCount: number;
  doajCount: number;
  wikipediaCount: number;
}

interface EnrichmentError {
  id: string;
  journalId: string;
  journalTitle: string;
  issn: string | null;
  errorMessage: string;
  errorSource: string;
  timestamp: Date;
}

const PAGE_SIZE = 100;
const PARALLEL_LIMIT = 5;
const BATCH_OPTIONS = [100, 500, 1000, 2000, 5000];

export function ManualEnrichment() {
  const [activeTab, setActiveTab] = useState<'not-enriched' | 'enriched' | 'errors'>('not-enriched');
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);
  
  // Continuous enrichment state
  const [continuousMode, setContinuousMode] = useState(false);
  const [continuousBatchSize, setContinuousBatchSize] = useState(0);
  const [totalEnrichedInSession, setTotalEnrichedInSession] = useState(0);
  const stopContinuousRef = useRef(false);
  
  // Error tracking state
  const [enrichmentErrors, setEnrichmentErrors] = useState<EnrichmentError[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      // Get total count
      const { count: total } = await supabase
        .from('journals_master')
        .select('id', { count: 'exact', head: true });

      // Get enriched count (last_enriched_at IS NOT NULL)
      const { count: enriched } = await supabase
        .from('journals_master')
        .select('id', { count: 'exact', head: true })
        .not('last_enriched_at', 'is', null);

      // Get source-specific counts
      const { count: openalexCount } = await supabase
        .from('journals_master')
        .select('id', { count: 'exact', head: true })
        .not('openalex_id', 'is', null);

      const { count: crossrefCount } = await supabase
        .from('journals_master')
        .select('id', { count: 'exact', head: true })
        .not('crossref_updated_at', 'is', null);

      const { count: doajCount } = await supabase
        .from('journals_master')
        .select('id', { count: 'exact', head: true })
        .not('doaj_updated_at', 'is', null);

      const { count: wikipediaCount } = await supabase
        .from('journals_master')
        .select('id', { count: 'exact', head: true })
        .not('wikipedia_checked_at', 'is', null);

      setStats({
        total: total || 0,
        enriched: enriched || 0,
        notEnriched: (total || 0) - (enriched || 0),
        openalexCount: openalexCount || 0,
        crossrefCount: crossrefCount || 0,
        doajCount: doajCount || 0,
        wikipediaCount: wikipediaCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchJournals = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('journals_master')
        .select('id, journal_id, title, issn_print, issn_electronic, openalex_id, crossref_updated_at, doaj_updated_at, wikipedia_checked_at, last_enriched_at', { count: 'exact' });

      // Filter by enrichment status using last_enriched_at
      if (activeTab === 'enriched') {
        query = query.not('last_enriched_at', 'is', null);
      } else {
        query = query.is('last_enriched_at', null);
      }

      // Search filter
      if (searchQuery.trim()) {
        const term = searchQuery.trim();
        query = query.or(`title.ilike.%${term}%,issn_print.ilike.%${term}%,issn_electronic.ilike.%${term}%`);
      }

      // Pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order('title', { ascending: true })
        .range(from, to);

      if (error) throw error;

      setJournals(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) {
      console.error('Error fetching journals:', error);
      toast.error('Błąd podczas pobierania journali');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [activeTab, searchQuery]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === journals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(journals.map(j => j.id)));
    }
  };

  // Select next N journals for enrichment (from unenriched pool, sorted by title)
  const selectNextBatch = async (count: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('journals_master')
        .select('id')
        .is('last_enriched_at', null)
        .order('title', { ascending: true })
        .limit(count);

      if (error) throw error;

      const ids = new Set(data?.map(j => j.id) || []);
      setSelectedIds(ids);
      toast.success(`Zaznaczono ${ids.size} journali do wzbogacenia`);
    } catch (err) {
      console.error('Error selecting batch:', err);
      toast.error('Błąd podczas zaznaczania');
    } finally {
      setLoading(false);
    }
  };

  // Parallel enrichment with limit - returns success count
  const enrichBatch = async (ids: string[], journalMap?: Map<string, JournalItem>): Promise<{ success: number; error: number }> => {
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < ids.length; i += PARALLEL_LIMIT) {
      // Check if we should stop
      if (stopContinuousRef.current) break;

      const batch = ids.slice(i, i + PARALLEL_LIMIT);

      const results = await Promise.allSettled(
        batch.map(journalId =>
          supabase.functions.invoke('enrich-journal-all', { body: { journalId } })
        )
      );

      results.forEach((result, idx) => {
        const journalId = batch[idx];
        const journalInfo = journalMap?.get(journalId);
        
        if (result.status === 'fulfilled' && !result.value.error) {
          // Check for partial failures in the response
          const data = result.value.data;
          if (data?.results) {
            const failedServices = Object.entries(data.results)
              .filter(([_, status]) => status !== 'success')
              .map(([service]) => service);
            
            if (failedServices.length > 0 && failedServices.length < 4) {
              // Partial success - some services failed
              successCount++;
              setEnrichmentErrors(prev => [...prev, {
                id: `${journalId}-${Date.now()}`,
                journalId,
                journalTitle: journalInfo?.title || data?.journal?.title || 'Nieznany',
                issn: journalInfo?.issn_print || journalInfo?.issn_electronic || null,
                errorMessage: `Częściowy sukces. Nieudane: ${failedServices.join(', ')}`,
                errorSource: failedServices.join(', '),
                timestamp: new Date()
              }]);
            } else if (failedServices.length === 4) {
              errorCount++;
              setEnrichmentErrors(prev => [...prev, {
                id: `${journalId}-${Date.now()}`,
                journalId,
                journalTitle: journalInfo?.title || 'Nieznany',
                issn: journalInfo?.issn_print || journalInfo?.issn_electronic || null,
                errorMessage: 'Wszystkie usługi zwróciły błąd',
                errorSource: 'OpenAlex, Crossref, DOAJ, Wikipedia',
                timestamp: new Date()
              }]);
            } else {
              successCount++;
            }
          } else {
            successCount++;
          }
        } else {
          errorCount++;
          const errorMsg = result.status === 'rejected' 
            ? result.reason?.message || 'Promise rejected'
            : result.value?.error?.message || 'Nieznany błąd';
          
          setEnrichmentErrors(prev => [...prev, {
            id: `${journalId}-${Date.now()}`,
            journalId,
            journalTitle: journalInfo?.title || 'Nieznany',
            issn: journalInfo?.issn_print || journalInfo?.issn_electronic || null,
            errorMessage: errorMsg,
            errorSource: 'Edge Function',
            timestamp: new Date()
          }]);
        }
      });

      setEnrichProgress(prev => prev + batch.length);

      // Short pause between batches
      if (i + PARALLEL_LIMIT < ids.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return { success: successCount, error: errorCount };
  };

  // Clear errors
  const clearErrors = () => {
    setEnrichmentErrors([]);
    toast.success('Wyczyszczono logi błędów');
  };

  // Single batch enrichment (manual)
  const enrichSelected = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Zaznacz co najmniej jeden journal');
      return;
    }

    setEnriching(true);
    setEnrichProgress(0);
    setEnrichTotal(selectedIds.size);

    const ids = Array.from(selectedIds);
    const { success, error } = await enrichBatch(ids);

    setEnriching(false);
    setSelectedIds(new Set());

    if (success > 0) {
      toast.success(`Wzbogacono ${success} journali`);
    }
    if (error > 0) {
      toast.error(`Błąd przy ${error} journalach`);
    }

    fetchStats();
    fetchJournals();
  };

  // Start continuous enrichment
  const startContinuousEnrichment = async (batchSize: number) => {
    stopContinuousRef.current = false;
    setContinuousMode(true);
    setContinuousBatchSize(batchSize);
    setTotalEnrichedInSession(0);
    setEnriching(true);
    setActiveTab('not-enriched');

    let totalSuccess = 0;
    let totalErrors = 0;
    let batchNumber = 0;

    while (!stopContinuousRef.current) {
      batchNumber++;
      
      // Fetch next batch of unenriched journals
      const { data, error } = await supabase
        .from('journals_master')
        .select('id')
        .is('last_enriched_at', null)
        .order('title', { ascending: true })
        .limit(batchSize);

      if (error) {
        toast.error(`Błąd pobierania danych: ${error.message}`);
        break;
      }

      if (!data || data.length === 0) {
        toast.success(`Zakończono! Wszystkie journale wzbogacone.`);
        break;
      }

      // Update UI
      setEnrichProgress(0);
      setEnrichTotal(data.length);
      toast.info(`Partia #${batchNumber}: wzbogacanie ${data.length} journali...`);

      const ids = data.map(j => j.id);
      const { success, error: errCount } = await enrichBatch(ids);

      totalSuccess += success;
      totalErrors += errCount;
      setTotalEnrichedInSession(prev => prev + success);

      // Non-blocking stats refresh every 5 batches (don't await - prevents freezing)
      if (batchNumber % 5 === 0) {
        fetchStats().catch(err => console.warn('Stats refresh failed:', err));
      }
      // Don't refresh journal list during continuous mode - too heavy

      // Check if stopped
      if (stopContinuousRef.current) {
        toast.info(`Zatrzymano po partii #${batchNumber}`);
        break;
      }

      // Short break between batches
      if (data.length === batchSize) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setContinuousMode(false);
    setEnriching(false);
    setContinuousBatchSize(0);

    // Final refresh after loop ends (blocking is OK here)
    await fetchStats();
    await fetchJournals();

    if (totalSuccess > 0 || totalErrors > 0) {
      toast.success(`Sesja zakończona: ${totalSuccess} sukces, ${totalErrors} błędów`);
    }
  };

  // Stop continuous enrichment
  const stopContinuousEnrichment = () => {
    stopContinuousRef.current = true;
    toast.info('Zatrzymywanie po aktualnej partii...');
  };

  // Reset enrichment status for selected journals (move to "do wzbogacenia")
  const resetEnrichmentStatus = async (resetAll: boolean = false) => {
    if (!resetAll && selectedIds.size === 0) {
      toast.warning('Zaznacz co najmniej jeden journal');
      return;
    }

    const count = resetAll ? stats?.enriched || 0 : selectedIds.size;
    const confirmMsg = resetAll 
      ? `Czy na pewno chcesz zresetować status WSZYSTKICH ${count.toLocaleString()} wzbogaconych journali?`
      : `Czy na pewno chcesz zresetować status ${count} zaznaczonych journali?`;
    
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      let query = supabase
        .from('journals_master')
        .update({ last_enriched_at: null });

      if (!resetAll) {
        query = query.in('id', Array.from(selectedIds));
      } else {
        // Reset all enriched journals
        query = query.not('last_enriched_at', 'is', null);
      }

      const { error } = await query;
      if (error) throw error;

      toast.success(`Zresetowano status ${resetAll ? 'wszystkich' : selectedIds.size} journali`);
      setSelectedIds(new Set());
      fetchStats();
      fetchJournals();
    } catch (error) {
      console.error('Error resetting status:', error);
      toast.error('Błąd podczas resetowania statusu');
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ value }: { value: string | null }) => (
    value ? (
      <Check className="h-4 w-4 text-green-500" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/40" />
    )
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Ręczne wzbogacanie journali
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Wszystkie</div>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.enriched.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Wzbogacone</div>
              </div>
              <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.notEnriched.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Do wzbogacenia</div>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <div className="text-sm font-semibold text-blue-600">{stats.openalexCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">OpenAlex</div>
              </div>
              <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                <div className="text-sm font-semibold text-purple-600">{stats.crossrefCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Crossref</div>
              </div>
              <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                <div className="text-sm font-semibold text-amber-600">{stats.doajCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">DOAJ</div>
              </div>
              <div className="text-center p-3 bg-cyan-500/10 rounded-lg">
                <div className="text-sm font-semibold text-cyan-600">{stats.wikipediaCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Wikipedia</div>
              </div>
            </div>
          )}

          {/* Enriching progress */}
          {enriching && (
            <div className="mb-6 p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {continuousMode 
                    ? `Tryb ciągły (partia po ${continuousBatchSize}) - łącznie: ${totalEnrichedInSession.toLocaleString()}`
                    : 'Wzbogacanie w toku...'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {enrichProgress} / {enrichTotal}
                </span>
              </div>
              <Progress value={enrichTotal > 0 ? (enrichProgress / enrichTotal) * 100 : 0} />
              {continuousMode && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={stopContinuousEnrichment}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Zatrzymaj po tej partii
                </Button>
              )}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'not-enriched' | 'enriched' | 'errors')}>
            <TabsList className="mb-4">
              <TabsTrigger value="not-enriched">
                Do wzbogacenia ({stats?.notEnriched.toLocaleString() || 0})
              </TabsTrigger>
              <TabsTrigger value="enriched">
                Wzbogacone ({stats?.enriched.toLocaleString() || 0})
              </TabsTrigger>
              <TabsTrigger value="errors" className="text-red-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Błędy ({enrichmentErrors.length})
              </TabsTrigger>
            </TabsList>

            {/* Errors Tab */}
            <TabsContent value="errors" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Logi błędów z ostatniej sesji wzbogacania
                </div>
                {enrichmentErrors.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearErrors}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Wyczyść logi
                  </Button>
                )}
              </div>

              {enrichmentErrors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Brak błędów do wyświetlenia</p>
                  <p className="text-xs mt-2">Błędy pojawią się tutaj podczas wzbogacania journali</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] border rounded-lg">
                  <div className="divide-y">
                    {enrichmentErrors.slice().reverse().map((error) => (
                      <div key={error.id} className="p-4 hover:bg-muted/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{error.journalTitle}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ID: {error.journalId} {error.issn && `• ISSN: ${error.issn}`}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {error.timestamp.toLocaleTimeString('pl-PL')}
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm">
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            {error.errorSource}
                          </div>
                          <div className="text-red-700 dark:text-red-300 mt-1 text-xs font-mono break-all">
                            {error.errorMessage}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Not Enriched & Enriched Tabs */}
            {(activeTab === 'not-enriched' || activeTab === 'enriched') && (
              <TabsContent value={activeTab} className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po tytule lub ISSN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Batch selection buttons */}
              {activeTab === 'not-enriched' && (
                <div className="flex flex-wrap gap-2 items-center p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Zaznacz kolejne:</span>
                  {BATCH_OPTIONS.map(count => (
                    <Button
                      key={count}
                      variant="outline"
                      size="sm"
                      onClick={() => selectNextBatch(count)}
                      disabled={enriching || loading}
                    >
                      {count.toLocaleString()}
                    </Button>
                  ))}
                </div>
              )}

              {/* Continuous enrichment buttons */}
              {activeTab === 'not-enriched' && !enriching && (
                <div className="flex flex-wrap gap-2 items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <span className="text-sm font-medium text-green-700">Tryb ciągły (do końca):</span>
                  {BATCH_OPTIONS.map(count => (
                    <Button
                      key={`continuous-${count}`}
                      variant="default"
                      size="sm"
                      onClick={() => startContinuousEnrichment(count)}
                      disabled={loading || (stats?.notEnriched || 0) === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      po {count.toLocaleString()}
                    </Button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={journals.length === 0 || enriching}
                >
                  {selectedIds.size === journals.length && journals.length > 0
                    ? 'Odznacz wszystkie'
                    : `Zaznacz wszystkie na stronie (${journals.length})`}
                </Button>
                
                {activeTab === 'not-enriched' && (
                  <Button
                    onClick={enrichSelected}
                    disabled={selectedIds.size === 0 || enriching}
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${enriching ? 'animate-spin' : ''}`} />
                    Wzbogać zaznaczone ({selectedIds.size})
                  </Button>
                )}

                {activeTab === 'enriched' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetEnrichmentStatus(false)}
                      disabled={selectedIds.size === 0 || loading || enriching}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      Resetuj zaznaczone ({selectedIds.size})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetEnrichmentStatus(true)}
                      disabled={loading || enriching || (stats?.enriched || 0) === 0}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Resetuj wszystkie ({stats?.enriched.toLocaleString() || 0})
                    </Button>
                  </>
                )}

                {selectedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                    disabled={enriching}
                  >
                    Wyczyść zaznaczenie
                  </Button>
                )}
              </div>

              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                Znaleziono: {totalCount.toLocaleString()} journali
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="w-10 p-3 text-left">#</th>
                        <th className="w-10 p-3"></th>
                        <th className="p-3 text-left">Tytuł</th>
                        <th className="p-3 text-left w-28">ISSN</th>
                        <th className="p-3 text-center w-14" title="OpenAlex">OA</th>
                        <th className="p-3 text-center w-14" title="Crossref">CR</th>
                        <th className="p-3 text-center w-14" title="DOAJ">DJ</th>
                        <th className="p-3 text-center w-14" title="Wikipedia">WK</th>
                        <th className="p-3 text-left w-28">Ostatnio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground">
                            Ładowanie...
                          </td>
                        </tr>
                      ) : journals.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground">
                            Brak wyników
                          </td>
                        </tr>
                      ) : (
                        journals.map((journal, index) => (
                          <tr
                            key={journal.id}
                            className={`border-t hover:bg-muted/30 ${selectedIds.has(journal.id) ? 'bg-primary/5' : ''}`}
                          >
                            <td className="p-3 text-muted-foreground text-xs">
                              {(page - 1) * PAGE_SIZE + index + 1}
                            </td>
                            <td className="p-3">
                              <Checkbox
                                checked={selectedIds.has(journal.id)}
                                onCheckedChange={() => toggleSelect(journal.id)}
                                disabled={enriching}
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-medium line-clamp-1 text-xs">{journal.title}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-xs text-muted-foreground">
                                {journal.issn_print || journal.issn_electronic || '-'}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <StatusIcon value={journal.openalex_id} />
                            </td>
                            <td className="p-3 text-center">
                              <StatusIcon value={journal.crossref_updated_at} />
                            </td>
                            <td className="p-3 text-center">
                              <StatusIcon value={journal.doaj_updated_at} />
                            </td>
                            <td className="p-3 text-center">
                              <StatusIcon value={journal.wikipedia_checked_at} />
                            </td>
                            <td className="p-3 text-xs">
                              {journal.last_enriched_at ? (
                                <span className="text-muted-foreground">
                                  {formatDate(journal.last_enriched_at)}
                                </span>
                              ) : (
                                <span className="text-orange-500">Nigdy</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Strona {page} z {totalPages} ({PAGE_SIZE} na stronę)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Poprzednia
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Następna
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
