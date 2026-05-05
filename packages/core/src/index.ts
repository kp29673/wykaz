export interface DataProvenanceField {
  source: string;
  updated_at?: string;
  method?: string;
}

export interface Journal {
  id?: string | null;
  journal_id?: string | null;
  title: string;
  title_2?: string | null;
  abbreviated_title?: string | null;
  issn_print?: string | null;
  issn_electronic?: string | null;
  issn_print_2?: string | null;
  issn_electronic_2?: string | null;
  issn_l?: string | null;
  points: number;
  year: number | string;
  published_date?: string | null;
  discipline?: string | null;
  disciplines?: string | string[] | null;
  discipline_codes?: string[] | null;
  source_file?: string | null;
  in_current_wykaz?: boolean;
  if_proxy?: number | null;
  impact_factor?: number | null;
  impact_factor_source?: string | null;
  h_index?: number | null;
  i10_index?: number | null;
  is_oa?: boolean | null;
  works_count?: number | null;
  data_source?: string | null;
  openalex_id?: string | null;
  country_code?: string | null;
  host_organization?: string | null;
  cited_by_count?: number | null;
  openalex_updated_at?: string | null;
  publisher?: string | null;
  country?: string | null;
  medium?: string | null;
  oa_status?: string | null;
  license?: string | null;
  apc_amount?: number | null;
  apc_currency?: string | null;
  journal_url?: string | null;
  avg_time_to_publish_days?: number | null;
  oa_rate?: number | null;
  preprint_allowed?: boolean | null;
  postprint_allowed?: boolean | null;
  publisher_pdf_allowed?: boolean | null;
  embargo_months?: number | null;
  in_erih_plus?: boolean | null;
  in_road?: boolean | null;
  preservation_status?: boolean | null;
  papers_5y?: number | null;
  avg_citations_per_paper?: number | null;
  composite_score?: number | null;
  sources_metadata?: unknown;
  last_enriched_at?: string | null;
  enrichment_method?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  data_provenance?: Record<string, DataProvenanceField>;
  crossref_total_dois?: number | null;
  crossref_current_dois?: number | null;
  crossref_backfile_dois?: number | null;
  crossref_member_id?: string | null;
  crossref_publisher?: string | null;
  crossref_updated_at?: string | null;
  crossref_publisher_location?: string | null;
  crossref_subjects?: unknown;
  crossref_languages?: string[] | null;
  crossref_issn_type?: string | null;
  crossref_coverage_depth?: string | null;
  crossref_coverage_type?: string | null;
  crossref_breakdowns?: unknown;
  crossref_affiliations?: unknown;
  is_in_doaj?: boolean | null;
  doaj_seal?: boolean | null;
  doaj_review_process?: string | null;
  doaj_plagiarism_check?: boolean | null;
  doaj_updated_at?: string | null;
  doaj_editorial_board_url?: string | null;
  doaj_author_instructions_url?: string | null;
  doaj_aims_scope?: string | null;
  doaj_publication_time_weeks?: number | null;
  doaj_keywords?: string[] | null;
  doaj_languages?: string[] | null;
  wykaz_identifier?: string | null;
  wykaz_version?: string | null;
  wykaz_valid_from?: string | null;
  wykaz_valid_to?: string | null;
  wykaz_notes?: string | null;
  wykaz_source_url?: string | null;
  year_identifier?: string | null;
  wikidata_id?: string | null;
  wikipedia_url?: string | null;
  wikipedia_lang?: string | null;
  wikipedia_title?: string | null;
  wikipedia_checked_at?: string | null;
}

export interface WykazFilters {
  q?: string;
  minPoints?: number;
  maxPoints?: number;
  discipline?: string;
  oa_statuses?: string[];
  apc_range?: string;
  erih_plus?: boolean;
  has_doaj?: boolean;
  country_codes?: string[];
  sort_by?: "points" | "title" | "if_proxy" | "h_index";
  sort_order?: "asc" | "desc";
}

export interface WykazResponse {
  data: Journal[];
  count: number;
  hasMore: boolean;
  timeout?: boolean;
}

export interface WykazClientConfig {
  supabaseUrl: string;
  publishableKey: string;
  fetchImpl?: typeof fetch;
  maxResults?: number;
}

export interface WykazClient {
  fetchJournals(filters?: WykazFilters): Promise<WykazResponse>;
  fetchSingleJournal(journalId: string): Promise<Journal | null>;
  fetchJournalHistory(issn: string): Promise<Journal[]>;
}

const DEFAULT_MAX_RESULTS = 200;

const MOCK_JOURNALS: Journal[] = [
  { id: "1", title: "Nature Medicine", issn_print: "1078-8956", issn_electronic: "1546-170X", points: 200, year: 2024, discipline: "nauki medyczne" },
  { id: "2", title: "The Lancet", issn_print: "0140-6736", issn_electronic: "1474-547X", points: 200, year: 2024, discipline: "nauki medyczne" },
  { id: "3", title: "JAMA", issn_print: "0098-7484", issn_electronic: "1538-3598", points: 200, year: 2024, discipline: "nauki medyczne" },
  { id: "4", title: "New England Journal of Medicine", issn_print: "0028-4793", issn_electronic: "1533-4406", points: 200, year: 2024, discipline: "nauki medyczne" },
  { id: "5", title: "BMJ", issn_print: "0959-8138", issn_electronic: "1756-1833", points: 140, year: 2024, discipline: "nauki medyczne" }
];

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function assertConfig(config: WykazClientConfig): void {
  if (!config.supabaseUrl) {
    throw new Error("Missing Supabase URL");
  }
  if (!config.publishableKey) {
    throw new Error("Missing Supabase publishable key");
  }
}

function getFetch(config: WykazClientConfig): typeof fetch {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("No fetch implementation available");
  }
  return fetchImpl.bind(globalThis);
}

function buildSearchParams(filters: WykazFilters): URLSearchParams {
  const params = new URLSearchParams();
  const query = filters.q?.trim();
  if (query) params.set("q", query);
  if (filters.minPoints !== undefined) params.set("minPoints", String(filters.minPoints));
  if (filters.maxPoints !== undefined) params.set("maxPoints", String(filters.maxPoints));
  if (filters.discipline) {
    params.set("discipline", filters.discipline);
    params.set("disciplines", filters.discipline);
  }
  if (filters.oa_statuses?.length) params.set("oa_status", filters.oa_statuses.join(","));
  if (filters.apc_range) params.set("apc_range", filters.apc_range);
  if (filters.erih_plus) params.set("erih_plus", "true");
  if (filters.has_doaj) params.set("has_doaj", "true");
  if (filters.country_codes?.length) params.set("country_codes", filters.country_codes.join(","));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  return params;
}

function normalizeResponse(data: unknown, maxResults: number): WykazResponse {
  if (Array.isArray(data)) {
    const journals = data as Journal[];
    return {
      data: journals.slice(0, maxResults),
      count: journals.length,
      hasMore: journals.length >= maxResults,
      timeout: false
    };
  }

  const payload = data as Partial<WykazResponse> | undefined;
  const journals = Array.isArray(payload?.data) ? payload.data : [];
  return {
    data: journals.slice(0, maxResults),
    count: journals.length,
    hasMore: payload?.hasMore ?? false,
    timeout: payload?.timeout ?? false
  };
}

function fallbackJournals(filters: WykazFilters, maxResults: number): WykazResponse {
  let filtered = [...MOCK_JOURNALS];

  if (filters.q) {
    const query = filters.q.toLowerCase();
    filtered = filtered.filter((journal) => journal.title.toLowerCase().includes(query));
  }
  if (filters.minPoints !== undefined) {
    filtered = filtered.filter((journal) => journal.points >= filters.minPoints!);
  }
  if (filters.maxPoints !== undefined) {
    filtered = filtered.filter((journal) => journal.points <= filters.maxPoints!);
  }
  if (filters.discipline) {
    const query = filters.discipline.toLowerCase();
    filtered = filtered.filter((journal) => {
      const disciplines = Array.isArray(journal.disciplines)
        ? journal.disciplines
        : [journal.discipline, journal.disciplines].filter(Boolean);
      return disciplines.some((discipline) => String(discipline).toLowerCase().includes(query));
    });
  }

  return {
    data: filtered.slice(0, maxResults),
    count: filtered.length,
    hasMore: filtered.length >= maxResults
  };
}

export function createWykazClient(config: WykazClientConfig): WykazClient {
  assertConfig(config);

  const baseUrl = normalizeBaseUrl(config.supabaseUrl);
  const maxResults = config.maxResults ?? DEFAULT_MAX_RESULTS;
  const fetchImpl = getFetch(config);

  async function requestJson(url: string): Promise<unknown> {
    const response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${config.publishableKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase function request failed: ${response.status}`);
    }

    return response.json();
  }

  return {
    async fetchJournals(filters: WykazFilters = {}) {
      try {
        const params = buildSearchParams(filters);
        const url = `${baseUrl}/functions/v1/fetch-journals?${params}`;
        return normalizeResponse(await requestJson(url), maxResults);
      } catch (error) {
        console.error("Wykaz API error:", error);
        return fallbackJournals(filters, maxResults);
      }
    },

    async fetchSingleJournal(journalId: string) {
      try {
        const url = `${baseUrl}/functions/v1/fetch-journals?journal_id=${encodeURIComponent(journalId)}`;
        const data = await requestJson(url);
        return Array.isArray(data) ? (data[0] as Journal | undefined) ?? null : null;
      } catch (error) {
        console.error("Single journal API error:", error);
        return null;
      }
    },

    async fetchJournalHistory(issn: string) {
      try {
        const url = `${baseUrl}/functions/v1/fetch-journal-history?issn=${encodeURIComponent(issn)}`;
        const data = (await requestJson(url)) as { history?: Journal[] };
        return data.history ?? [];
      } catch (error) {
        console.error("Journal history API error:", error);
        return [];
      }
    }
  };
}

export function fetchJournals(config: WykazClientConfig, filters: WykazFilters = {}): Promise<WykazResponse> {
  return createWykazClient(config).fetchJournals(filters);
}

export function fetchSingleJournal(config: WykazClientConfig, journalId: string): Promise<Journal | null> {
  return createWykazClient(config).fetchSingleJournal(journalId);
}

export function fetchJournalHistory(config: WykazClientConfig, issn: string): Promise<Journal[]> {
  return createWykazClient(config).fetchJournalHistory(issn);
}

export function buildCsvContent(journals: Journal[]): string {
  const headers = ["Tytuł", "ISSN Print", "ISSN Electronic", "Punkty MEiN", "Rok", "Dyscyplina"];
  const rows = journals.map((journal) => {
    const discipline = Array.isArray(journal.disciplines)
      ? journal.disciplines.join(", ")
      : journal.disciplines || journal.discipline || "";

    return [
      journal.title,
      journal.issn_print || "",
      journal.issn_electronic || "",
      String(journal.points),
      String(journal.year),
      String(discipline)
    ];
  });

  return [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");
}
