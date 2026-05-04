import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface University {
  id: string;
  name: string;
  short_name: string | null;
}

interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  field_of_study: string;
  university_id: string | null;
  degree_level: 'I' | 'II' | 'JEDNOLITE' | 'PG' | null;
  study_mode: 'STACJONARNE' | 'NIESTACJONARNE' | null;
  academic_year: string | null;
  semester: string | null;
  ects: number | null;
  language: string;
  is_published: boolean;
}

export const CourseManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    field_of_study: '',
    university_id: '',
    degree_level: '',
    study_mode: '',
    academic_year: '',
    semester: '',
    ects: '',
    is_published: false,
  });

  useEffect(() => {
    fetchCourses();
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
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Błąd pobierania kursów');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const courseData = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        field_of_study: formData.field_of_study,
        university_id: formData.university_id || null,
        degree_level: (formData.degree_level || null) as 'I' | 'II' | 'JEDNOLITE' | 'PG' | null,
        study_mode: (formData.study_mode || null) as 'STACJONARNE' | 'NIESTACJONARNE' | null,
        academic_year: formData.academic_year || null,
        semester: formData.semester || null,
        ects: formData.ects ? parseInt(formData.ects) : null,
        is_published: formData.is_published,
      };

      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast.success('Kurs zaktualizowany');
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([courseData]);

        if (error) throw error;
        toast.success('Kurs dodany');
      }

      resetForm();
      fetchCourses();
    } catch (error: any) {
      console.error('Error saving course:', error);
      toast.error(error.message || 'Błąd zapisywania kursu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten kurs?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Kurs usunięty');
      fetchCourses();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error('Błąd usuwania kursu');
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      description: course.description,
      field_of_study: course.field_of_study,
      university_id: course.university_id || '',
      degree_level: course.degree_level || '',
      study_mode: course.study_mode || '',
      academic_year: course.academic_year || '',
      semester: course.semester || '',
      ects: course.ects?.toString() || '',
      is_published: course.is_published,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      field_of_study: '',
      university_id: '',
      degree_level: '',
      study_mode: '',
      academic_year: '',
      semester: '',
      ects: '',
      is_published: false,
    });
    setEditingCourse(null);
    setShowForm(false);
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Zarządzanie Kursami</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Anuluj' : 'Dodaj Kurs'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCourse ? 'Edytuj Kurs' : 'Nowy Kurs'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nazwa kursu</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Kod kursu (unikalny)</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  placeholder="np. fizjo-zp01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_of_study">Kierunek studiów</Label>
                <Input
                  id="field_of_study"
                  value={formData.field_of_study}
                  onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                  required
                  placeholder="np. Fizjoterapia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="university_id">Uczelnia</Label>
                <select
                  id="university_id"
                  value={formData.university_id}
                  onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Wybierz uczelnie</option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="degree_level">Stopień studiów</Label>
                  <select
                    id="degree_level"
                    value={formData.degree_level}
                    onChange={(e) => setFormData({ ...formData, degree_level: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Wybierz stopień</option>
                    <option value="I">I stopień</option>
                    <option value="II">II stopień</option>
                    <option value="JEDNOLITE">Jednolite magisterskie</option>
                    <option value="PG">Podyplomowe</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="study_mode">Tryb studiów</Label>
                  <select
                    id="study_mode"
                    value={formData.study_mode}
                    onChange={(e) => setFormData({ ...formData, study_mode: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Wybierz tryb</option>
                    <option value="STACJONARNE">Stacjonarne</option>
                    <option value="NIESTACJONARNE">Niestacjonarne</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Rok akademicki</Label>
                  <Input
                    id="academic_year"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="np. 2025/2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semester">Semestr</Label>
                  <Input
                    id="semester"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    placeholder="np. 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ects">ECTS</Label>
                  <Input
                    id="ects"
                    type="number"
                    value={formData.ects}
                    onChange={(e) => setFormData({ ...formData, ects: e.target.value })}
                    placeholder="np. 5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="is_published" className="cursor-pointer">
                  Opublikowany (widoczny publicznie)
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingCourse ? 'Zapisz zmiany' : 'Dodaj kurs'}
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
        {courses.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{course.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kod: {course.code} | Kierunek: {course.field_of_study}
                  </p>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(course)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(course.id)}
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
