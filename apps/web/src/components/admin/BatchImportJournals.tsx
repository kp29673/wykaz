import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle2, XCircle, FileSpreadsheet, Calendar as CalendarIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { useEffect } from "react";

interface BatchImportResult {
  imported: number;
  failed: number;
  total: number;
  zero_points_created?: number;
  error_details?: Array<{
    title: string;
    success: boolean;
    error?: string;
    issn?: string;
    journal_id?: string;
  }>;
  error_breakdown?: {
    empty_title: number;
    missing_issn: number;
    duplicates_removed: number;
    parse_error: number;
  };
}

interface ParsedJournal {
  id: string;
  title: string;
  issn: string;
  points: number;
  disciplines: string;
}

export const BatchImportJournals = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchImportResult | null>(null);
  const [wykazy, setWykazy] = useState<Array<{ id: string; year_identifier: string; published_date: string; wykaz_version: string }>>([]);
  const [selectedWykaz, setSelectedWykaz] = useState<string>("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedJournal[]>([]);
  const [pendingImport, setPendingImport] = useState<ParsedJournal[] | null>(null);

  useEffect(() => {
    fetchWykazy();
  }, []);

  const fetchWykazy = async () => {
    const { data } = await supabase
      .from('wykazy_metadata')
      .select('id, year_identifier, published_date, wykaz_version')
      .order('published_date', { ascending: false });
    
    if (data) {
      setWykazy(data);
      if (data.length > 0 && !selectedWykaz) {
        setSelectedWykaz(data[0].id);
      }
    }
  };

  const parseCSVData = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 3) return [];

    // Parse headers (row 1 - discipline names, starting from column 8)
    const disciplineHeaders = lines[0].split(';').slice(8);
    
    console.log('=== CSV PARSER DEBUG ===');
    console.log('Discipline headers (first 5):', disciplineHeaders.slice(0, 5));
    
    // Parse column names (row 2)
    const columnHeaders = lines[1].split(';');
    
    const journals = [];
    let skipped = 0;
    let skippedReasons: string[] = [];
    
    // Parse data rows (starting from row 3)
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i].split(';');
      
      if (cells.length < 8) continue;
      
      const lp = cells[0]?.trim();
      const title1 = cells[1]?.trim();
      const issn1 = cells[2]?.trim();
      const eissn1 = cells[3]?.trim();
      const title2 = cells[4]?.trim();
      const issn2 = cells[5]?.trim();
      const eissn2 = cells[6]?.trim();
      const points = cells[7]?.trim();
      
      // Choose title (Tytuł 1 has priority, fallback to Tytuł 2)
      const title = title1 || title2;
      const issnPrint = issn1 || issn2;
      const issnElectronic = eissn1 || eissn2;
      
      if (!title) {
        skipped++;
        skippedReasons.push(`Wiersz ${i + 1}: brak tytułu`);
        continue;
      }
      
      const parsedPoints = parseInt(points) || 0;
      
      // Extract disciplines (columns with 'x' marks, starting from column 8)
      const disciplines: string[] = [];
      for (let j = 8; j < cells.length && j - 8 < disciplineHeaders.length; j++) {
        if (cells[j]?.trim().toLowerCase() === 'x') {
          const disciplineName = disciplineHeaders[j - 8]?.trim();
          if (disciplineName) {
            disciplines.push(disciplineName);
          }
        }
      }
      
      journals.push({
        id: lp || `generated_${i}`,
        title,
        issn: `${issnPrint || ''} ${issnElectronic || ''}`.trim(),
        points: parsedPoints,
        disciplines: disciplines.join('; ')
      });
    }
    
    if (journals.length > 0) {
      console.log('First 3 journals parsed:');
      journals.slice(0, 3).forEach((j, i) => {
        console.log(`${i + 1}. ${j.title} | ISSN: ${j.issn} | Punkty: ${j.points} | Dyscypliny: ${j.disciplines}`);
      });
    }
    
    console.log(`Parsed ${journals.length} journals. Skipped ${skipped} rows.`);
    if (skippedReasons.length > 0) {
      console.warn('Skipped reasons:', skippedReasons.slice(0, 10));
    }
    
    return journals;
  };

  const parseExcelData = (arrayBuffer: ArrayBuffer): ParsedJournal[] => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    console.log('=== EXCEL STRUCTURE DEBUG ===');
    console.log('Total rows:', data.length);
    
    if (data.length < 3) {
      console.error('Not enough rows in Excel file');
      return [];
    }
    
    // STEP 1: Dynamically find header row (search first 15 rows)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(data.length, 15); i++) {
      const row = data[i];
      if (row && row.some(cell => cell?.toString().toLowerCase().includes('tytuł')) 
          && row.some(cell => cell?.toString().toLowerCase() === 'issn')) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Nie znaleziono wiersza nagłówków w pliku Excel. Oczekiwano kolumn: Tytuł, ISSN');
    }
    
    const headerRow = data[headerRowIndex].map(h => h?.toString().toLowerCase().trim() || '');
    const dataStartRow = headerRowIndex + 1;
    const disciplineHeaderRow = headerRowIndex > 0 ? headerRowIndex - 1 : 0;
    
    console.log(`=== DETECTED HEADER ROW: ${headerRowIndex} ===`);
    console.log('Header row:', data[headerRowIndex]);
    console.log('Data starts at row:', dataStartRow);
    
    // STEP 2: Dynamically detect columns (without requiring numbers)
    let firstIssnIdx = -1;
    let firstEissnIdx = -1;
    
    const colLp = headerRow.findIndex(h => h === 'lp.' || h === 'lp');
    const colUnikalnyId = headerRow.findIndex(h => h.includes('unikatowy') || h.includes('identyfikator'));
    
    const colTitle1 = headerRow.findIndex(h => 
      h.includes('tytuł') && (h.includes('1') || (!h.includes('2') && firstIssnIdx === -1))
    );
    
    // First ISSN (without e-)
    const colISSN1 = headerRow.findIndex((h, idx) => {
      if (h === 'issn' && idx > colTitle1) {
        if (firstIssnIdx === -1) {
          firstIssnIdx = idx;
          return true;
        }
      }
      return false;
    });
    
    // First e-ISSN
    const colEISSN1 = headerRow.findIndex((h, idx) => {
      if ((h === 'e-issn' || h.includes('e issn')) && idx > colISSN1) {
        if (firstEissnIdx === -1) {
          firstEissnIdx = idx;
          return true;
        }
      }
      return false;
    });
    
    const colTitle2 = headerRow.findIndex((h, idx) => 
      idx > colTitle1 && h.includes('tytuł') && (h.includes('2') || idx > colEISSN1)
    );
    
    // Second ISSN (after first e-issn)
    const colISSN2 = headerRow.findIndex((h, idx) => 
      idx > colEISSN1 && h === 'issn'
    );
    
    // Second e-ISSN
    const colEISSN2 = headerRow.findIndex((h, idx) => 
      idx > colISSN2 && (h === 'e-issn' || h.includes('e issn'))
    );
    
    // Points/Punktacja
    const colPoints = headerRow.findIndex(h => 
      h.includes('punkt') || h === 'pkt'
    );
    
    console.log('=== DETECTED COLUMNS ===');
    console.log({ colLp, colUnikalnyId, colTitle1, colISSN1, colEISSN1, colTitle2, colISSN2, colEISSN2, colPoints });
    
    // STEP 3: Set fallback indices for 2019 (row 8) vs 2024 (row 6) wykazy
    // 2019 structure (header at row 8): Lp.|Tytuł 1|issn|e-issn|Tytuł 2|issn|e-issn|Punkty|disciplines...
    // 2024 structure (header at row 6): Lp.|Unikalny ID|Tytuł 1|issn|e-issn|Tytuł 2|issn|e-issn|Punktacja|disciplines...
    const useFallback = colTitle1 === -1 || colPoints === -1;
    
    let fallbackTitle1: number, fallbackISSN1: number, fallbackEISSN1: number;
    let fallbackTitle2: number, fallbackISSN2: number, fallbackEISSN2: number;
    let fallbackPoints: number, fallbackDisciplineStart: number;
    
    if (colUnikalnyId !== -1) {
      // 2024 format: has Unikalny ID column
      fallbackTitle1 = 2;
      fallbackISSN1 = 3;
      fallbackEISSN1 = 4;
      fallbackTitle2 = 5;
      fallbackISSN2 = 6;
      fallbackEISSN2 = 7;
      fallbackPoints = 8;
      fallbackDisciplineStart = 9;
    } else {
      // 2019 format: no Unikalny ID column
      fallbackTitle1 = 1;
      fallbackISSN1 = 2;
      fallbackEISSN1 = 3;
      fallbackTitle2 = 4;
      fallbackISSN2 = 5;
      fallbackEISSN2 = 6;
      fallbackPoints = 7;
      fallbackDisciplineStart = 8;
    }
    
    if (useFallback) {
      console.warn('⚠️ Dynamic column detection failed. Using fallback indices:', {
        title1: fallbackTitle1, issn1: fallbackISSN1, eissn1: fallbackEISSN1,
        title2: fallbackTitle2, issn2: fallbackISSN2, eissn2: fallbackEISSN2,
        points: fallbackPoints, disciplineStart: fallbackDisciplineStart
      });
    }
    
    // Discipline headers (from row above main header, starting after main columns)
    const disciplineStartCol = useFallback 
      ? fallbackDisciplineStart 
      : Math.max(...[colTitle1, colTitle2, colISSN1, colISSN2, colEISSN1, colEISSN2, colPoints].filter(idx => idx !== -1)) + 1;
    
    const disciplineHeaders = data[disciplineHeaderRow]?.slice(disciplineStartCol) || [];
    
    console.log(`Discipline headers start at column ${disciplineStartCol}:`, disciplineHeaders.slice(0, 5));
    
    const journals: ParsedJournal[] = [];
    let skipped = 0;
    let skippedReasons: string[] = [];
    
    // STEP 4: Parse data rows (starting from row after header)
    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;
      
      // Use detected or fallback column indices
      const lp = colLp !== -1 ? row[colLp]?.toString().trim() : row[0]?.toString().trim();
      const unikalnyId = colUnikalnyId !== -1 ? row[colUnikalnyId]?.toString().trim() : '';
      
      const title1 = useFallback 
        ? row[fallbackTitle1]?.toString().trim() 
        : (colTitle1 !== -1 ? row[colTitle1]?.toString().trim() : '');
      const issn1 = useFallback 
        ? row[fallbackISSN1]?.toString().trim() 
        : (colISSN1 !== -1 ? row[colISSN1]?.toString().trim() : '');
      const eissn1 = useFallback 
        ? row[fallbackEISSN1]?.toString().trim() 
        : (colEISSN1 !== -1 ? row[colEISSN1]?.toString().trim() : '');
      const title2 = useFallback 
        ? row[fallbackTitle2]?.toString().trim() 
        : (colTitle2 !== -1 ? row[colTitle2]?.toString().trim() : '');
      const issn2 = useFallback 
        ? row[fallbackISSN2]?.toString().trim() 
        : (colISSN2 !== -1 ? row[colISSN2]?.toString().trim() : '');
      const eissn2 = useFallback 
        ? row[fallbackEISSN2]?.toString().trim() 
        : (colEISSN2 !== -1 ? row[colEISSN2]?.toString().trim() : '');
      const points = useFallback 
        ? row[fallbackPoints]?.toString().trim() 
        : (colPoints !== -1 ? row[colPoints]?.toString().trim() : '');
      
      const title = title1 || title2;
      const issnPrint = issn1 || issn2;
      const issnElectronic = eissn1 || eissn2;
      
      // Validation: skip if no title
      if (!title || title === 'undefined' || title.length < 2) {
        skipped++;
        skippedReasons.push(`Wiersz ${i + 1}: brak tytułu lub tytuł nieprawidłowy`);
        continue;
      }
      
      // Validation: check if title looks like a number (indicates wrong column mapping)
      if (/^\d+$/.test(title)) {
        skipped++;
        skippedReasons.push(`Wiersz ${i + 1}: tytuł wygląda jak numer (${title}) - błąd mapowania kolumn`);
        continue;
      }
      
      const parsedPoints = parseInt(points) || 0;
      
      // Extract disciplines (columns with 'x' mark)
      const disciplines: string[] = [];
      for (let j = disciplineStartCol; j < row.length && j - disciplineStartCol < disciplineHeaders.length; j++) {
        const cellValue = row[j]?.toString().trim().toLowerCase();
        if (cellValue === 'x') {
          const disciplineName = disciplineHeaders[j - disciplineStartCol]?.toString().trim();
          if (disciplineName && disciplineName !== 'undefined' && disciplineName.length > 0) {
            disciplines.push(disciplineName);
          }
        }
      }
      
      // Create journal record
      // CRITICAL: Use ISSN as journal_id (primary key) for proper history tracking
      const primaryIssn = issnPrint || issnElectronic;
      const journalId = primaryIssn || unikalnyId || lp || `generated_${i}`;
      
      journals.push({
        id: journalId,
        title,
        issn: `${issnPrint || ''} ${issnElectronic || ''}`.trim(),
        points: parsedPoints,
        disciplines: disciplines.join('; ')
      });
    }
    
    console.log(`✅ Parsed ${journals.length} journals from Excel. Skipped ${skipped} rows.`);
    
    // STEP 5: Validate parsed data (sample first 10 journals)
    const issnPattern = /\d{4}-\d{3}[\dXx]/;
    const sample = journals.slice(0, 10);
    let invalidTitleCount = 0;
    let invalidISSNCount = 0;
    
    for (const j of sample) {
      // Check title validity
      if (!j.title || j.title.length < 3 || /^\d+$/.test(j.title)) {
        console.error(`⚠️ Invalid title: "${j.title}"`);
        invalidTitleCount++;
      }
      
      // Check ISSN format
      if (j.issn) {
        const issnParts = j.issn.split(' ').filter(s => s.length > 0);
        let hasValidISSN = false;
        for (const part of issnParts) {
          if (issnPattern.test(part)) {
            hasValidISSN = true;
            break;
          }
        }
        if (!hasValidISSN && issnParts.length > 0) {
          console.warn(`⚠️ Invalid ISSN format: "${j.issn}" for journal: ${j.title}`);
          invalidISSNCount++;
        }
      }
    }
    
    // If more than 50% of sample has invalid data, throw error
    if (invalidTitleCount > 5) {
      throw new Error(
        `❌ KRYTYCZNY BŁĄD: Wykryto ${invalidTitleCount} nieprawidłowych tytułów w próbce 10 czasopism. ` +
        `Sprawdź strukturę pliku Excel. Możliwe że kolumny są źle wykryte. ` +
        `Oczekiwane kolumny: Lp, Tytuł, ISSN, e-ISSN, Punkty/Punktacja.`
      );
    }
    
    if (invalidISSNCount > 5) {
      console.error('❌ OSTRZEŻENIE: Ponad 50% próbki ma nieprawidłowy format ISSN!');
      console.error('To może oznaczać błędne mapowanie kolumn. Sprawdź strukturę Excel.');
    }
    
    // Log first 3 parsed journals for verification
    if (journals.length > 0) {
      console.log('=== FIRST 3 PARSED JOURNALS ===');
      journals.slice(0, 3).forEach((j, i) => {
        console.log(`${i + 1}. ${j.title.substring(0, 60)} | ISSN: ${j.issn} | Punkty: ${j.points} | Dyscypliny: ${j.disciplines.substring(0, 50)}`);
      });
    }
    
    if (skippedReasons.length > 0) {
      console.warn('Pominięte wiersze (pierwsze 10):', skippedReasons.slice(0, 10));
    }
    
    return journals;
  };

  const startImport = async (journals: ParsedJournal[]) => {
    const startTime = Date.now();
    setIsImporting(true);
    setProgress(0);
    setResults(null);
    setParsedPreview([]);
    setPendingImport(null);

    try {
      toast.success(`Rozpoczynam import ${journals.length} czasopism...`);

      // Import in batches of 500 (increased from 50)
      const batchSize = 500;
      let totalImported = 0;
      let totalFailed = 0;
      let totalZeroPointsCreated = 0;

      const importBatchWithRetry = async (batch: any[], batchIndex: number, retries = 3) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const { data, error } = await supabase.functions.invoke('import-mein-journals', {
              body: { 
                journals: batch,
                wykaz_id: selectedWykaz,
                replace_existing: replaceExisting && batchIndex === 0 // Only first batch if flag set
              }
            });

            if (error) throw error;
            return data;
          } catch (err) {
            console.error(`Batch ${batchIndex + 1} attempt ${attempt}/${retries} failed:`, err);
            if (attempt === retries) throw err;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      };

      for (let i = 0; i < journals.length; i += batchSize) {
        const batch = journals.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize);
        
        try {
          const data = await importBatchWithRetry(batch, batchIndex);
          console.log(`✅ Batch ${batchIndex + 1}: imported ${data.imported}, failed ${data.failed}`);
          totalImported += data.imported || 0;
          totalFailed += data.failed || 0;
          totalZeroPointsCreated += data.zero_points_created || 0;
        } catch (err) {
          console.error(`❌ CRITICAL: Batch ${batchIndex + 1} failed after retries:`, err);
          totalFailed += batch.length;
        }

        setProgress(Math.round(((i + batchSize) / journals.length) * 100));
      }

      const elapsedSeconds = (Date.now() - startTime) / 1000;

      console.log('=== IMPORT SUMMARY ===');
      console.log(`📄 Parsed from Excel: ${journals.length}`);
      console.log(`✅ Imported to DB: ${totalImported}`);
      console.log(`❌ Failed: ${totalFailed}`);
      console.log(`🔄 Zero-point records: ${totalZeroPointsCreated}`);
      console.log(`⏱️ Time: ${elapsedSeconds.toFixed(1)}s`);
      console.log(`🚀 Speed: ${(totalImported / elapsedSeconds).toFixed(0)} journals/sec`);
      console.log(`📊 Success rate: ${((totalImported / journals.length) * 100).toFixed(1)}%`);

      if (totalImported < journals.length * 0.95) {
        console.warn(`⚠️ UWAGA: Zaimportowano tylko ${totalImported}/${journals.length}!`);
      }

      setResults({
        imported: totalImported,
        failed: totalFailed,
        total: journals.length,
        zero_points_created: totalZeroPointsCreated
      });

      if (totalImported > 0) {
        toast.success(`Import zakończony! Zaimportowano ${totalImported}/${journals.length} czasopism w ${elapsedSeconds.toFixed(1)}s`);
      } else {
        toast.error("Import nie powiódł się. Sprawdź console.log dla szczegółów.");
      }
    } catch (error) {
      console.error('Error during import:', error);
      toast.error("Błąd podczas importu: " + (error as Error).message);
    } finally {
      setIsImporting(false);
      setProgress(100);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let journals: ParsedJournal[] = [];
      const fileName = file.name.toLowerCase();
      
      // Parse based on file type
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        journals = parseCSVData(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        journals = parseExcelData(arrayBuffer);
      } else if (fileName.endsWith('.pdf')) {
        toast.error("Pliki PDF wymagają ręcznego przetworzenia. Użyj CSV lub Excel.");
        return;
      } else {
        toast.error("Nieobsługiwany format pliku. Użyj CSV lub Excel.");
        return;
      }
      
      console.log(`📄 Parsed ${journals.length} journals from ${fileName}`);
      
      if (journals.length === 0) {
        toast.error("Nie znaleziono czasopism w pliku. Sprawdź format lub console.log dla szczegółów.");
        return;
      }

      // Show preview
      setParsedPreview(journals.slice(0, 5));
      setPendingImport(journals);
      toast.success(`Znaleziono ${journals.length} czasopism. Sprawdź podgląd poniżej.`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error("Błąd podczas parsowania pliku: " + (error as Error).message);
    }
  };

  const selectedWykazLabel = wykazy.find(w => w.id === selectedWykaz)?.year_identifier || 'wykazu';

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Batch Import Czasopism MEiN</h2>
      
      <div className="space-y-4">
        <div>
          <div className="mb-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Wybierz wykaz MEiN</label>
              <Select value={selectedWykaz} onValueChange={setSelectedWykaz}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Wybierz wykaz..." />
                </SelectTrigger>
                <SelectContent>
                  {wykazy.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.year_identifier} ({format(new Date(w.published_date), 'dd.MM.yyyy')}) - {w.wykaz_version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="replace-existing" 
                checked={replaceExisting} 
                onCheckedChange={(checked) => setReplaceExisting(checked as boolean)}
                disabled={isImporting}
              />
              <Label 
                htmlFor="replace-existing" 
                className="text-sm font-normal cursor-pointer"
              >
                Zastąp wszystkie istniejące dane dla wybranego wykazu ({selectedWykazLabel})
              </Label>
            </div>
            
            <p className="text-muted-foreground text-sm">
              Wgraj plik z wykazu czasopism MEiN w formacie CSV lub Excel (XLSX/XLS).
            </p>
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <FileSpreadsheet className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium mb-1">Wymagany format:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Wiersz 1: nagłówki dyscyplin</li>
                  <li>Wiersz 2: nazwy kolumn (Lp., ID, Tytuł, ISSN, e-ISSN, Punktacja)</li>
                  <li>Wiersze 3+: dane czasopism z oznaczeniami "x" w kolumnach dyscyplin</li>
                </ul>
              </div>
            </div>
          </div>
          
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isImporting}
            className="hidden"
            id="file-upload"
          />
          
          <label htmlFor="file-upload">
            <Button
              disabled={isImporting}
              asChild
              variant="default"
            >
              <span>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importowanie...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Wybierz plik (CSV/Excel)
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>

        {parsedPreview.length > 0 && !isImporting && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
              📋 Podgląd pierwszych 5 rekordów:
            </h3>
            <div className="space-y-3 mb-4">
              {parsedPreview.map((j, i) => (
                <div key={i} className="text-sm p-3 bg-background rounded border">
                  <p className="font-medium text-foreground">{j.title}</p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <p>ISSN: {j.issn || 'brak'}</p>
                    <p>Punkty: {j.points}</p>
                    {j.disciplines && <p>Dyscypliny: {j.disciplines.substring(0, 100)}{j.disciplines.length > 100 ? '...' : ''}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => pendingImport && startImport(pendingImport)}
                variant="default"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Potwierdź i importuj ({pendingImport?.length} czasopism)
              </Button>
              <Button 
                onClick={() => {
                  setParsedPreview([]);
                  setPendingImport(null);
                }}
                variant="outline"
              >
                Anuluj
              </Button>
            </div>
          </Card>
        )}

        {isImporting && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">{progress}%</p>
          </div>
        )}

        {results && (
          <Card className="p-4 bg-muted/50">
            <h3 className="font-semibold mb-3">Wyniki importu:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Zaimportowano: <strong>{results.imported}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>Błędy: <strong>{results.failed}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span>Łącznie przetworzonych: <strong>{results.total}</strong></span>
              </div>
              {results.zero_points_created !== undefined && results.zero_points_created > 0 && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <span>Utworzono rekordów z 0 pkt: <strong>{results.zero_points_created}</strong></span>
                </div>
              )}
              
              {results.error_breakdown && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-semibold mb-2 text-muted-foreground">Szczegóły błędów:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {results.error_breakdown.empty_title > 0 && (
                      <div>Puste tytuły: <strong>{results.error_breakdown.empty_title}</strong></div>
                    )}
                    {results.error_breakdown.missing_issn > 0 && (
                      <div>Brak ISSN: <strong>{results.error_breakdown.missing_issn}</strong></div>
                    )}
                    {results.error_breakdown.duplicates_removed > 0 && (
                      <div>Usunięte duplikaty: <strong>{results.error_breakdown.duplicates_removed}</strong></div>
                    )}
                    {results.error_breakdown.parse_error > 0 && (
                      <div>Błędy parsowania: <strong>{results.error_breakdown.parse_error}</strong></div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error details section */}
            {results.error_details && results.error_details.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">
                  Szczegóły błędów (pierwsze 10):
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.error_details.map((err, i) => (
                    <div key={i} className="text-sm p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="font-medium text-foreground">{err.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ISSN: {err.issn || 'brak'} | ID: {err.journal_id || 'brak'}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Błąd: {err.error}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </Card>
  );
};
