import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Journal, fetchJournalHistory } from "@/lib/wykazApi";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea } from "recharts";
import { TrendingUp, TrendingDown, Info, Award, BarChart3, CheckCircle2, Globe, Building2, ExternalLink, Quote, RefreshCw, Zap, Copy, Share2, Download, BookOpen, FileText, Shield, Archive, Clock, Coins, AlertCircle, Database, Microscope, Unlock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldWithSource } from "@/components/ui/field-with-source";
import { WikipediaSection } from "./WikipediaSection";
interface WykazDetailsProps {
  journal: Journal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => Promise<void>;
  isEnriching?: boolean;
}
export function WykazDetails({
  journal,
  open,
  onOpenChange,
  onRefresh,
  isEnriching = false
}: WykazDetailsProps) {
  const [history, setHistory] = useState<Journal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isUniversalEnriching, setIsUniversalEnriching] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const wasEnrichingRef = useRef(false);

  // Show toast and badge when enrichment completes
  useEffect(() => {
    if (wasEnrichingRef.current && !isEnriching) {
      toast.success("Dane zostały zaktualizowane", {
        icon: <Check className="h-4 w-4" />,
        duration: 3000,
      });
      setJustUpdated(true);
      // Auto-hide badge after 5 seconds
      const timer = setTimeout(() => setJustUpdated(false), 5000);
      return () => clearTimeout(timer);
    }
    wasEnrichingRef.current = isEnriching;
  }, [isEnriching]);

  // Reset justUpdated when sidebar closes
  useEffect(() => {
    if (!open) setJustUpdated(false);
  }, [open]);

  useEffect(() => {
    if (journal && open) {
      const issn = journal.issn_print || journal.issn_electronic;
      if (issn) {
        setLoadingHistory(true);
        fetchJournalHistory(issn).then(setHistory).catch(() => setHistory([])).finally(() => setLoadingHistory(false));
      }
    }
  }, [journal, open]);
  const handleUniversalEnrich = async () => {
    if (!journal) return;
    try {
      setIsUniversalEnriching(true);
      toast.info("Wzbogacanie ze wszystkich źródeł (OpenAlex, Crossref, DOAJ)...");
      const preferredId = journal.journal_id || journal.issn_print || journal.issn_electronic;
      const {
        data,
        error
      } = await supabase.functions.invoke('enrich-journal-all', {
        body: {
          journalId: preferredId
        }
      });
      if (error) {
        console.error('Universal enrichment error:', error);
        toast.error("Błąd podczas wzbogacania danych");
        return;
      }
      if (data.success) {
        toast.success("✅ Dane zaktualizowane ze wszystkich źródeł!");
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        toast.warning(`⚠️ ${data.message}`);
      }
    } catch (error) {
      console.error('Error in universal enrichment:', error);
      toast.error("Wystąpił błąd podczas wzbogacania");
    } finally {
      setIsUniversalEnriching(false);
    }
  };
  const handleCopyLink = () => {
    const url = `${window.location.origin}/wykaz?q=${encodeURIComponent(journal?.title || '')}&published_date=${journal?.published_date}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany do schowka!");
  };
  const handleExport = () => {
    if (!journal) return;
    const data = JSON.stringify(journal, null, 2);
    const blob = new Blob([data], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${journal.id}.json`;
    a.click();
    toast.success("Dane wyeksportowane!");
  };
  const issn = journal?.issn_print || journal?.issn_electronic;
  const disciplines = journal?.disciplines || (journal?.discipline ? [journal.discipline] : []);

  // History is already sorted DESC (newest first) from API
  // For chart, reverse to show oldest → newest (left to right)
  const reversedHistory = history.length > 0 ? [...history].reverse() : [];

  // Create yearly aggregation for cleaner chart (2019 to current year)
  const currentYear = new Date().getFullYear();
  const yearlyData = [];
  for (let year = 2019; year <= currentYear; year++) {
    // Find the most recent wykaz that was active in this year
    // (published on or before Dec 31 of this year)
    const activeWykaz = reversedHistory.filter(h => {
      const wykazYear = new Date(h.published_date).getFullYear();
      return wykazYear <= year;
    }).slice(-1)[0]; // Get the last one (most recent)

    const wykazPublicationYear = activeWykaz ? new Date(activeWykaz.published_date).getFullYear() : null;
    yearlyData.push({
      year: year.toString(),
      points: activeWykaz?.points || 0,
      wykaz_identifier: activeWykaz?.wykaz_identifier || '',
      disciplines: activeWykaz?.disciplines || [],
      published_date: activeWykaz?.published_date,
      wykaz_source_url: activeWykaz?.wykaz_source_url,
      isWykazYear: wykazPublicationYear === year // Mark the year when wykaz was published
    });
  }

  // Calculate trend: current (history[0]) - oldest (history[last])
  const trend = history.length > 1 ? history[0].points - history[history.length - 1].points : 0;

  // Section class with update animation
  const sectionClass = cn(
    "bg-card/50 rounded-xl p-6 space-y-4 border border-border/30 transition-all duration-500",
    justUpdated && "animate-fade-in ring-2 ring-green-500/20"
  );

  return <TooltipProvider>
      <Sheet open={open} onOpenChange={(isOpen) => {
        // Don't close during enrichment
        if (!isOpen && isEnriching) return;
        onOpenChange(isOpen);
      }}>
        <SheetContent className="!w-full !max-w-3xl sm:!max-w-3xl overflow-y-auto">
          <div className="relative h-full">
            {!journal ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-muted-foreground">Ładowanie...</span>
                </div>
              </div>
            ) : <>
          <SheetHeader className="space-y-4 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <SheetTitle className="text-2xl leading-tight transition-all duration-300">{journal.title}</SheetTitle>
                {/* Status indicator */}
                <div className="flex items-center gap-2 mt-2 min-h-[24px]">
                  {isEnriching ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span className="animate-pulse">Aktualizowanie danych w tle...</span>
                    </div>
                  ) : justUpdated ? (
                    <Badge className="gap-1 bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 animate-fade-in">
                      <Check className="h-3 w-3" />
                      Zaktualizowano — dane aktualne
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleUniversalEnrich} disabled={isUniversalEnriching} size="sm" variant="outline">
                      {isUniversalEnriching ? <Zap className="h-3 w-3 animate-pulse" /> : <Zap className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Szybkie wzbogacanie (wszystkie źródła: OpenAlex, Crossref, DOAJ)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleCopyLink} size="sm" variant="outline">
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Udostępnij link do czasopisma</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleExport} size="sm" variant="outline">
                      <Download className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Eksportuj dane do JSON</TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            {/* Data Source Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              {journal.points && <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1 cursor-help">
                      <Building2 className="h-3 w-3" />
                      MEiN {journal.year_identifier}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Indeksowane w wykazie MEiN {journal.year_identifier} ({journal.points} pkt)
                  </TooltipContent>
                </Tooltip>}
              
              {journal.openalex_id && <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1 cursor-help bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20">
                      <Microscope className="h-3 w-3" />
                      OpenAlex
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Wzbogacone danymi OpenAlex (H-index: {journal.h_index}, IF: {journal.if_proxy?.toFixed(2)})
                  </TooltipContent>
                </Tooltip>}
              
              {journal.crossref_updated_at && <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1 cursor-help bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20">
                      <BookOpen className="h-3 w-3" />
                      Crossref
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Zindeksowane w Crossref ({journal.crossref_total_dois || 0} DOI)
                  </TooltipContent>
                </Tooltip>}
              
              {journal.is_in_doaj && <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1 cursor-help bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20">
                      <Unlock className="h-3 w-3" />
                      DOAJ {journal.doaj_seal && '🏆'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Zarejestrowane w DOAJ (Open Access){journal.doaj_seal && ' - posiada DOAJ Seal'}
                  </TooltipContent>
                </Tooltip>}
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* 1. Basic Info - All ISSNs + Disciplines */}
            <div className={cn("space-y-4 transition-all duration-500", justUpdated && "animate-fade-in")}>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  IDENTYFIKATORY
                </h3>
                <div className="flex flex-wrap gap-2">
                  {journal.issn_l && <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="font-mono">
                          ISSN-L: {journal.issn_l}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Linking ISSN - unikalny identyfikator łączący wszystkie wersje czasopisma</TooltipContent>
                    </Tooltip>}
                  {journal.issn_print && <Badge variant="outline" className="font-mono">
                      Print: {journal.issn_print}
                    </Badge>}
                  {journal.issn_electronic && <Badge variant="outline" className="font-mono">
                      Electronic: {journal.issn_electronic}
                    </Badge>}
                  {journal.issn_print_2 && <Badge variant="outline" className="font-mono text-xs">
                      Print 2: {journal.issn_print_2}
                    </Badge>}
                  {journal.issn_electronic_2 && <Badge variant="outline" className="font-mono text-xs">
                      Electronic 2: {journal.issn_electronic_2}
                    </Badge>}
                </div>
                {issn && <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="ghost" onClick={() => window.open(`https://search.crossref.org/?q=${issn}`, '_blank')} className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Crossref
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(`https://www.worldcat.org/search?q=n2:${issn}`, '_blank')} className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      WorldCat
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(`https://portal.issn.org/resource/ISSN/${issn}`, '_blank')} className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      ISSN Portal
                    </Button>
                  </div>}
              </div>

              {disciplines.length > 0 && <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    DYSCYPLINY NAUKOWE
                  </h3>
                  <FieldWithSource label="Dyscypliny" value={<div className="flex flex-wrap gap-2">
                        {(Array.isArray(disciplines) ? disciplines : [disciplines]).map((disc: string, idx: number) => <Badge key={idx} variant="secondary" className="text-sm">
                            {disc}
                            {journal.discipline_codes?.[idx] && <span className="ml-1.5 text-xs opacity-70">({journal.discipline_codes[idx]})</span>}
                          </Badge>)}
                      </div>} source="mein_wykaz" updatedAt={journal.published_date} meinLink={journal.wykaz_source_url} />
                </div>}
            </div>

{/* 2. Current MEiN Points */}
            <div className={cn(
              "relative overflow-hidden rounded-2xl p-6 border transition-all duration-500",
              journal.in_current_wykaz 
                ? "bg-gradient-to-br from-primary/10 via-background to-accent/10 border-border/50" 
                : "bg-gradient-to-br from-amber-500/10 via-background to-orange-500/10 border-amber-500/30",
              justUpdated && "animate-fade-in ring-2 ring-green-500/20"
            )}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm text-muted-foreground cursor-help">
                          Punkty MEiN {journal.year_identifier || journal.year || '2024'}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {journal.in_current_wykaz 
                          ? 'Punktacja MEiN dla publikacji w tym czasopiśmie'
                          : 'Czasopismo nieujęte w aktualnym wykazie MEiN'}
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-3 mt-1">
                      <Award className={cn("h-6 w-6", journal.in_current_wykaz ? "text-primary" : "text-amber-500")} />
                      {journal.in_current_wykaz ? (
                        <>
                          <span className="text-4xl font-bold">{journal.points}</span>
                          <span className="text-muted-foreground text-sm">/ 200</span>
                        </>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            Brak w wykazie
                          </span>
                          <span className="text-sm text-muted-foreground">(5 pkt)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {journal.in_current_wykaz ? (
                      <Badge variant="secondary" className="text-base px-4 py-2">
                        {journal.points >= 140 ? 'Top tier' : journal.points >= 70 ? 'Średni' : 'Niski'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-base px-4 py-2 border-amber-500/50 text-amber-600 dark:text-amber-400">
                        Spoza wykazu
                      </Badge>
                    )}
                    {journal.in_current_wykaz && trend !== 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={trend > 0 ? "default" : "destructive"} className="gap-1">
                            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {trend > 0 ? 'Rosnący' : 'Spadający'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Trend punktacji w stosunku do poprzednich lat</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                
                {/* Okres obowiązywania wykazu - tylko jeśli jest w wykazie */}
                {journal.in_current_wykaz && journal.wykaz_valid_from && (
                  <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      Okres obowiązywania punktów
                    </div>
                    <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                      <div>
                        <strong>Od:</strong> {format(parseISO(journal.wykaz_valid_from), 'dd MMMM yyyy', { locale: pl })}
                      </div>
                      {journal.wykaz_valid_to ? (
                        <div>
                          <strong>Do:</strong> {format(parseISO(journal.wykaz_valid_to), 'dd MMMM yyyy', { locale: pl })}
                        </div>
                      ) : (
                        <div><strong>Do:</strong> obecnie (aktualny wykaz)</div>
                      )}
                      {journal.wykaz_identifier && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                          Wykaz: {journal.wykaz_identifier} {journal.wykaz_version && `(wersja ${journal.wykaz_version})`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Info box dla czasopism spoza wykazu */}
                {!journal.in_current_wykaz && (
                  <div className="mt-4 p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                    <div className="text-sm font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Informacja
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      To czasopismo nie znajduje się w aktualnym wykazie MEiN ({journal.year_identifier || '2024'}). 
                      Zgodnie z rozporządzeniem, publikacja w czasopiśmie nieujętym w wykazie ministerialnym jest wyceniana na <strong>5 punktów</strong>.
                    </p>
                    {history.length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/50">
                        Ostatnia punktacja: <strong>{history[0].points} pkt</strong> w wykazie {history[0].year_identifier}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

{/* 3. Publisher Information */}
            {(journal.publisher || journal.country || journal.host_organization || journal.medium || journal.journal_url) && <div className={sectionClass}>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informacje o wydawcy
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {journal.publisher && <div>
                      <FieldWithSource label="Wydawca" value={journal.journal_url ? <a href={journal.journal_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline flex items-center gap-1">
                              {journal.publisher}
                              <ExternalLink className="h-3 w-3" />
                            </a> : journal.publisher} source={journal.crossref_updated_at ? 'crossref' : 'openalex'} updatedAt={journal.crossref_updated_at || journal.openalex_updated_at} />
                    </div>}

                  {(journal.country || journal.country_code) && <div>
                      <FieldWithSource label="Kraj wydawcy" value={<div className="flex items-center gap-2">
                            {journal.country_code && <span className="text-2xl">
                                {String.fromCodePoint(...journal.country_code.split('').map(c => 127397 + c.charCodeAt(0)))}
                              </span>}
                            {journal.country || journal.country_code}
                          </div>} source={journal.crossref_updated_at ? 'crossref' : 'openalex'} updatedAt={journal.crossref_updated_at || journal.openalex_updated_at} />
                    </div>}

                  {journal.host_organization && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Organizacja hostująca</div>
                          <div className="font-semibold">{journal.host_organization}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Organizacja hostująca czasopismo w OpenAlex</TooltipContent>
                    </Tooltip>}

                   {journal.medium && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Nośnik</div>
                          <Badge variant="outline">{journal.medium}</Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Główny nośnik publikacji (print/electronic/online)</TooltipContent>
                    </Tooltip>}
                </div>

                {/* Języki (Crossref lub DOAJ) */}
                {(journal.crossref_languages?.length > 0 || journal.doaj_languages?.length > 0) && <FieldWithSource label="Języki publikacji" value={(journal.crossref_languages || journal.doaj_languages).join(', ')} source={journal.crossref_languages ? 'crossref' : 'doaj'} updatedAt={journal.crossref_languages ? journal.crossref_updated_at : journal.doaj_updated_at} />}

                {/* Tematy/Słowa kluczowe (zintegrowane Crossref + DOAJ) */}
                {(journal.crossref_subjects?.length > 0 || journal.doaj_keywords?.length > 0) && <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Tematy i słowa kluczowe</span>
                    <div className="flex flex-wrap gap-2">
                      {journal.crossref_subjects?.map((subj: any, i: number) => <Tooltip key={`cs-${i}`}>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="cursor-help">
                              {subj.name || subj}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Źródło: Crossref</TooltipContent>
                        </Tooltip>)}
                      {journal.doaj_keywords?.map((kw: string, i: number) => <Tooltip key={`dk-${i}`}>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="cursor-help">
                              {kw}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Źródło: DOAJ</TooltipContent>
                        </Tooltip>)}
                    </div>
                  </div>}

                {journal.journal_url && <Button variant="outline" className="w-full justify-center gap-2" onClick={() => window.open(journal.journal_url, '_blank')}>
                    <Globe className="h-4 w-4" />
                    Odwiedź stronę czasopisma
                  </Button>}
              </div>}

{/* 4. Open Access & Publishing Info */}
            {(journal.oa_status || journal.license || journal.apc_amount !== null || journal.avg_time_to_publish_days) && <div className={sectionClass}>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-yellow-500" />
                  Open Access & Publikacja
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {journal.oa_status && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Status OA</div>
                          <Badge className={cn(journal.oa_status === 'gold' ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" : journal.oa_status === 'green' ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-700 dark:text-gray-400")}>
                            {journal.oa_status.toUpperCase()}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Typ dostępności: Gold (pełny OA), Green (self-archiving), Hybrid, Closed
                      </TooltipContent>
                    </Tooltip>}
                  
                  {journal.license && <div>
                      <div className="text-sm text-muted-foreground mb-1">Licencja</div>
                      <div className="font-medium text-sm">{journal.license}</div>
                    </div>}
                  
                  {journal.apc_amount !== null && journal.apc_amount !== undefined && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            APC
                          </div>
                          <div className="font-medium">
                            {journal.apc_amount === 0 ? <Badge variant="secondary">Brak opłat</Badge> : `${journal.apc_amount} ${journal.apc_currency || 'EUR'}`}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Article Processing Charge - opłata za publikację artykułu</TooltipContent>
                    </Tooltip>}

                  {journal.avg_time_to_publish_days && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Czas do publikacji
                          </div>
                          <div className="font-medium">{journal.avg_time_to_publish_days} dni</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Średni czas od zgłoszenia do publikacji</TooltipContent>
                    </Tooltip>}

                  {journal.oa_rate !== null && journal.oa_rate !== undefined && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">% OA</div>
                          <div className="font-medium">{(journal.oa_rate * 100).toFixed(1)}%</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Odsetek publikacji dostępnych w Open Access</TooltipContent>
                    </Tooltip>}

                  {/* DOAJ Publication Time */}
                  {journal.doaj_publication_time_weeks && <FieldWithSource label="Czas publikacji" value={`${journal.doaj_publication_time_weeks} tygodni`} source="doaj" updatedAt={journal.doaj_updated_at} />}
                </div>

                {/* DOAJ Review Process & Plagiarism */}
                {(journal.doaj_review_process || journal.doaj_plagiarism_check !== null) && <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    {journal.doaj_review_process && <FieldWithSource label="Proces recenzji" value={journal.doaj_review_process} source="doaj" updatedAt={journal.doaj_updated_at} />}
                    {journal.doaj_plagiarism_check !== null && <FieldWithSource label="Kontrola plagiatu" value={<Badge variant={journal.doaj_plagiarism_check ? "default" : "secondary"}>
                            {journal.doaj_plagiarism_check ? "✓ Tak" : "✗ Nie"}
                          </Badge>} source="doaj" updatedAt={journal.doaj_updated_at} />}
                  </div>}

                {/* DOAJ Links */}
                {(journal.doaj_editorial_board_url || journal.doaj_author_instructions_url) && <div className="flex gap-2 pt-2">
                    {journal.doaj_editorial_board_url && <Button size="sm" variant="ghost" onClick={() => window.open(journal.doaj_editorial_board_url!, '_blank')} className="text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Rada Redakcyjna
                      </Button>}
                    {journal.doaj_author_instructions_url && <Button size="sm" variant="ghost" onClick={() => window.open(journal.doaj_author_instructions_url!, '_blank')} className="text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Instrukcje dla autorów
                      </Button>}
                  </div>}

                {/* DOAJ Aims & Scope */}
                {journal.doaj_aims_scope && <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-2">Cel i zakres (DOAJ)</div>
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {journal.doaj_aims_scope}
                    </div>
                  </div>}

                {(journal.oa_status === 'gold' || journal.oa_status === 'hybrid') && journal.journal_url && <Button size="sm" variant="ghost" onClick={() => {
              const doajUrl = `https://doaj.org/search/journals?ref=homepage-box&source=%7B%22query%22%3A%7B%22query_string%22%3A%7B%22query%22%3A%22${issn}%22%2C%22default_operator%22%3A%22AND%22%7D%7D%7D`;
              window.open(doajUrl, '_blank');
            }} className="text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Sprawdź w DOAJ
                  </Button>}
              </div>}

{/* 5. Indexing and Quality */}
            {(journal.in_erih_plus || journal.in_road || journal.preservation_status !== null) && <div className={sectionClass}>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Indeksacja i jakość
                </h3>
                
                <div className="flex flex-wrap gap-3">
                  {journal.in_erih_plus && <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="default" className="gap-1.5">
                          <CheckCircle2 className="h-3 w-3" />
                          ERIH PLUS
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        European Reference Index for the Humanities and Social Sciences
                      </TooltipContent>
                    </Tooltip>}

                  {journal.in_road && <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="default" className="gap-1.5">
                          <CheckCircle2 className="h-3 w-3" />
                          ROAD
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Directory of Open Access Scholarly Resources
                      </TooltipContent>
                    </Tooltip>}

                  {journal.preservation_status && <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="gap-1.5">
                          <Archive className="h-3 w-3" />
                          Archiwizacja cyfrowa
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Czasopismo ma zapewnioną archiwizację cyfrową
                      </TooltipContent>
                    </Tooltip>}
                </div>
              </div>}

{/* 6. Archiving Policies (Sherpa Romeo) */}
            {(journal.preprint_allowed !== null || journal.postprint_allowed !== null || journal.publisher_pdf_allowed !== null || journal.embargo_months !== null) && <div className={sectionClass}>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Quote className="h-5 w-5" />
                  Polityki archiwizacji
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {journal.preprint_allowed !== null && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Preprint</div>
                          <Badge variant={journal.preprint_allowed ? "default" : "secondary"}>
                            {journal.preprint_allowed ? '✓ Dozwolony' : '✗ Niedozwolony'}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Możliwość archiwizacji wersji pre-publikacyjnej</TooltipContent>
                    </Tooltip>}
                  
                  {journal.postprint_allowed !== null && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Postprint</div>
                          <Badge variant={journal.postprint_allowed ? "default" : "secondary"}>
                            {journal.postprint_allowed ? '✓ Dozwolony' : '✗ Niedozwolony'}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Możliwość archiwizacji wersji post-publikacyjnej</TooltipContent>
                    </Tooltip>}

                  {journal.publisher_pdf_allowed !== null && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">PDF wydawcy</div>
                          <Badge variant={journal.publisher_pdf_allowed ? "default" : "secondary"}>
                            {journal.publisher_pdf_allowed ? '✓ Dozwolony' : '✗ Niedozwolony'}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Możliwość archiwizacji finalnego PDF od wydawcy</TooltipContent>
                    </Tooltip>}
                  
                  {journal.embargo_months !== null && <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Embargo</div>
                          <div className="font-medium">{journal.embargo_months} mies.</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Okres ograniczenia dostępu po publikacji</TooltipContent>
                    </Tooltip>}
                </div>

                {issn && <Button size="sm" variant="ghost" onClick={() => window.open(`https://v2.sherpa.ac.uk/id/publication/issn/${issn}`, '_blank')} className="text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Zobacz w Sherpa Romeo
                  </Button>}
              </div>}

{/* 7. Grant Compliance */}
            {(journal.oa_status === 'gold' || journal.postprint_allowed) && <div className={sectionClass}>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Zgodność z wymogami grantowymi
                </h3>
                
                {journal.oa_status === 'gold' && journal.license?.includes('CC BY') && <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Zgodne z Plan S</div>
                      <div className="text-sm text-muted-foreground">
                        Czasopismo oferuje Gold Open Access z licencją CC BY, spełniając wymogi Plan S.
                      </div>
                    </div>
                  </div>}
                
                {journal.postprint_allowed && journal.embargo_months !== undefined && journal.embargo_months <= 12 && <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <Info className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Częściowo zgodne</div>
                      <div className="text-sm text-muted-foreground">
                        Dozwolona archiwizacja Green z embargo ≤ 12 miesięcy.
                      </div>
                    </div>
                  </div>}
              </div>}

            {/* Wikipedia Section */}
            <WikipediaSection journal={journal} />

{/* 8. Bibliometric Metrics - EXPANDED */}
            {(journal.if_proxy || journal.h_index || journal.cited_by_count || journal.works_count || journal.papers_5y || journal.avg_citations_per_paper || journal.composite_score) && <div className={cn("space-y-4 transition-all duration-500", justUpdated && "animate-fade-in")}>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Metryki bibliometryczne</h3>
                  {journal.openalex_id && <Button size="sm" variant="ghost" onClick={() => window.open(journal.openalex_id, '_blank')} className="text-xs ml-auto">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      OpenAlex
                    </Button>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* OpenAlex Metrics */}
                  {journal.if_proxy !== null && journal.if_proxy !== undefined && <MetricCard label="IF proxy" value={journal.if_proxy.toFixed(2)} icon={<TrendingUp className="h-4 w-4" />} source={journal.data_provenance?.if_proxy?.source || 'openalex'} updatedAt={journal.data_provenance?.if_proxy?.updated_at || journal.openalex_updated_at} method={journal.data_provenance?.if_proxy?.method} />}
                  
                  {journal.h_index !== null && journal.h_index !== undefined && <MetricCard label="h-index" value={journal.h_index.toString()} icon={<Award className="h-4 w-4" />} source={journal.data_provenance?.h_index?.source || 'openalex'} updatedAt={journal.data_provenance?.h_index?.updated_at || journal.openalex_updated_at} method={journal.data_provenance?.h_index?.method} />}

                  {journal.i10_index !== null && journal.i10_index !== undefined && <MetricCard label="i10-index" value={journal.i10_index.toString()} icon={<Award className="h-4 w-4" />} source="openalex" updatedAt={journal.openalex_updated_at} />}

                  {journal.cited_by_count !== null && journal.cited_by_count !== undefined && <MetricCard label="Cytowania" value={journal.cited_by_count.toLocaleString()} icon={<Quote className="h-4 w-4" />} source={journal.data_provenance?.cited_by_count?.source || 'openalex'} updatedAt={journal.data_provenance?.cited_by_count?.updated_at || journal.openalex_updated_at} />}

                  {journal.works_count !== null && journal.works_count !== undefined && <MetricCard label="Publikacje" value={journal.works_count.toLocaleString()} icon={<FileText className="h-4 w-4" />} source={journal.data_provenance?.works_count?.source || 'openalex'} updatedAt={journal.data_provenance?.works_count?.updated_at || journal.openalex_updated_at} />}

                  {journal.papers_5y !== null && journal.papers_5y !== undefined && <MetricCard label="Publikacje (5 lat)" value={journal.papers_5y.toLocaleString()} icon={<FileText className="h-4 w-4" />} source={journal.data_provenance?.papers_5y?.source || 'openalex'} updatedAt={journal.data_provenance?.papers_5y?.updated_at || journal.openalex_updated_at} />}

                  {journal.avg_citations_per_paper !== null && journal.avg_citations_per_paper !== undefined && <MetricCard label="Śr. cytowań/artykuł" value={journal.avg_citations_per_paper.toFixed(1)} icon={<BarChart3 className="h-4 w-4" />} source={journal.data_provenance?.avg_citations_per_paper?.source || 'openalex'} updatedAt={journal.data_provenance?.avg_citations_per_paper?.updated_at || journal.openalex_updated_at} />}

                  {journal.oa_rate !== null && journal.oa_rate !== undefined && <MetricCard label="% Open Access" value={`${(journal.oa_rate * 100).toFixed(1)}%`} icon={<Unlock className="h-4 w-4" />} source="openalex" updatedAt={journal.openalex_updated_at} />}

                  {journal.composite_score !== null && journal.composite_score !== undefined && <MetricCard label="Composite Score" value={journal.composite_score.toFixed(2)} icon={<Award className="h-4 w-4" />} source={journal.data_provenance?.composite_score?.source || 'openalex'} updatedAt={journal.data_provenance?.composite_score?.updated_at || journal.openalex_updated_at} />}

                  {/* Crossref Metrics */}
                  {journal.crossref_total_dois !== null && journal.crossref_total_dois !== undefined && <MetricCard label="Total DOIs" value={journal.crossref_total_dois.toLocaleString()} icon={<BookOpen className="h-4 w-4" />} source="crossref" updatedAt={journal.crossref_updated_at} />}

                  {journal.crossref_current_dois !== null && journal.crossref_current_dois !== undefined && <MetricCard label="Current DOIs" value={journal.crossref_current_dois.toLocaleString()} icon={<BookOpen className="h-4 w-4" />} source="crossref" updatedAt={journal.crossref_updated_at} />}

                  {journal.crossref_backfile_dois !== null && journal.crossref_backfile_dois !== undefined && <MetricCard label="Backfile DOIs" value={journal.crossref_backfile_dois.toLocaleString()} icon={<Archive className="h-4 w-4" />} source="crossref" updatedAt={journal.crossref_updated_at} />}
                </div>
              </div>}

{/* Crossref DOI Breakdown Chart */}
            {journal.crossref_breakdowns && typeof journal.crossref_breakdowns === 'object' && Object.keys(journal.crossref_breakdowns).length > 0 && <div className={sectionClass}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-amber-500" />
                    Rozkład DOI po latach
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1 cursor-help">
                        <BookOpen className="h-3 w-3" />
                        Crossref
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Źródło: Crossref{journal.crossref_updated_at && ` (${format(parseISO(journal.crossref_updated_at), 'dd.MM.yyyy', {
                    locale: pl
                  })})`}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(() => {
                const breakdowns = journal.crossref_breakdowns;
                // Handle both old structure {dois-by-issued-year: [[year, count]]} and new {year: count}
                if (breakdowns?.['dois-by-issued-year']) {
                  return breakdowns['dois-by-issued-year'].map(([year, count]: [number, number]) => ({
                    year: year.toString(),
                    count
                  })).sort((a, b) => parseInt(a.year) - parseInt(b.year)).slice(-15);
                }
                return Object.entries(breakdowns || {}).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([year, count]) => ({
                  year,
                  count: count as number
                })).slice(-15);
              })()}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="year" className="text-xs" angle={-45} textAnchor="end" height={60} />
                    <YAxis className="text-xs" />
                    <ChartTooltip contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} labelStyle={{
                  color: 'hsl(var(--foreground))'
                }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {journal.crossref_total_dois && <div className="text-sm text-muted-foreground text-center">
                    Łącznie {journal.crossref_total_dois.toLocaleString()} DOI w Crossref
                  </div>}
              </div>}


{/* 9. Historical chart - IMPROVED */}
            <div className={cn("space-y-4 transition-all duration-500", justUpdated && "animate-fade-in")} style={{
            animationDelay: '100ms'
          }}>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">   Punkty MEiN drzewiej   </h3>
              </div>
              
              {loadingHistory ? <Skeleton className="h-64 w-full rounded-xl" /> : history.length > 1 ? <div className="space-y-4">
                  <div className={cn("bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-all duration-500", justUpdated && "ring-2 ring-green-500/20")}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={yearlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        
                        {/* X-Axis: Simple years (2019, 2020, ..., 2024) */}
                        <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 12,
                      fontWeight: 500
                    }} height={40} />
                        
                        <YAxis domain={[0, 200]} stroke="hsl(var(--muted-foreground))" tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 11
                    }} label={{
                      value: 'Punkty',
                      angle: -90,
                      position: 'insideLeft',
                      style: {
                        fontSize: 12,
                        fill: 'hsl(var(--muted-foreground))'
                      }
                    }} />
                        
                        {/* ReferenceArea: Periods of validity for each wykaz (from date to date) */}
                        {reversedHistory.map((h, idx) => {
                      const startDate = new Date(h.published_date);
                      const startYear = startDate.getFullYear();
                      const nextWykaz = reversedHistory[idx + 1];
                      const endDate = nextWykaz ? new Date(nextWykaz.published_date) : new Date();
                      const endYear = endDate.getFullYear();
                      return <ReferenceArea key={`area-${idx}`} x1={startYear.toString()} x2={endYear.toString()} fill="hsl(var(--primary))" fillOpacity={0.08} stroke="none" />;
                    })}
                        
                        {/* ReferenceLine: Vertical line for wykaz publication with exact dates */}
                        {reversedHistory.map((h, idx) => {
                      const pubDate = new Date(h.published_date);
                      const year = pubDate.getFullYear();
                      const dateStr = format(pubDate, 'dd.MM.yyyy', {
                        locale: pl
                      });
                      return <ReferenceLine key={`line-${idx}`} x={year.toString()} stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="3 3" opacity={0.6} label={{
                        value: `📌 ${dateStr} - ${h.wykaz_identifier}`,
                        position: 'top',
                        fill: 'hsl(var(--primary))',
                        fontSize: 9,
                        fontWeight: 600,
                        offset: 8
                      }} />;
                    })}
                        
                        {/* Interactive Tooltip */}
                        <ChartTooltip content={({
                      active,
                      payload
                    }) => {
                      if (!active || !payload?.[0]) return null;
                      const data = payload[0].payload;
                      return <div className="bg-background/95 backdrop-blur-sm border border-primary/20 rounded-lg p-4 shadow-xl min-w-[220px]">
                                <p className="font-bold text-lg mb-2">Rok {data.year}</p>
                                {data.isWykazYear && <Badge variant="outline" className="mb-3 border-primary">
                                    📌 Nowy wykaz: {data.wykaz_identifier}
                                  </Badge>}
                                <p className="text-sm text-muted-foreground mb-1">
                                  Obowiązujący wykaz: <span className="font-semibold text-foreground">{data.wykaz_identifier}</span>
                                </p>
                                <p className="text-3xl font-bold text-primary mt-2">{data.points} <span className="text-base text-muted-foreground">pkt</span></p>
                                {data.disciplines?.length > 0 && <div className="mt-3 pt-3 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground mb-2">Dyscypliny:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {data.disciplines.map((d: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">
                                          {d}
                                        </Badge>)}
                                    </div>
                                  </div>}
                              </div>;
                    }} />
                        
                        {/* Step chart line with hover effects */}
                        <Line type="stepAfter" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={3} dot={props => {
                      const {
                        cx,
                        cy,
                        payload
                      } = props;
                      const radius = payload.isWykazYear ? 8 : 4;
                      return <circle cx={cx} cy={cy} r={radius} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} className="transition-all duration-200 cursor-pointer hover:r-10" style={{
                        filter: payload.isWykazYear ? 'drop-shadow(0 0 6px hsl(var(--primary)))' : 'none'
                      }} />;
                    }} activeDot={{
                      r: 10,
                      stroke: 'hsl(var(--primary))',
                      strokeWidth: 3,
                      fill: 'hsl(var(--background))'
                    }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* History Table */}
                  <div className="bg-card/50 rounded-xl border border-border/30 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-semibold">Data wykazu</th>
                          <th className="text-left p-3 font-semibold">Rok</th>
                          <th className="text-right p-3 font-semibold">Punkty</th>
                          <th className="text-left p-3 font-semibold">Dyscypliny</th>
                          <th className="text-right p-3 font-semibold">Zmiana</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((h, idx) => {
                      const prevPoints = history[idx + 1]?.points;
                      const change = prevPoints ? h.points - prevPoints : null;

                      // Safe date formatting
                      let dateStr = 'N/A';
                      try {
                        if (h.published_date) {
                          const date = new Date(h.published_date);
                          if (!isNaN(date.getTime())) {
                            dateStr = format(date, 'dd.MM.yyyy');
                          }
                        }
                      } catch (e) {
                        console.error('Invalid date in history:', h.published_date, e);
                      }

                      // Normalize disciplines to array
                      const prevDisciplinesRaw = history[idx + 1]?.disciplines;
                      const currentDisciplinesRaw = h.disciplines;
                      const prevDisciplines = Array.isArray(prevDisciplinesRaw) ? prevDisciplinesRaw : prevDisciplinesRaw ? [prevDisciplinesRaw] : history[idx + 1]?.discipline ? [history[idx + 1].discipline!] : [];
                      const currentDisciplines = Array.isArray(currentDisciplinesRaw) ? currentDisciplinesRaw : currentDisciplinesRaw ? [currentDisciplinesRaw] : h.discipline ? [h.discipline] : [];

                      // Check if disciplines changed
                      const disciplinesChanged = JSON.stringify([...currentDisciplines].sort()) !== JSON.stringify([...prevDisciplines].sort());
                      return <tr key={h.id} className="border-t border-border/30 hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {dateStr}
                                  {h.wykaz_identifier && <Badge variant="outline" className="text-xs">
                                      {h.wykaz_identifier}
                                    </Badge>}
                                </div>
                              </td>
                              <td className="p-3">{h.year}</td>
                              <td className="p-3 text-right font-semibold">{h.points}</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {currentDisciplines.length > 0 ? currentDisciplines.map((d: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">
                                        {d}
                                      </Badge>) : <span className="text-xs text-muted-foreground">Brak danych</span>}
                                  {disciplinesChanged && idx < history.length - 1 && <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:border-amber-600 dark:text-amber-500">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Zmiana
                                    </Badge>}
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                {change !== null && <Badge variant={change > 0 ? "default" : change < 0 ? "destructive" : "secondary"} className="text-xs">
                                    {change > 0 ? `+${change}` : change}
                                  </Badge>}
                              </td>
                            </tr>;
                    })}
                      </tbody>
                    </table>
                  </div>
                </div> : <div className="bg-muted/20 backdrop-blur-sm rounded-xl p-6 text-center text-muted-foreground border border-border/30">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Brak danych historycznych dla tego czasopisma</p>
                </div>}
            </div>


            {/* Technical data sources summary - Detailed version */}
            <div className="mt-8 pt-4 border-t border-border/30">
              <div className="text-[10px] text-muted-foreground space-y-3">
                <div className="font-semibold text-xs mb-3 text-foreground flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Źródła danych i daty aktualizacji:
                </div>
                
                {/* MEiN - Current + Historical */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>MEiN (Ministerstwo Edukacji i Nauki)</span>
                  </div>
                  <div className="pl-5 space-y-1">
                    {/* Current wykaz */}
                    <div className="font-semibold text-foreground">Aktualny wykaz:</div>
                    <div>
                      <span className="font-medium">Dane:</span> Punkty ({journal.points} pkt) i dyscypliny naukowe
                    </div>
                    {journal.wykaz_identifier && <div>
                        <span className="font-medium">Wykaz:</span> {journal.wykaz_identifier}
                      </div>}
                    {journal.published_date && <div>
                        <span className="font-medium">Data publikacji wykazu:</span>{' '}
                        {format(parseISO(journal.published_date), 'dd MMMM yyyy', {
                      locale: pl
                    })}
                      </div>}
                    {journal.wykaz_source_url && <a href={journal.wykaz_source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Oficjalny komunikat MEiN
                      </a>}
                    
                    {/* Historical wykazy */}
                    {history.length > 1 && <div className="mt-3 pt-3 border-t border-border/30">
                        <div className="font-semibold text-foreground mb-2">Wykazy historyczne:</div>
                        {history.slice(1).map((h, idx) => <div key={idx} className="text-xs space-y-0.5 mb-2 pb-2 border-b border-border/20 last:border-0">
                            <div>
                              <span className="font-medium">Wykaz:</span> {h.wykaz_identifier || h.year}
                            </div>
                            <div>
                              <span className="font-medium">Punkty:</span> {h.points} pkt
                            </div>
                            {h.published_date && <div>
                                <span className="font-medium">Data:</span>{' '}
                                {format(parseISO(h.published_date), 'dd.MM.yyyy', {
                          locale: pl
                        })}
                              </div>}
                            {h.wykaz_source_url && <a href={h.wykaz_source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                Zobacz wykaz
                              </a>}
                          </div>)}
                      </div>}
                  </div>
                </div>
                
                {/* OpenAlex */}
                {journal.openalex_updated_at && <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Microscope className="h-3 w-3" />
                      <span>OpenAlex</span>
                    </div>
                    <div className="pl-5 space-y-0.5">
                      <div>
                        <span className="font-medium">Dane:</span> IF proxy, H-index, cytowania, publikacje, metryki bibliometryczne
                      </div>
                      <div>
                        <span className="font-medium">Ostatnia aktualizacja:</span>{' '}
                        {format(parseISO(journal.openalex_updated_at), 'dd.MM.yyyy HH:mm', {
                      locale: pl
                    })}
                      </div>
                      {journal.enrichment_method && <div>
                          <span className="font-medium">Metoda dopasowania:</span> {journal.enrichment_method}
                        </div>}
                      {journal.openalex_id && <a href={journal.openalex_id} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Zobacz w OpenAlex
                        </a>}
                    </div>
                  </div>}
                
                {/* Crossref */}
                {journal.crossref_updated_at && <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <BookOpen className="h-3 w-3" />
                      <span>Crossref</span>
                    </div>
                    <div className="pl-5 space-y-0.5">
                      <div>
                        <span className="font-medium">Dane:</span> Wydawca, kraj, lokalizacja, liczba DOI, tematy, języki
                      </div>
                      <div>
                        <span className="font-medium">Ostatnia aktualizacja:</span>{' '}
                        {format(parseISO(journal.crossref_updated_at), 'dd.MM.yyyy HH:mm', {
                      locale: pl
                    })}
                      </div>
                      {issn && <a href={`https://api.crossref.org/journals/${issn}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Zobacz w Crossref API
                        </a>}
                    </div>
                  </div>}
                
                {/* DOAJ */}
                {(journal.is_in_doaj || journal.doaj_updated_at) && <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Unlock className="h-3 w-3" />
                      <span>DOAJ (Directory of Open Access Journals)</span>
                    </div>
                    <div className="pl-5 space-y-0.5">
                      <div>
                        <span className="font-medium">Dane:</span> Status Open Access, polityki publikacyjne, standardy jakości
                      </div>
                      {journal.doaj_seal && <div className="text-violet-600 dark:text-violet-400">
                          🏆 <span className="font-medium">DOAJ Seal</span> - prestiżowy certyfikat jakości
                        </div>}
                      {journal.doaj_updated_at && <div>
                          <span className="font-medium">Ostatnia aktualizacja:</span>{' '}
                          {format(parseISO(journal.doaj_updated_at), 'dd.MM.yyyy HH:mm', {
                      locale: pl
                    })}
                        </div>}
                      {issn && <a href={`https://doaj.org/search/journals?ref=homepage-box&source=%7B%22query%22%3A%7B%22query_string%22%3A%7B%22query%22%3A%22${issn}%22%7D%7D%7D`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Zobacz w DOAJ
                        </a>}
                    </div>
                  </div>}
              </div>
            </div>

          </div>
          </>}
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>;
}
function MetricCard({
  label,
  value,
  icon,
  source,
  updatedAt,
  method
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  source?: string;
  updatedAt?: string;
  method?: string;
}) {
  const sourceIcons: Record<string, React.ReactNode> = {
    openalex: <Microscope className="h-3 w-3" />,
    crossref: <BookOpen className="h-3 w-3" />,
    mein_wykaz: <Building2 className="h-3 w-3" />,
    doaj: <Unlock className="h-3 w-3" />
  };
  const sourceLabels: Record<string, string> = {
    openalex: "OpenAlex",
    crossref: "Crossref",
    mein_wykaz: "MEiN",
    doaj: "DOAJ"
  };
  const content = <div className="relative overflow-hidden bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 hover:border-primary/50 transition-all duration-300 hover-scale group cursor-help">
      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
          {source && <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1 gap-0.5 opacity-60">
              {sourceIcons[source]}
            </Badge>}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>;
  if (!source) return content;
  return <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <div className="font-semibold flex items-center gap-1">
            {sourceIcons[source]}
            <span>Źródło: {sourceLabels[source]}</span>
          </div>
          {updatedAt && <div className="text-muted-foreground">
              Zaktualizowano: {format(parseISO(updatedAt), 'dd.MM.yyyy HH:mm', {
            locale: pl
          })}
            </div>}
          {method && <div className="text-muted-foreground">
              Metoda: {method}
            </div>}
        </div>
      </TooltipContent>
    </Tooltip>;
}