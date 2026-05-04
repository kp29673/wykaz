import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FollowCursorTooltip } from "@/components/ui/follow-cursor-tooltip";
import { Journal } from "@/lib/wykazApi";
import { TrendingUp, BookOpen, Award, Lock, LockOpen, Star, Shield, Building2, MapPin, Globe2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as flags from 'country-flag-icons/react/1x1';

import { ISO3_TO_ISO2, COUNTRY_NAME_TO_ISO2, ISO2_TO_COUNTRY_NAME } from "@/lib/countryMaps";
interface WykazTableProps {
  data: Journal[];
  isLoading: boolean;
  onRowClick: (journal: Journal) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
}

// Helper functions
function normalizeCountryCode(countryCode?: string, countryName?: string): string | undefined {
  if (!countryCode && !countryName) return undefined;
  
  // Try country code first
  if (countryCode) {
    const trimmed = countryCode.trim().toUpperCase();
    if (trimmed.length === 2) return trimmed;
    if (trimmed.length === 3 && ISO3_TO_ISO2[trimmed]) {
      return ISO3_TO_ISO2[trimmed];
    }
  }
  
  // Try country name
  if (countryName) {
    const normalized = countryName.toLowerCase().trim();
    if (COUNTRY_NAME_TO_ISO2[normalized]) {
      return COUNTRY_NAME_TO_ISO2[normalized];
    }
  }
  
  return undefined;
}

function getCountryFullName(iso2?: string, fallbackName?: string): string {
  if (iso2 && ISO2_TO_COUNTRY_NAME[iso2.toUpperCase()]) {
    return ISO2_TO_COUNTRY_NAME[iso2.toUpperCase()];
  }
  return fallbackName || "Unknown";
}

function getPublisherAbbr(publisher?: string): string {
  if (!publisher) return "";
  
  const stopWords = new Set([
    "and", "of", "the", "for", "in", "on", "at", "to", "by", 
    "a", "an", "du", "de", "la", "le", "les", "der", "die", "das"
  ]);
  
  const parts = publisher
    .split(/[\s,\-()]+/)
    .filter(Boolean)
    .filter(word => !stopWords.has(word.toLowerCase()));
  
  const letters = parts
    .map(word => word[0])
    .join("")
    .toUpperCase();
  
  // Return abbreviation if it's reasonable length, otherwise return first word
  if (letters.length >= 2 && letters.length <= 6) {
    return letters;
  }
  
  return parts[0] || publisher;
}
export function WykazTableModern({
  data,
  isLoading,
  onRowClick,
  sortBy,
  sortOrder,
  onSort
}: WykazTableProps) {
  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ChevronsUpDown className="h-4 w-4 ml-1 opacity-30" />;
    return sortOrder === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };
  if (isLoading) {
    return <div className="space-y-3">
        {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>;
  }
  if (data.length === 0) {
    return <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Brak wyników</h3>
        <p className="text-muted-foreground max-w-md">
          Nie znaleziono czasopism spełniających kryteria. Spróbuj zmienić filtry.
        </p>
      </div>;
  }
  return <TooltipProvider>
      <div className="rounded-xl border border-border/50 overflow-x-auto bg-card/30 backdrop-blur-sm animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="font-semibold">Tytuł czasopisma</TableHead>
              <TableHead className="font-semibold">ISSN</TableHead>
              <TableHead className="font-semibold text-center">proxy-IF</TableHead>
              <TableHead className="font-semibold text-center">h-index</TableHead>
              <TableHead className="font-semibold">Kategorie/Dyscypliny</TableHead>
              <TableHead className="font-semibold">Open Access</TableHead>
              <TableHead className="font-semibold text-right">
                <div className="flex items-center justify-end gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Punkty MEiN
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {data.map((journal, idx) => {
            const issn = journal.issn_print || journal.issn_electronic || '—';
            const disciplines = journal.disciplines || journal.discipline;
            const disciplineArray = Array.isArray(disciplines) ? disciplines : disciplines?.split(',').map(d => d.trim()) || [];
            return <TableRow key={`${journal.id}-${idx}`} onClick={() => onRowClick(journal)} className="cursor-pointer hover:bg-accent/50 transition-colors group border-border/30">
                <TableCell className="font-medium max-w-md">
                  <div className="flex items-start gap-3">
                    {(() => {
                      const iso2 = normalizeCountryCode(journal.country_code, journal.country);
                      const FlagComponent = iso2 ? flags[iso2 as keyof typeof flags] : null;
                      const countryFullName = getCountryFullName(iso2, journal.country);
                      const publisherName = (journal.publisher?.trim() || journal.host_organization?.trim() || "");
                      const publisherAbbr = getPublisherAbbr(publisherName);
                      
                      const TriggerContent = FlagComponent ? (
                        <div className="relative group/flag cursor-help">
                          <div className="w-7 h-7 rounded-md overflow-hidden border-2 border-border/50 shadow-sm transition-all duration-300 group-hover/flag:scale-110 group-hover/flag:shadow-lg group-hover/flag:border-primary/50 group-hover/flag:rotate-3">
                            <FlagComponent className="w-full h-full object-cover" />
                          </div>
                          <div className="pointer-events-none absolute inset-0 rounded-md bg-primary/0 group-hover/flag:bg-primary/10 transition-all duration-300" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-md border-2 border-border/50 bg-muted/50 flex items-center justify-center text-muted-foreground transition-all duration-300 hover:scale-110 hover:border-primary/50">
                          <Globe2 className="h-4 w-4" />
                        </div>
                      );

                      return (
                        <FollowCursorTooltip content={
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">{countryFullName}</span>
                            </div>
                            {publisherName && (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Wydawca</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-semibold text-primary">{publisherAbbr}</span>
                                  <span className="text-muted-foreground"> — </span>
                                  <span className="text-foreground">{publisherName}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        }>
                          {TriggerContent}
                        </FollowCursorTooltip>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate group-hover:text-primary transition-colors font-medium">
                          {journal.title}
                        </span>
                        {journal.is_oa && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 px-1.5 py-0">
                                <LockOpen className="h-3 w-3" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Open Access</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {journal.abbreviated_title && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {journal.abbreviated_title}
                        </div>
                      )}
                      {journal.title_2 && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {journal.title_2}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-muted-foreground">
                    {issn}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {journal.if_proxy ? <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className={cn("font-semibold px-2.5 py-1", journal.if_proxy >= 5 && "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30", journal.if_proxy >= 2 && journal.if_proxy < 5 && "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30", journal.if_proxy < 2 && "bg-muted/50 text-muted-foreground border-border")}>
                          {journal.if_proxy.toFixed(2)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Impact Factor (2-year mean citedness)</p>
                      </TooltipContent>
                    </Tooltip> : <span className="text-sm text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  {journal.h_index ? <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="font-semibold px-2.5 py-1 bg-accent/50">
                          <Award className="h-3 w-3 mr-1" />
                          {journal.h_index}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>h-index z OpenAlex</p>
                      </TooltipContent>
                    </Tooltip> : <span className="text-sm text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {disciplineArray.length > 0 ? <>
                        {disciplineArray.slice(0, 2).map((disc, i) => <Badge key={i} variant="secondary" className={cn("text-xs font-normal hover-scale", "bg-primary/10 text-primary border-primary/20")}>
                            {disc}
                          </Badge>)}
                        {disciplineArray.length > 2 && <Badge variant="outline" className="text-xs font-normal">
                            +{disciplineArray.length - 2}
                          </Badge>}
                      </> : <span className="text-sm text-muted-foreground">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {journal.oa_status === 'gold' && <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Gold OA
                      </Badge>}
                    {journal.in_erih_plus && <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 text-xs">
                        ERIH+
                      </Badge>}
                    {journal.preservation_status && <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
                        <Shield className="h-3 w-3" />
                      </Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Badge className={cn("font-semibold px-3 py-1 hover-scale", journal.points >= 140 && "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30", journal.points >= 70 && journal.points < 140 && "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30", journal.points < 70 && "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30")} variant="outline">
                      {journal.points}
                    </Badge>
                    {journal.in_current_wykaz === false && <Badge variant="secondary" className="text-xs">
                        Brak w aktualnym wykazie
                      </Badge>}
                  </div>
                </TableCell>
              </TableRow>;
          })}
        </TableBody>
      </Table>
      </div>
    </TooltipProvider>;
}