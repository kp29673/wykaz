import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Wykaz {
  id: string;
  year_identifier: string;
  published_date: string;
  valid_from: string;
  valid_to: string | null;
  wykaz_version: string;
  notes: string | null;
  journal_count?: number;
}

export const WykazyManagement = () => {
  const [wykazy, setWykazy] = useState<Wykaz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingWykaz, setEditingWykaz] = useState<Wykaz | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [yearIdentifier, setYearIdentifier] = useState("");
  const [publishedDate, setPublishedDate] = useState<Date | undefined>(undefined);
  const [validFrom, setValidFrom] = useState<Date | undefined>(undefined);
  const [wykazVersion, setWykazVersion] = useState<"Pełny wykaz" | "Zmiana / sprostowanie">("Pełny wykaz");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchWykazy();
  }, []);

  const fetchWykazy = async () => {
    setIsLoading(true);
    try {
      // Fetch wykazy with journal counts
      const { data: wykazyData, error: wykazyError } = await supabase
        .from('wykazy_metadata')
        .select('*')
        .order('published_date', { ascending: false });

      if (wykazyError) throw wykazyError;

      // Fetch journal counts for each wykaz
      const wykazyWithCounts = await Promise.all(
        (wykazyData || []).map(async (w) => {
          const { count } = await supabase
            .from('journal_rankings')
            .select('*', { count: 'exact', head: true })
            .eq('wykaz_id', w.id);
          
          return { ...w, journal_count: count || 0 };
        })
      );

      setWykazy(wykazyWithCounts);
    } catch (error) {
      console.error('Error fetching wykazy:', error);
      toast.error('Nie udało się pobrać wykazów');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setYearIdentifier("");
    setPublishedDate(undefined);
    setValidFrom(undefined);
    setWykazVersion("Pełny wykaz");
    setNotes("");
    setEditingWykaz(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (wykaz: Wykaz) => {
    setEditingWykaz(wykaz);
    setYearIdentifier(wykaz.year_identifier);
    setPublishedDate(new Date(wykaz.published_date));
    setValidFrom(new Date(wykaz.valid_from));
    setWykazVersion(wykaz.wykaz_version as "Pełny wykaz" | "Zmiana / sprostowanie");
    setNotes(wykaz.notes || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!yearIdentifier || !publishedDate || !validFrom) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    setIsSubmitting(true);
    try {
      const wykazData = {
        year_identifier: yearIdentifier,
        published_date: format(publishedDate, 'yyyy-MM-dd'),
        valid_from: format(validFrom, 'yyyy-MM-dd'),
        wykaz_version: wykazVersion,
        notes: notes || null,
      };

      if (editingWykaz) {
        // Update existing
        const { error } = await supabase
          .from('wykazy_metadata')
          .update(wykazData)
          .eq('id', editingWykaz.id);

        if (error) throw error;
        toast.success('Wykaz zaktualizowany');
      } else {
        // Insert new - automatically update previous wykaz's valid_to
        const { data: newWykaz, error: insertError } = await supabase
          .from('wykazy_metadata')
          .insert(wykazData)
          .select()
          .single();

        if (insertError) throw insertError;

        // Update previous wykaz's valid_to
        const previousWykaz = wykazy[0]; // Most recent before this one
        if (previousWykaz) {
          const newValidTo = new Date(validFrom);
          newValidTo.setDate(newValidTo.getDate() - 1);
          
          await supabase
            .from('wykazy_metadata')
            .update({ valid_to: format(newValidTo, 'yyyy-MM-dd') })
            .eq('id', previousWykaz.id);
        }

        toast.success('Wykaz dodany');
      }

      await fetchWykazy();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving wykaz:', error);
      toast.error('Błąd podczas zapisywania wykazu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (wykaz: Wykaz) => {
    if (wykaz.journal_count && wykaz.journal_count > 0) {
      toast.error('Nie można usunąć wykazu z zaimportowanymi danymi');
      return;
    }

    if (!confirm(`Czy na pewno usunąć wykaz "${wykaz.year_identifier}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('wykazy_metadata')
        .delete()
        .eq('id', wykaz.id);

      if (error) throw error;

      // Restore previous wykaz's valid_to to NULL
      const previousIndex = wykazy.findIndex(w => w.id === wykaz.id) + 1;
      if (previousIndex < wykazy.length) {
        await supabase
          .from('wykazy_metadata')
          .update({ valid_to: null })
          .eq('id', wykazy[previousIndex].id);
      }

      toast.success('Wykaz usunięty');
      await fetchWykazy();
    } catch (error) {
      console.error('Error deleting wykaz:', error);
      toast.error('Błąd podczas usuwania wykazu');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Zarządzanie Wykazami MEiN</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Definiuj daty publikacji wykazów oraz okresy ich obowiązywania
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Dodaj wykaz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingWykaz ? 'Edytuj wykaz' : 'Dodaj nowy wykaz'}
              </DialogTitle>
              <DialogDescription>
                Ustaw daty publikacji i obowiązywania wykazu MEiN
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year_id">Identyfikator roku *</Label>
                  <Input
                    id="year_id"
                    placeholder="np. 2024, 2023-v2"
                    value={yearIdentifier}
                    onChange={(e) => setYearIdentifier(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Wersja wykazu *</Label>
                  <Select value={wykazVersion} onValueChange={(v) => setWykazVersion(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pełny wykaz">Pełny wykaz</SelectItem>
                      <SelectItem value="Zmiana / sprostowanie">Zmiana / sprostowanie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data publikacji *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !publishedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {publishedDate ? format(publishedDate, "dd MMMM yyyy", { locale: pl }) : "Wybierz datę"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={publishedDate}
                        onSelect={setPublishedDate}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Obowiązuje od *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !validFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {validFrom ? format(validFrom, "dd MMMM yyyy", { locale: pl }) : "Wybierz datę"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={validFrom}
                        onSelect={setValidFrom}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notatki</Label>
                <Textarea
                  id="notes"
                  placeholder="Dodatkowe informacje o wykazie..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingWykaz ? 'Zapisz zmiany' : 'Dodaj wykaz'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identyfikator</TableHead>
                <TableHead>Data publikacji</TableHead>
                <TableHead>Obowiązuje</TableHead>
                <TableHead>Wersja</TableHead>
                <TableHead>Czasopism</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wykazy.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Brak wykazów
                  </TableCell>
                </TableRow>
              ) : (
                wykazy.map((wykaz) => (
                  <TableRow key={wykaz.id}>
                    <TableCell className="font-medium">{wykaz.year_identifier}</TableCell>
                    <TableCell>
                      {format(new Date(wykaz.published_date), 'dd.MM.yyyy', { locale: pl })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(wykaz.valid_from), 'dd.MM.yyyy', { locale: pl })}
                      {' → '}
                      {wykaz.valid_to ? format(new Date(wykaz.valid_to), 'dd.MM.yyyy', { locale: pl }) : 'obecnie'}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        wykaz.wykaz_version === "Pełny wykaz"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      )}>
                        {wykaz.wykaz_version}
                      </span>
                    </TableCell>
                    <TableCell>{wykaz.journal_count || 0}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(wykaz)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(wykaz)}
                        disabled={(wykaz.journal_count || 0) > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};
