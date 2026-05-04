import {
  buildCsvContent,
  createWykazClient,
  type Journal,
  type WykazFilters,
  type WykazResponse
} from "@kosma/core";

export type { Journal, WykazFilters, WykazResponse } from "@kosma/core";

const wykazClient = createWykazClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
});

export function fetchJournals(filters: WykazFilters): Promise<WykazResponse> {
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
