import { useState, useEffect, useMemo } from "react";
import { Search, Filter, X, MapPin, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { WykazFilters } from "@/lib/wykazApi";
import { cn } from "@/lib/utils";

interface WykazFiltersProps {
  filters: WykazFilters;
  onFiltersChange: (filters: WykazFilters) => void;
}

const TOP_COUNTRIES = [
  { code: 'PL', name: 'Polska', flag: '🇵🇱' },
  { code: 'GB', name: 'Wielka Brytania', flag: '🇬🇧' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'DE', name: 'Niemcy', flag: '🇩🇪' },
  { code: 'NL', name: 'Holandia', flag: '🇳🇱' },
  { code: 'CH', name: 'Szwajcaria', flag: '🇨🇭' },
];

const OA_STATUS_OPTIONS = [
  { value: 'gold', label: 'Gold Open Access', description: 'Pełny otwarty dostęp' },
  { value: 'hybrid', label: 'Open Access / Hybrid', description: 'Model mieszany' },
  { value: 'bronze', label: 'Open Access / Bronze', description: 'Bezpłatny dostęp bez jasnej licencji' },
  { value: 'closed', label: 'Brak Open Access', description: 'Dostęp zamknięty/subskrypcyjny' },
];

const POINT_PRESETS = [
  { label: '200 pkt', min: 200 },
  { label: '140+', min: 140 },
  { label: '100+', min: 100 },
  { label: '70+', min: 70 },
];

export function WykazFiltersModern({ filters, onFiltersChange }: WykazFiltersProps) {
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const selectedDisciplines = filters.disciplines?.length
    ? filters.disciplines
    : (filters.discipline ? [filters.discipline] : []);
  const selectedCountries = filters.country_codes || [];
  const selectedOAStatuses = filters.oa_statuses || [];
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    const fetchDisciplines = async () => {
      const { data } = await supabase
        .from('journal_rankings')
        .select('disciplines')
        .not('disciplines', 'is', null)
        .limit(2500);

      if (data) {
        const allDisciplines = new Set<string>();
        data.forEach(row => {
          if (Array.isArray(row.disciplines)) {
            row.disciplines.forEach((d) => {
              if (typeof d === 'string' && d.trim()) allDisciplines.add(d.trim());
            });
          }
        });
        setDisciplines(Array.from(allDisciplines).sort((a, b) => a.localeCompare(b, 'pl')));
      }
    };
    fetchDisciplines();
  }, []);

  const updateFilter = (key: keyof WykazFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const updateDisciplines = (updated: string[]) => {
    onFiltersChange({
      ...filters,
      disciplines: updated.length ? updated : undefined,
      discipline: updated[0],
    });
  };

  const toggleDiscipline = (disc: string) => {
    const updated = selectedDisciplines.includes(disc)
      ? selectedDisciplines.filter(d => d !== disc)
      : [...selectedDisciplines, disc];
    updateDisciplines(updated);
  };

  const toggleCountry = (code: string) => {
    const updated = selectedCountries.includes(code)
      ? selectedCountries.filter(c => c !== code)
      : [...selectedCountries, code];
    updateFilter('country_codes', updated.length > 0 ? updated : undefined);
  };

  const toggleOAStatus = (status: string) => {
    const updated = selectedOAStatuses.includes(status)
      ? selectedOAStatuses.filter(s => s !== status)
      : [...selectedOAStatuses, status];
    updateFilter('oa_statuses', updated.length > 0 ? updated : undefined);
  };

  const setPointPreset = (min: number) => {
    onFiltersChange({ ...filters, minPoints: min, maxPoints: undefined });
  };

  const clearFilters = () => {
    onFiltersChange({ q: filters.q });
  };

  const activeFiltersCount =
    (filters.minPoints !== undefined ? 1 : 0) +
    (filters.maxPoints !== undefined && filters.maxPoints !== 200 ? 1 : 0) +
    (selectedDisciplines.length > 0 ? selectedDisciplines.length : 0) +
    (selectedOAStatuses.length > 0 ? selectedOAStatuses.length : 0) +
    (selectedCountries.length > 0 ? selectedCountries.length : 0) +
    (filters.apc_range ? 1 : 0) +
    (filters.erih_plus ? 1 : 0) +
    (filters.has_doaj ? 1 : 0);

  const selectedDisciplineLabel = useMemo(() => {
    if (selectedDisciplines.length === 0) return 'Wszystkie dyscypliny';
    if (selectedDisciplines.length === 1) return selectedDisciplines[0];
    return `Wybrano dyscyplin: ${selectedDisciplines.length}`;
  }, [selectedDisciplines]);

  return (
    <div className="sticky top-0 z-40 bg-background border-b border-border/50 shadow-sm">
      <div className="container max-w-7xl mx-auto px-4 py-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Wyszukaj po tytule lub ISSN..."
              value={filters.q || ''}
              onChange={(e) => updateFilter('q', e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <Popover open={disciplineOpen} onOpenChange={setDisciplineOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="hidden h-11 max-w-[260px] justify-between gap-2 md:inline-flex">
                <span className="truncate">{selectedDisciplineLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Filtruj dyscypliny..." />
                <CommandList className="max-h-[360px] overflow-y-auto">
                  <CommandEmpty>Brak dyscypliny.</CommandEmpty>
                  <CommandGroup heading="Dyscypliny">
                    {disciplines.map((disc) => (
                      <CommandItem
                        key={disc}
                        value={disc}
                        onSelect={() => toggleDiscipline(disc)}
                        className="flex cursor-pointer items-start gap-2"
                      >
                        <Checkbox checked={selectedDisciplines.includes(disc)} className="mt-0.5" />
                        <span className="text-sm leading-snug">{disc}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={cn("h-11 w-11 relative", isAdvancedOpen && "bg-primary/10")}
          >
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Wyczyść
            </Button>
          )}
        </div>

        {selectedDisciplines.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedDisciplines.map((disc) => (
              <button
                key={disc}
                type="button"
                onClick={() => toggleDiscipline(disc)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15"
              >
                {disc}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {isAdvancedOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-card/50 rounded-xl border border-border/50">
            <div className="space-y-3">
              <label className="text-sm font-medium">Punkty MEiN</label>
              <div className="flex flex-wrap gap-2">
                {POINT_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant={filters.minPoints === preset.min && filters.maxPoints === undefined ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPointPreset(preset.min)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input type="number" placeholder="Min" value={filters.minPoints || ''} onChange={(e) => updateFilter('minPoints', e.target.value ? parseInt(e.target.value) : undefined)} />
                <Input type="number" placeholder="Max" value={filters.maxPoints || ''} onChange={(e) => updateFilter('maxPoints', e.target.value ? parseInt(e.target.value) : undefined)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Kategorie / dyscypliny</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="truncate">{selectedDisciplineLabel}</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0">
                  <Command>
                    <CommandInput placeholder="Filtruj dyscypliny..." />
                    <CommandList className="max-h-[360px] overflow-y-auto">
                      <CommandEmpty>Brak dyscypliny.</CommandEmpty>
                      <CommandGroup>
                        {disciplines.map(d => (
                          <CommandItem key={d} value={d} onSelect={() => toggleDiscipline(d)} className="flex cursor-pointer items-start gap-2">
                            <Checkbox checked={selectedDisciplines.includes(d)} className="mt-0.5" />
                            <span className="text-sm leading-snug">{d}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Możesz zaznaczyć jedną lub wiele dyscyplin bez wpisywania hasła w główną wyszukiwarkę.</p>
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-sm font-medium">Open Access</label>
              <div className="flex flex-wrap gap-2">
                {OA_STATUS_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      selectedOAStatuses.includes(opt.value)
                        ? "bg-primary/10 border-primary"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox checked={selectedOAStatuses.includes(opt.value)} onCheckedChange={() => toggleOAStatus(opt.value)} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" />Kraj</label>
              <Popover open={countrySearchOpen} onOpenChange={setCountrySearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedCountries.length > 0 ? `Wybrano: ${selectedCountries.length}` : 'Wszystkie kraje'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0">
                  <Command>
                    <CommandInput placeholder="Szukaj kraju..." />
                    <CommandList>
                      <CommandEmpty>Nie znaleziono kraju.</CommandEmpty>
                      <CommandGroup>
                        {TOP_COUNTRIES.map(c => (
                          <CommandItem key={c.code} onSelect={() => toggleCountry(c.code)} className="flex items-center gap-2">
                            <Checkbox checked={selectedCountries.includes(c.code)} />
                            <span>{c.flag} {c.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3 md:col-span-3">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={filters.erih_plus || false} onCheckedChange={(c) => updateFilter('erih_plus', c || undefined)} />
                  <span className="text-sm">ERIH PLUS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={filters.has_doaj || false} onCheckedChange={(c) => updateFilter('has_doaj', c || undefined)} />
                  <span className="text-sm">W DOAJ</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
