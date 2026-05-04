import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, X } from 'lucide-react';

interface University {
  id: string;
  name: string;
  short_name: string | null;
}

export const UniversityManagement = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
  });

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .order('name');

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error fetching universities:', error);
      toast.error('Błąd pobierania uczelni');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('universities')
          .update({
            name: formData.name,
            short_name: formData.short_name || null,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Uczelnia zaktualizowana');
      } else {
        const { error } = await supabase
          .from('universities')
          .insert({
            name: formData.name,
            short_name: formData.short_name || null,
          });

        if (error) throw error;
        toast.success('Uczelnia dodana');
      }

      fetchUniversities();
      resetForm();
    } catch (error) {
      console.error('Error saving university:', error);
      toast.error('Błąd zapisu');
    }
  };

  const handleEdit = (university: University) => {
    setEditingId(university.id);
    setFormData({
      name: university.name,
      short_name: university.short_name || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno usunąć tę uczelnie?')) return;

    try {
      const { error } = await supabase
        .from('universities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Uczelnia usunięta');
      fetchUniversities();
    } catch (error) {
      console.error('Error deleting university:', error);
      toast.error('Błąd usuwania');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', short_name: '' });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Uczelnie</h2>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj uczelnie
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingId ? 'Edytuj uczelnie' : 'Nowa uczelnia'}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nazwa uczelni *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="np. Akademia Wychowania Fizycznego"
              />
            </div>

            <div>
              <Label htmlFor="short_name">Skrót (opcjonalnie)</Label>
              <Input
                id="short_name"
                value={formData.short_name}
                onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                placeholder="np. AWF"
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

      <div className="grid gap-4">
        {universities.map((university) => (
          <Card key={university.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{university.name}</h3>
                {university.short_name && (
                  <p className="text-sm text-muted-foreground">{university.short_name}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(university)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(university.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};