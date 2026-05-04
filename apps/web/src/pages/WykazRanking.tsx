import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchJournals, Journal } from "@/lib/wykazApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Award } from "lucide-react";

export default function WykazRanking() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchJournals({});
        const sorted = [...result.data].sort((a, b) => b.points - a.points);
        setJournals(sorted);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const top10 = journals.slice(0, 10);
  const byDiscipline = journals.reduce((acc, j) => {
    const disc = j.discipline || 'inne';
    if (!acc[disc]) acc[disc] = [];
    acc[disc].push(j);
    return acc;
  }, {} as Record<string, Journal[]>);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <section className="bg-gradient-to-b from-primary/5 to-background border-b border-border/50 mt-16">
        <div className="container max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold">Ranking Czasopism MEiN</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Najwyżej punktowane czasopisma w wykazie MEiN dla medycyny i nauk o zdrowiu.
          </p>
        </div>
      </section>

      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="top10" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="top10">Top 10</TabsTrigger>
            <TabsTrigger value="disciplines">Według dyscyplin</TabsTrigger>
          </TabsList>

          <TabsContent value="top10" className="space-y-4">
            {isLoading ? (
              [...Array(10)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : (
              top10.map((journal, idx) => (
                <Card key={journal.id} className="relative overflow-hidden">
                  {idx < 3 && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/20 to-transparent" />
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 flex-shrink-0">
                          {idx === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                          {idx === 1 && <Award className="h-6 w-6 text-gray-400" />}
                          {idx === 2 && <Award className="h-6 w-6 text-orange-600" />}
                          {idx > 2 && <span className="text-xl font-bold text-muted-foreground">#{idx + 1}</span>}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl">{journal.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {journal.issn_print && <span className="font-mono text-xs">ISSN: {journal.issn_print}</span>}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="text-lg px-4 py-2 flex-shrink-0">
                        {journal.points} pkt
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>{journal.discipline || 'nauki medyczne'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="disciplines" className="space-y-6">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              Object.entries(byDiscipline).map(([discipline, disciplineJournals]) => (
                <Card key={discipline}>
                  <CardHeader>
                    <CardTitle className="text-2xl capitalize">{discipline}</CardTitle>
                    <CardDescription>
                      {disciplineJournals.length} czasopism
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {disciplineJournals.slice(0, 5).map((j, idx) => (
                      <div key={j.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-muted-foreground w-8">#{idx + 1}</span>
                          <div>
                            <p className="font-medium">{j.title}</p>
                            {j.issn_print && (
                              <p className="text-xs text-muted-foreground font-mono">{j.issn_print}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">{j.points} pkt</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
