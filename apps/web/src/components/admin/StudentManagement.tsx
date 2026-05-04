import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, X, Upload } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  index_number: string;
  university_id: string | null;
}

interface University {
  id: string;
  name: string;
}

interface StudentManagementProps {
  courseId: string | null;
}

export const StudentManagement = ({ courseId }: StudentManagementProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    index_number: '',
    university_id: '',
  });

  useEffect(() => {
    fetchStudents();
    fetchUniversities();
  }, [courseId]);

  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setUniversities(data || []);
    } catch (error) {
      console.error('Error fetching universities:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      let query = supabase
        .from('students')
        .select('*, courses(name)')
        .order('last_name');

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Błąd pobierania studentów');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const studentData = {
        course_id: courseId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        index_number: formData.index_number,
        university_id: formData.university_id || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Student zaktualizowany');
      } else {
        const { error } = await supabase
          .from('students')
          .insert(studentData);

        if (error) throw error;
        toast.success('Student dodany');
      }

      fetchStudents();
      resetForm();
    } catch (error: any) {
      console.error('Error saving student:', error);
      if (error.code === '23505') {
        toast.error('Student o tym numerze indeksu już istnieje w tym kursie');
      } else {
        toast.error('Błąd zapisu');
      }
    }
  };

  const handleEdit = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      index_number: student.index_number,
      university_id: student.university_id || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno usunąć tego studenta?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Student usunięty');
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Błąd usuwania');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      index_number: '',
      university_id: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const header = lines[0].toLowerCase();

      if (!header.includes('firstname') || !header.includes('lastname') || !header.includes('indexnumber')) {
        toast.error('Nieprawidłowy format CSV. Wymagane kolumny: firstName,lastName,indexNumber');
        return;
      }

      const studentsToImport = lines.slice(1).map((line) => {
        const [firstName, lastName, indexNumber] = line.split(',').map((s) => s.trim());
        return {
          course_id: courseId,
          first_name: firstName,
          last_name: lastName,
          index_number: indexNumber,
          university_id: null,
        };
      });

      const { error } = await supabase
        .from('students')
        .insert(studentsToImport);

      if (error) throw error;
      toast.success(`Zaimportowano ${studentsToImport.length} studentów`);
      fetchStudents();
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast.error('Błąd importu CSV');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {courseId ? `Studenci kursu (${students.length})` : `Wszyscy studenci (${students.length})`}
          </h3>
          {!courseId && (
            <p className="text-sm text-muted-foreground mt-1">
              Globalna lista wszystkich studentów z wszystkich kursów
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {courseId && (
            <Button variant="outline" className="gap-2" asChild>
              <label>
                <Upload className="h-4 w-4" />
                Import CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                />
              </label>
            </Button>
          )}
          {courseId && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Dodaj studenta
            </Button>
          )}
        </div>
      </div>

      {courseId && showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">
              {editingId ? 'Edytuj studenta' : 'Nowy student'}
            </h4>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Imię *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="last_name">Nazwisko *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="index_number">Numer indeksu *</Label>
                <Input
                  id="index_number"
                  value={formData.index_number}
                  onChange={(e) => setFormData({ ...formData, index_number: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="university_id">Uczelnia</Label>
                <select
                  id="university_id"
                  value={formData.university_id}
                  onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Wybierz uczelnie</option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name}
                    </option>
                  ))}
                </select>
              </div>
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

      {courseId && (
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Format CSV do importu:</strong> firstName,lastName,indexNumber
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {students.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Brak studentów</p>
          </Card>
        ) : (
          students.map((student: any) => (
            <Card key={student.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold">
                    {student.first_name} {student.last_name}
                  </h4>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                    <span>Nr indeksu: {student.index_number}</span>
                    {!courseId && student.courses && (
                      <span className="text-primary">• {student.courses.name}</span>
                    )}
                  </div>
                </div>
                {courseId && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};