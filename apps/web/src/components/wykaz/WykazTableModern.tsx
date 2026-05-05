import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FollowCursorTooltip } from "@/components/ui/follow-cursor-tooltip";
import { Journal } from "@/lib/wykazApi";
import { BookOpen, Building2, ChevronDown, ChevronsUpDown, ChevronUp, Globe2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import * as flags from "country-flag-icons/react/1x1";

import { ISO3_TO_ISO2, COUNTRY_NAME_TO_ISO2, ISO2_TO_COUNTRY_NAME } from "@/lib/countryMaps";

interface WykazTableProps {
  data: Journal[];
  isLoading: boolean;
  onRowClick: (journal: Journal) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort: (field: string) => void;
}

function normalizeCountryCode(countryCode?: string, countryName?: string): string | undefined {
  if (!countryCode && !countryName) return undefined;

  if (countryCode) {
    const trimmed = countryCode.trim().toUpperCase();
    if (trimmed.length === 2) return trimmed;
    if (trimmed.length === 3 && ISO3_TO_ISO2[trimmed]) return ISO3_TO_ISO2[trimmed];
  }

  if (countryName) {
    const normalized = countryName.toLowerCase().trim();
    if (COUNTRY_NAME_TO_ISO2[normalized]) return COUNTRY_NAME_TO_ISO2[normalized];
  }

  return undefined;
}

function getCountryFullName(iso2?: string, fallbackName?: string): string {
  if (iso2 && ISO2_TO_COUNTRY_NAME[iso2.toUpperCase()]) {
    return ISO2_TO_COUNTRY_NAME[iso2.toUpperCase()];
  }
  return fallbackName || "Nieznany kraj";
}

function getPublisherAbbr(publisher?: string): string {
  if (!publisher) return "";

  const stopWords = new Set([
    "and", "of", "the", "for", "in", "on", "at", "to", "by",
    "a", "an", "du", "de", "la", "le", "les", "der", "die", "das",
    "wydawnictwo", "university", "press"
  ]);

  const parts = publisher
    .split(/[\s,\-()]+/)
    .filter(Boolean)
    .filter((word) => !stopWords.has(word.toLowerCase()));

  const letters = parts.map((word) => word[0]).join("").toUpperCase();
  if (letters.length >= 2 && letters.length <= 6) return letters;

  return parts[0] || publisher;
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function splitDisciplines(journal: Journal): string[] {
  const raw = journal.disciplines || journal.discipline;
  const values = Array.isArray(raw) ? raw : String(raw || "").split(/[,;]/);
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function compactSource(source?: string | null): string {
  if (!source) return "source";
  return source.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
}

function MetricValue({
  value,
  label,
  source,
  digits = 2,
}: {
  value: number | string | null | undefined;
  label: string;
  source?: string | null;
  digits?: number;
}) {
  const numeric = toFiniteNumber(value);

  if (numeric === null) {
    return <span className="text-sm text-muted-foreground/60">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex min-w-14 flex-col items-end leading-none">
          <span className="font-semibold tabular-nums text-foreground">{numeric.toFixed(digits)}</span>
          <span className="mt-1 text-[10px] font-normal text-muted-foreground/70">{compactSource(source)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}{source ? `: ${source}` : ""}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "gold" | "blue" | "green" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium leading-none",
        tone === "gold" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "blue" && "bg-sky-500/10 text-sky-700 dark:text-sky-300",
        tone === "green" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "neutral" && "bg-muted/70 text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "gold" && "bg-amber-500",
          tone === "blue" && "bg-sky-500",
          tone === "green" && "bg-emerald-500",
          tone === "neutral" && "bg-muted-foreground/60"
        )}
      />
      {label}
    </span>
  );
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
    if (sortBy !== field) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-35" />;
    return sortOrder === "asc"
      ? <ChevronUp className="h-3.5 w-3.5" />
      : <ChevronDown className="h-3.5 w-3.5" />;
  };

  const SortHeader = ({ field, label, align = "center" }: { field: string; label: string; align?: "center" | "right" }) => (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "inline-flex w-full items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground",
        align === "center" && "justify-center",
        align === "right" && "justify-end"
      )}
    >
      {label}
      {getSortIcon(field)}
    </button>
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Brak wyników</h3>
        <p className="text-muted-foreground max-w-md">
          Nie znaleziono czasopism spełniających kryteria. Spróbuj zmienić filtry.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border border-border/40 bg-background animate-fade-in">
        <Table className="min-w-[960px] table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-[34%] font-semibold">Tytuł czasopisma</TableHead>
              <TableHead className="w-[7%] text-center font-semibold">IF</TableHead>
              <TableHead className="w-[8%] text-center">
                <SortHeader field="if_proxy" label="proxy IF" />
              </TableHead>
              <TableHead className="w-[8%] text-center">
                <SortHeader field="h_index" label="h-index" />
              </TableHead>
              <TableHead className="w-[27%] font-semibold">Kategorie / dyscypliny</TableHead>
              <TableHead className="w-[9%] font-semibold">Open Access</TableHead>
              <TableHead className="w-[7%] text-right">
                <SortHeader field="points" label="Punkty MEiN" align="right" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((journal, idx) => {
              const iso2 = normalizeCountryCode(journal.country_code, journal.country);
              const FlagComponent = iso2 ? flags[iso2 as keyof typeof flags] : null;
              const countryFullName = getCountryFullName(iso2, journal.country);
              const publisherName = journal.publisher?.trim() || journal.host_organization?.trim() || "";
              const publisherAbbr = getPublisherAbbr(publisherName);
              const disciplineArray = splitDisciplines(journal);
              const issnItems = [
                { label: "ISSN", value: journal.issn_print },
                { label: "eISSN", value: journal.issn_electronic },
                { label: "ISSN-L", value: journal.issn_l },
              ].filter((item) => item.value);

              return (
                <TableRow
                  key={`${journal.id || journal.journal_id}-${idx}`}
                  onClick={() => onRowClick(journal)}
                  className="group cursor-pointer border-border/30 transition-colors hover:bg-muted/35"
                >
                  <TableCell className="py-4 pr-5 align-top">
                    <div className="flex min-w-0 items-start gap-4">
                      <FollowCursorTooltip
                        content={
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">{countryFullName}</span>
                            </div>
                            {publisherName && (
                              <div className="space-y-1">
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
                        }
                      >
                        <div className="flex w-14 shrink-0 cursor-help flex-col items-center gap-1.5">
                          {FlagComponent ? (
                            <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-border/60 transition-transform group-hover:scale-105">
                              <FlagComponent className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border/60">
                              <Globe2 className="h-4 w-4" />
                            </div>
                          )}
                          <span className="max-w-14 truncate text-center text-[10px] font-medium leading-none text-muted-foreground">
                            {publisherAbbr || iso2 || "—"}
                          </span>
                        </div>
                      </FollowCursorTooltip>

                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                          {journal.title}
                        </div>
                        {journal.abbreviated_title && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {journal.abbreviated_title}
                          </div>
                        )}
                        {journal.title_2 && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {journal.title_2}
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                          {issnItems.length > 0 ? issnItems.map((item) => (
                            <span key={item.label} className="whitespace-nowrap">
                              <span className="font-sans text-[10px] text-muted-foreground/70">{item.label}</span>{" "}
                              {item.value}
                            </span>
                          )) : (
                            <span>ISSN —</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-4 text-right align-top">
                    <MetricValue
                      value={journal.impact_factor}
                      label="Impact Factor"
                      source={journal.impact_factor_source}
                    />
                  </TableCell>

                  <TableCell className="py-4 text-right align-top">
                    <MetricValue
                      value={journal.if_proxy}
                      label="proxy IF"
                      source={journal.data_provenance?.if_proxy?.source || "OpenAlex"}
                    />
                  </TableCell>

                  <TableCell className="py-4 text-right align-top">
                    <MetricValue
                      value={journal.h_index}
                      label="h-index"
                      source={journal.data_provenance?.h_index?.source || "OpenAlex"}
                      digits={0}
                    />
                  </TableCell>

                  <TableCell className="py-4 align-top">
                    {disciplineArray.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {disciplineArray.map((disc) => (
                          <span
                            key={disc}
                            className="rounded-full bg-muted/70 px-2 py-1 text-xs leading-snug text-muted-foreground"
                          >
                            {disc}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/60">—</span>
                    )}
                  </TableCell>

                  <TableCell className="py-4 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {journal.oa_status === "gold" && <StatusPill label="Gold OA" tone="gold" />}
                      {journal.is_oa && journal.oa_status !== "gold" && <StatusPill label="OA" tone="green" />}
                      {journal.in_erih_plus && <StatusPill label="ERIH+" tone="blue" />}
                      {journal.preservation_status && <StatusPill label="Archive" tone="green" />}
                      {!journal.is_oa && !journal.in_erih_plus && !journal.preservation_status && (
                        <span className="text-sm text-muted-foreground/60">—</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-4 text-right align-top">
                    <div className="flex items-start justify-end gap-2">
                      <span
                        className={cn(
                          "inline-flex min-w-12 justify-center rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
                          journal.points >= 140 && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                          journal.points >= 70 && journal.points < 140 && "bg-sky-500/10 text-sky-700 dark:text-sky-300",
                          journal.points < 70 && "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                        )}
                      >
                        {journal.points}
                      </span>
                      {journal.in_current_wykaz === false && (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          Poza aktualnym
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
