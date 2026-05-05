import {
  buildCsvContent,
  createWykazClient,
  type Journal,
  type WykazFilters,
  type WykazResponse
} from "@kosma/core";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export type { Journal, WykazFilters, WykazResponse } from "@kosma/core";

const wykazClient = createWykazClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
});

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesDiscipline(journal: Journal, discipline?: string): boolean {
  if (!discipline) return true;

  const values = [
    journal.discipline,
    ...(Array.isArray(journal.disciplines) ? journal.disciplines : String(journal.disciplines ?? "").split(",")),
    ...(Array.isArray(journal.discipline_codes) ? journal.discipline_codes : []),
  ].map(normalizeText).filter(Boolean);

  const needle = normalizeText(discipline);
  return values.some((value) => value === needle || value.includes(needle));
}

function sortJournals(journals: Journal[], filters: WykazFilters): Journal[] {
  const sortBy = filters.sort_by ?? "points";
  const sortOrder = filters.sort_order ?? "desc";
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...journals].sort((a, b) => {
    if (sortBy === "title") {
      return direction * (a.title || "").localeCompare(b.title || "", "pl");
    }

    const valueA = Number(a[sortBy] ?? 0);
    const valueB = Number(b[sortBy] ?? 0);
    return direction * (valueA - valueB);
  });
}

async function fetchJournalsDirectly(filters: WykazFilters): Promise<WykazResponse | null> {
  const query = filters.q?.trim();
  if (!isSupabaseConfigured || !query) return null;

  const isIssnPattern = /^\d{4}-?\d{3}[\dXx]$/i.test(query);

  const runJournalQuery = (includeImpactFactor: boolean) => {
    let journalsQuery = supabase
      .from("journals_master")
      .select(`
        id, journal_id, title, issn_print, issn_electronic, issn_l,
        publisher, country_code, is_oa, oa_status, h_index, if_proxy,
        ${includeImpactFactor ? "impact_factor, impact_factor_source," : ""}
        apc_amount, apc_currency, in_erih_plus, is_in_doaj,
        openalex_updated_at, crossref_updated_at, doaj_updated_at, wikipedia_checked_at
      `);

    if (isIssnPattern) {
      const cleanIssn = query.replace("-", "");
      const formattedIssn = `${cleanIssn.slice(0, 4)}-${cleanIssn.slice(4)}`;
      journalsQuery = journalsQuery.or(
        `issn_print.eq.${formattedIssn},` +
        `issn_electronic.eq.${formattedIssn},` +
        `issn_l.eq.${formattedIssn},` +
        `issn_print.eq.${cleanIssn},` +
        `issn_electronic.eq.${cleanIssn},` +
        `issn_l.eq.${cleanIssn}`
      );
    } else {
      journalsQuery = journalsQuery.ilike("title", `%${query.replace(/[%_]/g, "\\$&")}%`);
    }

    if (filters.oa_statuses?.length) journalsQuery = journalsQuery.in("oa_status", filters.oa_statuses);
    if (filters.erih_plus) journalsQuery = journalsQuery.eq("in_erih_plus", true);
    if (filters.has_doaj) journalsQuery = journalsQuery.eq("is_in_doaj", true);
    if (filters.country_codes?.length) journalsQuery = journalsQuery.in("country_code", filters.country_codes);
    if (filters.apc_range === "none") journalsQuery = journalsQuery.is("apc_amount", null);
    if (filters.apc_range === "low") journalsQuery = journalsQuery.lte("apc_amount", 500);
    if (filters.apc_range === "medium") journalsQuery = journalsQuery.gte("apc_amount", 500).lte("apc_amount", 1500);
    if (filters.apc_range === "high") journalsQuery = journalsQuery.gt("apc_amount", 1500);

    return journalsQuery.limit(80);
  };

  let { data: journals, error } = await runJournalQuery(true);
  if (error && String(error.message || "").includes("impact_factor")) {
    ({ data: journals, error } = await runJournalQuery(false));
  }

  if (error || !journals) {
    console.warn("Direct journal search failed; falling back to Edge Function", error);
    return null;
  }

  const { data: latestWykaz } = await supabase
    .from("wykazy_metadata")
    .select("id, year_identifier, published_date, source_url")
    .order("published_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const journalIds = journals.map((journal) => journal.journal_id).filter(Boolean);
  const rankingsByJournalId = new Map<string, { points: number; disciplines: string[] | null; discipline_codes: string[] | null; id: string }>();

  if (latestWykaz?.id && journalIds.length > 0) {
    const { data: rankings } = await supabase
      .from("journal_rankings")
      .select("id, journal_id, points, disciplines, discipline_codes")
      .eq("wykaz_id", latestWykaz.id)
      .in("journal_id", journalIds);

    rankings?.forEach((ranking) => {
      if (ranking.journal_id) rankingsByJournalId.set(ranking.journal_id, ranking);
    });
  }

  const merged = journals
    .map((journal): Journal => {
      const ranking = journal.journal_id ? rankingsByJournalId.get(journal.journal_id) : undefined;
      return {
        ...journal,
        id: ranking?.id ?? journal.id,
        points: ranking?.points ?? 0,
        year: latestWykaz?.year_identifier ?? new Date().getFullYear(),
        published_date: latestWykaz?.published_date ?? null,
        wykaz_source_url: latestWykaz?.source_url ?? null,
        wykaz_identifier: latestWykaz?.year_identifier ?? null,
        discipline: ranking?.disciplines?.[0] ?? null,
        disciplines: ranking?.disciplines?.join(", ") ?? null,
        discipline_codes: ranking?.discipline_codes ?? null,
        in_current_wykaz: Boolean(ranking),
      };
    })
    .filter((journal) => filters.minPoints === undefined || journal.points >= filters.minPoints)
    .filter((journal) => filters.maxPoints === undefined || journal.points <= filters.maxPoints)
    .filter((journal) => matchesDiscipline(journal, filters.discipline));

  const sorted = sortJournals(merged, filters);
  return {
    data: sorted,
    count: sorted.length,
    hasMore: journals.length >= 80,
    timeout: false,
  };
}

export async function fetchJournals(filters: WykazFilters): Promise<WykazResponse> {
  const directSearch = await fetchJournalsDirectly(filters);
  if (directSearch) return directSearch;

  return wykazClient.fetchJournals(filters);
}

export function fetchJournalHistory(issn: string): Promise<Journal[]> {
  return wykazClient.fetchJournalHistory(issn);
}

export function fetchSingleJournal(journalId: string): Promise<Journal | null> {
  return wykazClient.fetchSingleJournal(journalId);
}

export function exportToCSV(journals: Journal[]): void {
  const csv = buildCsvContent(journals);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `wykaz-mein-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
