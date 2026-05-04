import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  code: string;
}

interface ResourceCode {
  id: string;
  code: string;
  course_id: string;
  courses: {
    name: string;
    code: string;
  };
}

export const ResourceCodeManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [resourceCodes, setResourceCodes] = useState<ResourceCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    course_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, codesRes] = await Promise.all([
        supabase.from('courses').select('*').order('name'),
        supabase
          .from('resource_codes')
          .select('*, courses(name, code)')
          .order('created_at', { ascending: false }),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (codesRes.error) throw codesRes.error;

      setCourses(coursesRes.data || []);
      setResourceCodes(codesRes.data || []);
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
      const { error } = await supabase
        .from('resource_codes')
        .insert([{ ...formData, code: formData.code.toLowerCase() }]);

      if (error) throw error;
      toast.success('Kod dostępu dodany');
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving resource code:', error);
      toast.error(error.message || 'Błąd zapisywania kodu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten kod?')) return;

    try {
      const { error } = await supabase
        .from('resource_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Kod usunięty');
      fetchData();
    } catch (error) {
      toast.error('Błąd usuwania kodu');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Kod skopiowany do schowka');
  };

  const resetForm = () => {
    setFormData({ code: '', course_id: '' });
    setShowForm(false);
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Zarządzanie Kodami Dostępu</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Anuluj' : 'Dodaj Kod'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nowy Kod Dostępu</CardTitle>
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
                <Label htmlFor="code">Kod dostępu</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  placeholder="np. fizjo-zp01"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Ten kod będą wpisywać studenci, aby uzyskać dostęp do materiałów
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Dodaj kod</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Anuluj
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {resourceCodes.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{item.courses.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {item.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(item.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};
