import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { WykazFiltersModern } from "@/components/wykaz/WykazFiltersModern";
import { WykazTableModern } from "@/components/wykaz/WykazTableModern";
import { WykazDetails } from "@/components/wykaz/WykazDetails";
import { useWykazData } from "@/hooks/useWykazData";
import { Journal, exportToCSV, WykazFilters as Filters } from "@/lib/wykazApi";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, AlertCircle, RefreshCw } from "lucide-react";

export default function WykazEmbed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sortBy] = useState<'points'>('points');
  const [sortOrder] = useState<'desc'>('desc');

  const filters: Filters = {
    q: searchParams.get('q') || undefined,
    minPoints: searchParams.get('minPoints') ? parseInt(searchParams.get('minPoints')!) : undefined,
    maxPoints: searchParams.get('maxPoints') ? parseInt(searchParams.get('maxPoints')!) : undefined,
    discipline: searchParams.get('discipline') || undefined,
  };

  const { data, isLoading, error, hasMore, retry } = useWykazData(filters);

  const handleFiltersChange = (newFilters: Filters) => {
    const params = new URLSearchParams();
    if (newFilters.q) params.set('q', newFilters.q);
    if (newFilters.minPoints !== undefined) params.set('minPoints', newFilters.minPoints.toString());
    if (newFilters.maxPoints !== undefined) params.set('maxPoints', newFilters.maxPoints.toString());
    if (newFilters.discipline) params.set('discipline', newFilters.discipline);
    setSearchParams(params);
  };

  const handleRowClick = (journal: Journal) => {
    setSelectedJournal(journal);
    setDetailsOpen(true);
  };

  const handleExport = () => {
    exportToCSV(data);
  };

  return (
    <div className="min-h-[1200px] w-full max-w-[1200px] mx-auto p-4">
      <WykazFiltersModern filters={filters} onFiltersChange={handleFiltersChange} />

      <div className="mt-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Nie udało się pobrać danych. Spróbuj ponownie.</span>
              <Button variant="outline" size="sm" onClick={retry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Ponów
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {hasMore && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Wyświetlono 200 wyników. Zawęź filtry, aby zobaczyć dokładniejsze rezultaty.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            {isLoading ? 'Wczytywanie...' : `Znaleziono ${data.length} pozycji`}
          </p>
          <Button 
            onClick={handleExport} 
            disabled={data.length === 0 || isLoading}
            variant="outline"
            className="gap-2"
          >
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
          onSort={() => {}}
        />
      </div>

      <WykazDetails 
        journal={selectedJournal}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
