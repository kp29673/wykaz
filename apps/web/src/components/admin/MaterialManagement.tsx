import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  code: string;
}

interface Material {
  id: string;
  course_id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  order_index: number;
  courses: {
    name: string;
  };
}

export const MaterialManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    description: '',
    file_url: '',
    file_type: 'pdf',
    order_index: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, materialsRes] = await Promise.all([
        supabase.from('courses').select('*').order('name'),
        supabase
          .from('course_materials')
          .select('*, courses(name)')
          .order('order_index', { ascending: true }),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (materialsRes.error) throw materialsRes.error;

      setCourses(coursesRes.data || []);
      setMaterials(materialsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingMaterial) {
        const { error } = await supabase
          .from('course_materials')
          .update(formData)
          .eq('id', editingMaterial.id);

        if (error) throw error;
        toast.success('Materiał zaktualizowany');
      } else {
        const { error } = await supabase
          .from('course_materials')
          .insert([formData]);

        if (error) throw error;
        toast.success('Materiał dodany');
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving material:', error);
      toast.error(error.message || 'Błąd zapisywania materiału');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten materiał?')) return;

    try {
      const { error } = await supabase
        .from('course_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Materiał usunięty');
      fetchData();
    } catch (error) {
      toast.error('Błąd usuwania materiału');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      course_id: material.course_id,
      title: material.title,
      description: material.description,
      file_url: material.file_url,
      file_type: material.file_type,
      order_index: material.order_index,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      title: '',
      description: '',
      file_url: '',
      file_type: 'pdf',
      order_index: 0,
    });
    setEditingMaterial(null);
    setShowForm(false);
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Zarządzanie Materiałami</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Anuluj' : 'Dodaj Materiał'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingMaterial ? 'Edytuj Materiał' : 'Nowy Materiał'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course">Kurs</Label>
                <Select
                  value={formData.course_id}
                  onValueChange={(value) => setFormData({ ...formData, course_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz kurs" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Tytuł materiału</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file_url">URL pliku</Label>
                <Input
                  id="file_url"
                  type="url"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://example.com/material.pdf"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file_type">Typ pliku</Label>
                <Input
                  id="file_type"
                  value={formData.file_type}
                  onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                  placeholder="pdf, docx, pptx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_index">Kolejność</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  min="0"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingMaterial ? 'Zapisz zmiany' : 'Dodaj materiał'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Anuluj
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {materials.map((material) => (
          <Card key={material.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{material.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kurs: {material.courses.name} | Kolejność: {material.order_index}
                  </p>
                  {material.description && (
                    <p className="text-sm text-muted-foreground mt-2">{material.description}</p>
                  )}
                  {material.file_url && (
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline mt-2 inline-block"
                    >
                      {material.file_url}
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(material)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};
