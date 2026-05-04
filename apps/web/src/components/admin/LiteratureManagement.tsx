import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, X, BookOpen, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Literature {
  id: string;
  type: 'BASIC' | 'SUPPLEMENTARY';
  title: string;
  authors: string | null;
  year: number | null;
  publisher: string | null;
  isbn: string | null;
  doi: string | null;
  url: string | null;
  cover_url: string | null;
  item_category: 'BOOK' | 'ARTICLE' | 'LEGAL_ACT' | null;
  legal_act_data: any | null;
}

interface LiteratureManagementProps {
  courseId: string;
}

export const LiteratureManagement = ({ courseId }: LiteratureManagementProps) => {
  const [literature, setLiterature] = useState<Literature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isbnSearch, setIsbnSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [formData, setFormData] = useState({
    type: 'BASIC' as 'BASIC' | 'SUPPLEMENTARY',
    item_category: 'BOOK' as 'BOOK' | 'ARTICLE' | 'LEGAL_ACT',
    title: '',
    authors: '',
    year: '',
    publisher: '',
    isbn: '',
    doi: '',
    url: '',
    cover_url: '',
    // Legal act specific fields
    act_number: '',
    act_date: '',
    journal_year: '',
    journal_number: '',
    journal_position: '',
    isap_url: '',
  });

  useEffect(() => {
    fetchLiterature();
  }, [courseId]);

  const fetchLiterature = async () => {
    try {
      const { data, error } = await supabase
        .from('literature_items')
        .select('*')
        .eq('course_id', courseId)
        .order('title');

      if (error) throw error;
      setLiterature((data || []) as Literature[]);
    } catch (error) {
      console.error('Error fetching literature:', error);
      toast.error('Błąd pobierania literatury');
    } finally {
      setLoading(false);
    }
  };

  const validateISBN = (isbn: string): boolean => {
    const cleaned = isbn.replace(/[-\s]/g, '');
    
    if (cleaned.length === 10) {
      // ISBN-10 checksum
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        const digit = parseInt(cleaned[i]);
        if (isNaN(digit)) return false;
        sum += digit * (10 - i);
      }
      const checkChar = cleaned[9].toUpperCase();
      const check = checkChar === 'X' ? 10 : parseInt(checkChar);
      if (isNaN(check) && checkChar !== 'X') return false;
      return (sum + check) % 11 === 0;
    } else if (cleaned.length === 13) {
      // ISBN-13 checksum
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(cleaned[i]);
        if (isNaN(digit)) return false;
        sum += digit * (i % 2 === 0 ? 1 : 3);
      }
      const check = parseInt(cleaned[12]);
      if (isNaN(check)) return false;
      return (10 - (sum % 10)) % 10 === check;
    }
    return false;
  };

  const getBookCover = async (isbn: string): Promise<string | null> => {
    // Try Open Library covers first (best quality)
    const olCover = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    try {
      const response = await fetch(olCover, { method: 'HEAD' });
      if (response.ok) return olCover;
    } catch (e) {
      console.log('Open Library cover not found');
    }

    // Try Google Books
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      if (data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
        return data.items[0].volumeInfo.imageLinks.thumbnail.replace('http://', 'https://');
      }
    } catch (e) {
      console.log('Google Books cover not found');
    }

    return null;
  };

  const searchGoogleBooks = async (isbn: string) => {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );

    if (!response.ok) {
      throw new Error('Google Books API error');
    }

    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo;
      const coverUrl = await getBookCover(isbn);
      return {
        title: book.title || '',
        authors: book.authors?.join(', ') || '',
        year: book.publishedDate ? book.publishedDate.match(/\d{4}/)?.[0] || '' : '',
        publisher: book.publisher || '',
        isbn: isbn,
        url: book.infoLink || '',
        cover_url: coverUrl || '',
      };
    }
    return null;
  };

  const searchOpenLibrary = async (isbn: string) => {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Open Library API error');
    }

    const data = await response.json();
    const bookData = data[`ISBN:${isbn}`];

    if (bookData && Object.keys(bookData).length > 0) {
      const publishDate = bookData.publish_date || '';
      let year = '';
      
      if (publishDate) {
        const yearMatch = publishDate.match(/\d{4}/);
        year = yearMatch ? yearMatch[0] : '';
      }

      const coverUrl = await getBookCover(isbn);

      return {
        title: bookData.title || '',
        authors: bookData.authors?.map((a: any) => a.name).join(', ') || '',
        year: year,
        publisher: bookData.publishers?.[0]?.name || '',
        isbn: isbn,
        url: bookData.url || '',
        cover_url: coverUrl || '',
      };
    }
    return null;
  };

  const searchDOI = async (doi: string) => {
    try {
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (!response.ok) throw new Error('CrossRef API error');
      
      const data = await response.json();
      const work = data.message;
      
      return {
        title: work.title?.[0] || '',
        authors: work.author?.map((a: any) => `${a.given} ${a.family}`).join(', ') || '',
        year: work.published?.['date-parts']?.[0]?.[0]?.toString() || '',
        publisher: work.publisher || '',
        doi: doi,
        url: work.URL || `https://doi.org/${doi}`,
      };
    } catch (error) {
      console.error('Error searching DOI:', error);
      return null;
    }
  };

  const searchISBN = async () => {
    if (!isbnSearch.trim()) {
      toast.error('Wprowadź ISBN/EAN');
      return;
    }
    
    setSearching(true);
    try {
      const isbn = isbnSearch.replace(/[-\s]/g, '');
      
      if (isbn.length !== 10 && isbn.length !== 13) {
        toast.error('ISBN/EAN musi mieć 10 lub 13 cyfr');
        setSearching(false);
        return;
      }

      if (!validateISBN(isbn)) {
        toast.error('Nieprawidłowa suma kontrolna ISBN/EAN');
        setSearching(false);
        return;
      }

      // Try Open Library first
      toast.info('Szukam w Open Library...');
      let bookData = await searchOpenLibrary(isbn);

      // If not found, try Google Books
      if (!bookData) {
        toast.info('Szukam w Google Books...');
        bookData = await searchGoogleBooks(isbn);
      }

      if (bookData) {
        setFormData({
          ...formData,
          item_category: 'BOOK',
          ...bookData,
          isbn: isbnSearch, // Keep original format with dashes
        });
        toast.success('Dane książki i okładka pobrane automatycznie');
      } else {
        // Fill ISBN field and suggest manual entry
        setFormData({
          ...formData,
          isbn: isbnSearch,
        });
        toast.error('Nie znaleziono książki. Wypełnij pozostałe pola ręcznie.');
      }
    } catch (error) {
      console.error('Error searching ISBN:', error);
      setFormData({
        ...formData,
        isbn: isbnSearch,
      });
      toast.error('Błąd wyszukiwania. Wypełnij dane ręcznie.');
    } finally {
      setSearching(false);
    }
  };

  const parseISAPUrl = async (url: string) => {
    if (!url.trim()) {
      toast.error('Wprowadź link do ISAP');
      return;
    }

    setSearching(true);
    try {
      // Call edge function to parse ISAP URL
      toast.info('Pobieranie danych z ISAP...');
      
      const { data, error } = await supabase.functions.invoke('parse-isap', {
        body: { url }
      });

      if (error) throw error;

      if (data && data.title) {
        setFormData({
          ...formData,
          item_category: 'LEGAL_ACT',
          title: data.title,
          year: data.year,
          isap_url: url,
          journal_year: data.journal_year,
          journal_number: data.journal_number,
        });
        toast.success('Dane ustawy pobrane z ISAP');
      } else {
        toast.error('Nie udało się pobrać danych z ISAP');
      }
    } catch (error) {
      console.error('Error parsing ISAP URL:', error);
      toast.error('Błąd pobierania danych z ISAP');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const litData: any = {
        course_id: courseId,
        type: formData.type,
        item_category: formData.item_category,
        title: formData.title,
        authors: formData.authors || null,
        year: formData.year ? parseInt(formData.year) : null,
        publisher: formData.publisher || null,
        isbn: formData.isbn || null,
        doi: formData.doi || null,
        url: formData.url || null,
        cover_url: formData.cover_url || null,
      };

      if (formData.item_category === 'LEGAL_ACT') {
        litData.legal_act_data = {
          act_number: formData.act_number,
          act_date: formData.act_date,
          journal_year: formData.journal_year,
          journal_number: formData.journal_number,
          journal_position: formData.journal_position,
          isap_url: formData.isap_url,
        };
      }

      if (editingId) {
        const { error } = await supabase
          .from('literature_items')
          .update(litData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Pozycja zaktualizowana');
      } else {
        const { error } = await supabase
          .from('literature_items')
          .insert(litData);

        if (error) throw error;
        toast.success('Pozycja dodana');
      }

      fetchLiterature();
      resetForm();
    } catch (error) {
      console.error('Error saving literature:', error);
      toast.error('Błąd zapisu');
    }
  };

  const handleEdit = (item: Literature) => {
    setEditingId(item.id);
    const legalActData = item.legal_act_data || {};
    setFormData({
      type: item.type,
      item_category: item.item_category || 'BOOK',
      title: item.title,
      authors: item.authors || '',
      year: item.year?.toString() || '',
      publisher: item.publisher || '',
      isbn: item.isbn || '',
      doi: item.doi || '',
      url: item.url || '',
      cover_url: item.cover_url || '',
      act_number: legalActData.act_number || '',
      act_date: legalActData.act_date || '',
      journal_year: legalActData.journal_year || '',
      journal_number: legalActData.journal_number || '',
      journal_position: legalActData.journal_position || '',
      isap_url: legalActData.isap_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno usunąć tę pozycję?')) return;

    try {
      const { error } = await supabase
        .from('literature_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Pozycja usunięta');
      fetchLiterature();
    } catch (error) {
      console.error('Error deleting literature:', error);
      toast.error('Błąd usuwania');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'BASIC',
      item_category: 'BOOK',
      title: '',
      authors: '',
      year: '',
      publisher: '',
      isbn: '',
      doi: '',
      url: '',
      cover_url: '',
      act_number: '',
      act_date: '',
      journal_year: '',
      journal_number: '',
      journal_position: '',
      isap_url: '',
    });
    setEditingId(null);
    setShowForm(false);
    setIsbnSearch('');
  };

  const basicLiterature = literature.filter((item) => item.type === 'BASIC');
  const supplementaryLiterature = literature.filter((item) => item.type === 'SUPPLEMENTARY');

  if (loading) {
    return <div className="text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Literatura kursu</h3>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj pozycję
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">
              {editingId ? 'Edytuj pozycję' : 'Nowa pozycja'}
            </h4>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Label htmlFor="item_category">Kategoria *</Label>
            <select
              id="item_category"
              value={formData.item_category}
              onChange={(e) => setFormData({ ...formData, item_category: e.target.value as any })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="BOOK">Książka</option>
              <option value="ARTICLE">Artykuł naukowy</option>
              <option value="LEGAL_ACT">Ustawa polska</option>
            </select>
          </div>

          {formData.item_category === 'BOOK' && (
            <div className="p-4 bg-muted rounded-lg">
              <Label>Wyszukaj po ISBN / EAN</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={isbnSearch}
                  onChange={(e) => setIsbnSearch(e.target.value)}
                  placeholder="978-83-8107-689-0 lub 9788381076890"
                  onKeyDown={(e) => e.key === 'Enter' && searchISBN()}
                />
                <Button onClick={searchISBN} disabled={searching} variant="secondary" className="gap-2">
                  <Search className="h-4 w-4" />
                  {searching ? 'Szukam...' : 'Szukaj'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                📚 Automatycznie pobiera dane i okładkę książki (ISBN lub EAN-13)
              </p>
            </div>
          )}

          {formData.item_category === 'LEGAL_ACT' && (
            <div className="p-4 bg-muted rounded-lg mb-4">
              <Label>Wklej link z ISAP</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                ⚖️ Wklej link do ustawy z portalu ISAP (np. https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU...)
              </p>
              <div className="flex gap-2">
                <Input
                  value={formData.isap_url}
                  onChange={(e) => setFormData({ ...formData, isap_url: e.target.value })}
                  placeholder="https://isap.sejm.gov.pl/isap.nsf/..."
                  onKeyDown={(e) => e.key === 'Enter' && parseISAPUrl(formData.isap_url)}
                />
                <Button 
                  onClick={() => parseISAPUrl(formData.isap_url)} 
                  disabled={searching || !formData.isap_url} 
                  variant="secondary" 
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  {searching ? 'Pobieram...' : 'Pobierz'}
                </Button>
              </div>
            </div>
          )}

          {formData.item_category === 'ARTICLE' && (
            <div className="p-4 bg-muted rounded-lg">
              <Label>Wyszukaj po DOI</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={formData.doi}
                  onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                  placeholder="10.1234/example.doi"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && formData.doi) {
                      setSearching(true);
                      const data = await searchDOI(formData.doi);
                      if (data) {
                        setFormData({ ...formData, ...data });
                        toast.success('Dane artykułu wypełnione');
                      } else {
                        toast.error('Nie znaleziono artykułu');
                      }
                      setSearching(false);
                    }
                  }}
                />
                <Button 
                  onClick={async () => {
                    if (!formData.doi) {
                      toast.error('Wprowadź DOI');
                      return;
                    }
                    setSearching(true);
                    const data = await searchDOI(formData.doi);
                    if (data) {
                      setFormData({ ...formData, ...data });
                      toast.success('Dane artykułu wypełnione');
                    } else {
                      toast.error('Nie znaleziono artykułu');
                    }
                    setSearching(false);
                  }}
                  disabled={searching} 
                  variant="secondary" 
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  {searching ? 'Szukam...' : 'Szukaj'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                📄 Automatycznie pobiera dane z CrossRef
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="type">Typ literatury *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'BASIC' | 'SUPPLEMENTARY' })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="BASIC">Podstawowa</option>
                <option value="SUPPLEMENTARY">Uzupełniająca</option>
              </select>
            </div>

            <div>
              <Label htmlFor="title">Tytuł *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="authors">Autorzy</Label>
                <Input
                  id="authors"
                  value={formData.authors}
                  onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                  placeholder="Jan Kowalski, Anna Nowak"
                />
              </div>

              <div>
                <Label htmlFor="year">Rok wydania</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="publisher">Wydawca</Label>
              <Input
                id="publisher"
                value={formData.publisher}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
              />
            </div>

            {formData.item_category === 'BOOK' && (
              <div>
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                />
              </div>
            )}

            {formData.item_category === 'ARTICLE' && (
              <div>
                <Label htmlFor="doi">DOI</Label>
                <Input
                  id="doi"
                  value={formData.doi}
                  onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                />
              </div>
            )}

            {formData.item_category === 'LEGAL_ACT' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="journal_year">Rok Dz.U.</Label>
                    <Input
                      id="journal_year"
                      value={formData.journal_year}
                      onChange={(e) => setFormData({ ...formData, journal_year: e.target.value })}
                      placeholder="2024"
                    />
                  </div>
                  <div>
                    <Label htmlFor="journal_number">Nr Dz.U.</Label>
                    <Input
                      id="journal_number"
                      value={formData.journal_number}
                      onChange={(e) => setFormData({ ...formData, journal_number: e.target.value })}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="journal_position">Poz.</Label>
                    <Input
                      id="journal_position"
                      value={formData.journal_position}
                      onChange={(e) => setFormData({ ...formData, journal_position: e.target.value })}
                      placeholder="456"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="url">Link</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingId ? 'Zapisz zmiany' : 'Dodaj'}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Anuluj
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Podstawowa ({basicLiterature.length})</TabsTrigger>
          <TabsTrigger value="supplementary">Uzupełniająca ({supplementaryLiterature.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          {basicLiterature.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                {item.cover_url ? (
                  <img src={item.cover_url} alt={item.title} className="w-16 h-24 object-cover rounded flex-shrink-0 shadow-sm" />
                ) : (
                  <div className="w-16 h-24 bg-gradient-to-br from-muted to-muted/50 rounded flex-shrink-0 flex items-center justify-center shadow-sm">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    {item.item_category === 'LEGAL_ACT' && <span className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-800">⚖️ Ustawa</span>}
                    {item.item_category === 'ARTICLE' && <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-medium border border-green-200 dark:border-green-800">📄 Artykuł</span>}
                    {item.item_category === 'BOOK' && <span className="text-xs bg-orange-500/10 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-medium border border-orange-200 dark:border-orange-800">📚 Książka</span>}
                  </div>
                  <h4 className="font-semibold">{item.title}</h4>
                  {item.authors && <p className="text-sm text-muted-foreground">{item.authors}</p>}
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    {item.year && <span>{item.year}</span>}
                    {item.publisher && <span>{item.publisher}</span>}
                    {item.isbn && <span>ISBN: {item.isbn}</span>}
                    {item.doi && <span>DOI: {item.doi}</span>}
                  </div>
                  {item.legal_act_data && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Dz.U. {item.legal_act_data.journal_year} Nr {item.legal_act_data.journal_number} poz. {item.legal_act_data.journal_position}
                    </p>
                  )}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                      Link do źródła →
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {basicLiterature.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Brak literatury podstawowej</p>
          )}
        </TabsContent>

        <TabsContent value="supplementary" className="space-y-4 mt-4">
          {supplementaryLiterature.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                {item.cover_url ? (
                  <img src={item.cover_url} alt={item.title} className="w-16 h-24 object-cover rounded flex-shrink-0 shadow-sm" />
                ) : (
                  <div className="w-16 h-24 bg-gradient-to-br from-muted to-muted/50 rounded flex-shrink-0 flex items-center justify-center shadow-sm">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    {item.item_category === 'LEGAL_ACT' && <span className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-800">⚖️ Ustawa</span>}
                    {item.item_category === 'ARTICLE' && <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-medium border border-green-200 dark:border-green-800">📄 Artykuł</span>}
                    {item.item_category === 'BOOK' && <span className="text-xs bg-orange-500/10 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-medium border border-orange-200 dark:border-orange-800">📚 Książka</span>}
                  </div>
                  <h4 className="font-semibold">{item.title}</h4>
                  {item.authors && <p className="text-sm text-muted-foreground">{item.authors}</p>}
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    {item.year && <span>{item.year}</span>}
                    {item.publisher && <span>{item.publisher}</span>}
                    {item.isbn && <span>ISBN: {item.isbn}</span>}
                    {item.doi && <span>DOI: {item.doi}</span>}
                  </div>
                  {item.legal_act_data && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Dz.U. {item.legal_act_data.journal_year} Nr {item.legal_act_data.journal_number} poz. {item.legal_act_data.journal_position}
                    </p>
                  )}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                      Link do źródła →
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {supplementaryLiterature.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Brak literatury uzupełniającej</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};