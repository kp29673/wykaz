import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';

interface GradingScale {
  id: string;
  course_id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
}

interface GradingScaleManagementProps {
  courseId: string;
}

const GradingScaleManagement = ({ courseId }: GradingScaleManagementProps) => {
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    grade: '',
    min_percentage: '',
    max_percentage: '',
  });

  useEffect(() => {
    fetchScales();
  }, [courseId]);

  const fetchScales = async () => {
    try {
      const { data, error } = await supabase
        .from('grading_scales')
        .select('*')
        .eq('course_id', courseId)
        .order('min_percentage', { ascending: true });

      if (error) throw error;
      setScales(data || []);
    } catch (error) {
      console.error('Error fetching grading scales:', error);
      toast.error('Błąd pobierania skali ocen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.grade || !formData.min_percentage || !formData.max_percentage) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    const minPercent = parseFloat(formData.min_percentage);
    const maxPercent = parseFloat(formData.max_percentage);

    if (minPercent >= maxPercent) {
      toast.error('Minimalna wartość musi być mniejsza niż maksymalna');
      return;
    }

    if (minPercent < 0 || maxPercent > 100) {
      toast.error('Wartości procentowe muszą być w zakresie 0-100');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('grading_scales')
          .update({
            grade: formData.grade,
            min_percentage: minPercent,
            max_percentage: maxPercent,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Zaktualizowano skalę ocen');
      } else {
        const { error } = await supabase
          .from('grading_scales')
          .insert({
            course_id: courseId,
            grade: formData.grade,
            min_percentage: minPercent,
            max_percentage: maxPercent,
          });

        if (error) throw error;
        toast.success('Dodano nową skalę ocen');
      }

      setFormData({ grade: '', min_percentage: '', max_percentage: '' });
      setEditingId(null);
      setShowAddForm(false);
      fetchScales();
    } catch (error: any) {
      console.error('Error saving grading scale:', error);
      if (error.message?.includes('unique_course_grade')) {
        toast.error('Ocena o tej wartości już istnieje dla tego kursu');
      } else {
        toast.error('Błąd zapisywania skali ocen');
      }
    }
  };

  const handleEdit = (scale: GradingScale) => {
    setEditingId(scale.id);
    setFormData({
      grade: scale.grade,
      min_percentage: scale.min_percentage.toString(),
      max_percentage: scale.max_percentage.toString(),
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę skalę ocen?')) return;

    try {
      const { error } = await supabase
        .from('grading_scales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Usunięto skalę ocen');
      fetchScales();
    } catch (error) {
      console.error('Error deleting grading scale:', error);
      toast.error('Błąd usuwania skali ocen');
    }
  };

  const handleCancel = () => {
    setFormData({ grade: '', min_percentage: '', max_percentage: '' });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (loading) {
    return <div className="text-center py-8">Ładowanie skali ocen...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Skala ocen</h2>
          <p className="text-muted-foreground mt-1">
            Zarządzaj skalą ocen dla tego kursu. System automatycznie przypisuje oceny na podstawie procentowego wyniku.
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj ocenę
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Edytuj ocenę' : 'Dodaj nową ocenę'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="grade">Ocena</Label>
              <Input
                id="grade"
                placeholder="np. 3.0"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="min">Minimalna wartość (%)</Label>
              <Input
                id="min"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="np. 60"
                value={formData.min_percentage}
                onChange={(e) => setFormData({ ...formData, min_percentage: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="max">Maksymalna wartość (%)</Label>
              <Input
                id="max"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="np. 69.99"
                value={formData.max_percentage}
                onChange={(e) => setFormData({ ...formData, max_percentage: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              Zapisz
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Anuluj
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {scales.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              Brak zdefiniowanej skali ocen. Dodaj pierwszą ocenę.
            </p>
          </Card>
        ) : (
          scales.map((scale) => (
            <Card key={scale.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center min-w-[60px]">
                    <div className="text-2xl font-bold text-primary">{scale.grade}</div>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium">{scale.min_percentage}% - {scale.max_percentage}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(scale)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(scale.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="p-6 bg-muted/20">
        <h3 className="font-semibold mb-3">Jak działa automatyczne przypisywanie ocen?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• System oblicza procentowy wynik na podstawie punktów i wag poszczególnych składników oceny</li>
          <li>• Na podstawie wyniku procentowego automatycznie przypisuje odpowiednią ocenę zgodnie ze skalą</li>
          <li>• Każdy kurs może mieć własną, customową skalę ocen</li>
          <li>• Upewnij się, że zakresy procentowe nie nachodzą na siebie</li>
        </ul>
      </Card>
    </div>
  );
};

export default GradingScaleManagement;
