import { useState, useEffect } from "react";
import { Search, Filter, X, MapPin, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  { value: 'gold', label: 'Gold OA 🌟', description: 'Pełny dostęp otwarty' },
  { value: 'hybrid', label: 'Hybrid 💎', description: 'Częściowy OA' },
  { value: 'bronze', label: 'Bronze 🥉', description: 'Bezpłatny bez licencji' },
  { value: 'closed', label: 'Closed 🔒', description: 'Tylko subskrypcja' },
];

const POINT_VALUES = [0, 20, 40, 80, 100, 140, 200];

export function WykazFiltersModern({ filters, onFiltersChange }: WykazFiltersProps) {
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(filters.country_codes || []);
  const [selectedOAStatuses, setSelectedOAStatuses] = useState<string[]>(filters.oa_statuses || []);
  const [pointsRange, setPointsRange] = useState<[number, number]>([
    filters.minPoints || 0, 
    filters.maxPoints || 200
  ]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Fetch disciplines from journal_rankings
  useEffect(() => {
    const fetchDisciplines = async () => {
      const { data } = await supabase
        .from('journal_rankings')
        .select('disciplines')
        .not('disciplines', 'is', null);
      
      if (data) {
        const allDisciplines = new Set<string>();
        data.forEach(row => {
          if (Array.isArray(row.disciplines)) {
            row.disciplines.forEach(d => allDisciplines.add(d));
          }
        });
        const sorted = Array.from(allDisciplines).sort();
        setDisciplines(sorted);
      }
    };
    fetchDisciplines();
  }, []);

  // Sync selected disciplines from filters
  useEffect(() => {
    if (filters.discipline) {
      setSelectedDisciplines([filters.discipline]);
    } else {
      setSelectedDisciplines([]);
    }
  }, [filters.discipline]);
  
  const updateFilter = (key: keyof WykazFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleDiscipline = (disc: string) => {
    const updated = selectedDisciplines.includes(disc)
      ? selectedDisciplines.filter(d => d !== disc)
      : [...selectedDisciplines, disc];
    setSelectedDisciplines(updated);
    
    // For now, we'll pass the first selected discipline as single value
    // (backend currently supports single discipline, can be extended later)
    updateFilter('discipline', updated.length > 0 ? updated[0] : undefined);
  };

  const toggleCountry = (code: string) => {
    const updated = selectedCountries.includes(code)
      ? selectedCountries.filter(c => c !== code)
      : [...selectedCountries, code];
    setSelectedCountries(updated);
    updateFilter('country_codes', updated.length > 0 ? updated : undefined);
  };

  const toggleOAStatus = (status: string) => {
    const updated = selectedOAStatuses.includes(status)
      ? selectedOAStatuses.filter(s => s !== status)
      : [...selectedOAStatuses, status];
    setSelectedOAStatuses(updated);
    updateFilter('oa_statuses', updated.length > 0 ? updated : undefined);
  };

  const clearFilters = () => {
    setSelectedDisciplines([]);
    setSelectedCountries([]);
    setSelectedOAStatuses([]);
    setPointsRange([0, 200]);
    onFiltersChange({ q: filters.q }); // Keep search query
  };

  const activeFiltersCount = 
    (filters.minPoints !== undefined ? 1 : 0) +
    (filters.maxPoints !== undefined && filters.maxPoints !== 200 ? 1 : 0) +
    (selectedDisciplines.length > 0 ? 1 : 0) +
    (selectedOAStatuses.length > 0 ? 1 : 0) +
    (selectedCountries.length > 0 ? 1 : 0) +
    (filters.apc_range ? 1 : 0) +
    (filters.erih_plus ? 1 : 0) +
    (filters.has_doaj ? 1 : 0);

  return (
    <div className="sticky top-0 z-40 bg-background border-b border-border/50 shadow-sm">
      <div className="container max-w-7xl mx-auto px-4 py-4 space-y-3">
        {/* Search Bar */}
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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} 
            className={cn("h-11 w-11", isAdvancedOpen && "bg-primary/10")}
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

        {isAdvancedOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-card/50 rounded-xl border border-border/50">
              <div className="space-y-2">
                <label className="text-sm font-medium">Punkty MEiN</label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Min" value={filters.minPoints || ''} onChange={(e) => updateFilter('minPoints', e.target.value ? parseInt(e.target.value) : undefined)} />
                  <Input type="number" placeholder="Max" value={filters.maxPoints || ''} onChange={(e) => updateFilter('maxPoints', e.target.value ? parseInt(e.target.value) : undefined)} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Dyscyplina</label>
                <Select value={filters.discipline || 'all'} onValueChange={(v) => updateFilter('discipline', v === 'all' ? undefined : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {disciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
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
                      <Checkbox 
                        checked={selectedOAStatuses.includes(opt.value)} 
                        onCheckedChange={() => toggleOAStatus(opt.value)} 
                      />
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
                      {selectedCountries.length > 0 
                        ? `Wybrano: ${selectedCountries.length}` 
                        : 'Wszystkie kraje'}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0">
                    <Command>
                      <CommandInput placeholder="Search..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {TOP_COUNTRIES.map(c => (
                            <CommandItem 
                              key={c.code} 
                              onSelect={() => toggleCountry(c.code)}
                              className="flex items-center gap-2"
                            >
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
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={filters.erih_plus || false} 
                    onCheckedChange={(c) => updateFilter('erih_plus', c || undefined)} 
                  />
                  <span className="text-sm">ERIH PLUS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={filters.has_doaj || false} 
                    onCheckedChange={(c) => updateFilter('has_doaj', c || undefined)} 
                  />
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
