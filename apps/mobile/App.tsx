import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  createWykazClient,
  type Journal,
  type WykazFilters
} from "@kosma/core";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./src/config";
import { supabase } from "./src/lib/supabase";

type Tab = "wykaz" | "ranking" | "admin";

const wykazClient = createWykazClient({
  supabaseUrl: SUPABASE_URL,
  publishableKey: SUPABASE_PUBLISHABLE_KEY
});

export default function App() {
  const [tab, setTab] = useState<Tab>("wykaz");

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Kosma Piekarski</Text>
        <Text style={styles.subtitle}>Wykaz czasopism punktowanych MEiN</Text>
      </View>

      <View style={styles.tabs}>
        <TabButton label="Wykaz" active={tab === "wykaz"} onPress={() => setTab("wykaz")} />
        <TabButton label="Ranking" active={tab === "ranking"} onPress={() => setTab("ranking")} />
        <TabButton label="Admin" active={tab === "admin"} onPress={() => setTab("admin")} />
      </View>

      {tab === "wykaz" && <WykazScreen />}
      {tab === "ranking" && <RankingScreen />}
      {tab === "admin" && <AdminScreen />}
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function WykazScreen() {
  const [query, setQuery] = useState("");
  const [minPoints, setMinPoints] = useState("");
  const [journals, setJournals] = useState<Journal[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeout, setTimeoutState] = useState(false);

  const filters = useMemo<WykazFilters>(() => ({
    q: query.trim() || undefined,
    minPoints: minPoints ? Number(minPoints) : undefined,
    sort_by: "points",
    sort_order: "desc"
  }), [query, minPoints]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await wykazClient.fetchJournals(filters);
      setJournals(result.data);
      setTimeoutState(Boolean(result.timeout));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  if (selectedJournal) {
    return <JournalDetails journal={selectedJournal} onBack={() => setSelectedJournal(null)} />;
  }

  return (
    <View style={styles.content}>
      <View style={styles.filterRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tytuł lub ISSN"
          autoCapitalize="none"
          style={[styles.input, styles.searchInput]}
        />
        <TextInput
          value={minPoints}
          onChangeText={setMinPoints}
          placeholder="Min pkt"
          keyboardType="number-pad"
          style={[styles.input, styles.pointsInput]}
        />
      </View>

      {timeout && <Text style={styles.warning}>Baza jest przeciążona. Zawęź wyszukiwanie.</Text>}
      {loading && <ActivityIndicator style={styles.loader} />}

      <FlatList
        data={journals}
        keyExtractor={(item, index) => item.journal_id || item.id || `${item.title}-${index}`}
        renderItem={({ item }) => <JournalRow journal={item} onPress={() => setSelectedJournal(item)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Brak wyników.</Text> : null}
      />
    </View>
  );
}

function JournalRow({ journal, onPress }: { journal: Journal; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.cardTitle}>{journal.title}</Text>
        <Text style={styles.badge}>{journal.points} pkt</Text>
      </View>
      <Text style={styles.meta}>
        {[journal.issn_print, journal.issn_electronic, journal.publisher].filter(Boolean).join(" · ")}
      </Text>
      <Text style={styles.meta}>{Array.isArray(journal.disciplines) ? journal.disciplines.join(", ") : journal.disciplines || journal.discipline || "Brak dyscypliny"}</Text>
    </Pressable>
  );
}

function JournalDetails({ journal, onBack }: { journal: Journal; onBack: () => void }) {
  const [current, setCurrent] = useState(journal);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    const journalId = current.journal_id || current.id || current.issn_print || current.issn_electronic;
    if (!journalId) return;

    setRefreshing(true);
    try {
      await supabase.functions.invoke("enrich-journal-all", { body: { journalId } });
      const fresh = await wykazClient.fetchSingleJournal(journalId);
      if (fresh) setCurrent(fresh);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.details}>
      <Pressable onPress={onBack} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Wróć</Text>
      </Pressable>
      <Text style={styles.detailsTitle}>{current.title}</Text>
      <Text style={styles.bigPoints}>{current.points} pkt MEiN</Text>
      <Info label="ISSN" value={[current.issn_print, current.issn_electronic].filter(Boolean).join(" / ")} />
      <Info label="Wydawca" value={current.publisher} />
      <Info label="Kraj" value={current.country || current.country_code} />
      <Info label="Open Access" value={current.oa_status || (current.is_oa ? "Tak" : "Nie")} />
      <Info label="H-index" value={current.h_index?.toString()} />
      <Info label="Cytowania" value={current.cited_by_count?.toString()} />
      <Info label="Aktualizacja" value={current.updated_at || current.openalex_updated_at || current.last_enriched_at} />
      <Pressable onPress={refresh} style={styles.primaryButton} disabled={refreshing}>
        <Text style={styles.primaryButtonText}>{refreshing ? "Odświeżanie..." : "Odśwież dane enrichment"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function RankingScreen() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wykazClient.fetchJournals({ sort_by: "points", sort_order: "desc" }).then((result) => {
      setJournals([...result.data].sort((a, b) => b.points - a.points).slice(0, 20));
      setLoading(false);
    });
  }, []);

  const maxPoints = Math.max(...journals.map((journal) => journal.points), 1);

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.list}>
      {loading && <ActivityIndicator style={styles.loader} />}
      {!loading && journals.map((journal, index) => (
        <View key={journal.journal_id || journal.id || journal.title} style={styles.rankingRow}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <View style={styles.rankingBody}>
            <Text style={styles.cardTitle}>{journal.title}</Text>
            <View style={styles.chartTrack}>
              <View style={[styles.chartBar, { width: `${Math.max(8, (journal.points / maxPoints) * 100)}%` }]} />
            </View>
          </View>
          <Text style={styles.badge}>{journal.points}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function AdminScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coursesCount, setCoursesCount] = useState<number | null>(null);
  const [journalsCount, setJournalsCount] = useState<number | null>(null);

  const checkSession = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(Boolean(data));
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    const [{ count: courses }, { count: journals }] = await Promise.all([
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("journals_master").select("id", { count: "exact", head: true })
    ]);
    setCoursesCount(courses ?? 0);
    setJournalsCount(journals ?? 0);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin, loadStats]);

  const login = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      Alert.alert("Logowanie", "Nieprawidłowy e-mail lub hasło.");
      setLoading(false);
      return;
    }
    await checkSession();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  if (loading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (!isAdmin) {
    return (
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Panel admina</Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Hasło" secureTextEntry style={styles.input} />
        <Pressable onPress={login} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Zaloguj</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.details}>
      <Text style={styles.sectionTitle}>Panel admina</Text>
      <Info label="Kursy" value={coursesCount?.toString()} />
      <Info label="Journale w bazie" value={journalsCount?.toString()} />
      <Text style={styles.meta}>Moduły admina: wykazy, import MEiN, enrichment, kursy, studenci i oceny używają tego samego Supabase co web.</Text>
      <Pressable onPress={loadStats} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Odśwież statystyki</Text>
      </Pressable>
      <Pressable onPress={signOut} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Wyloguj</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "Brak danych"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, backgroundColor: "#0f766e" },
  title: { color: "white", fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#ccfbf1", marginTop: 4 },
  tabs: { flexDirection: "row", padding: 10, gap: 8, backgroundColor: "white" },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#f1f5f9", alignItems: "center" },
  tabButtonActive: { backgroundColor: "#0f766e" },
  tabText: { color: "#334155", fontWeight: "600" },
  tabTextActive: { color: "white" },
  content: { flex: 1, padding: 16 },
  filterRow: { flexDirection: "row", gap: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, backgroundColor: "white", marginBottom: 10 },
  searchInput: { flex: 1 },
  pointsInput: { width: 94 },
  loader: { marginVertical: 20 },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: "white", borderRadius: 8, padding: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  rowHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#0f172a" },
  badge: { overflow: "hidden", borderRadius: 8, backgroundColor: "#ccfbf1", color: "#0f766e", paddingHorizontal: 10, paddingVertical: 5, fontWeight: "700" },
  meta: { color: "#64748b", marginTop: 6, lineHeight: 19 },
  warning: { color: "#b91c1c", marginVertical: 10 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 30 },
  details: { gap: 12, paddingBottom: 28 },
  detailsTitle: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  bigPoints: { fontSize: 20, fontWeight: "800", color: "#0f766e" },
  infoRow: { backgroundColor: "white", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  infoLabel: { color: "#64748b", marginBottom: 4 },
  infoValue: { color: "#0f172a", fontWeight: "600" },
  primaryButton: { minHeight: 48, borderRadius: 8, backgroundColor: "#0f766e", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginTop: 4 },
  primaryButtonText: { color: "white", fontWeight: "800" },
  secondaryButton: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: "#0f766e", alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  secondaryButtonText: { color: "#0f766e", fontWeight: "800" },
  rankingRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "white", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  rank: { width: 36, fontWeight: "800", color: "#0f766e" },
  rankingBody: { flex: 1 },
  chartTrack: { height: 8, borderRadius: 4, backgroundColor: "#e2e8f0", marginTop: 8, overflow: "hidden" },
  chartBar: { height: 8, borderRadius: 4, backgroundColor: "#0f766e" },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 12 }
});
