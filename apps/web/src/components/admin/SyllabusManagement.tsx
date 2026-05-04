import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface SyllabusManagementProps {
  courseId: string;
}

export const SyllabusManagement = ({ courseId }: SyllabusManagementProps) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syllabusId, setSyllabusId] = useState<string | null>(null);

  useEffect(() => {
    fetchSyllabus();
  }, [courseId]);

  const fetchSyllabus = async () => {
    try {
      const { data, error } = await supabase
        .from('syllabus')
        .select('*')
        .eq('course_id', courseId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setContent(data.content_rich_text || '');
        setSyllabusId(data.id);
      }
    } catch (error) {
      console.error('Error fetching syllabus:', error);
      toast.error('Błąd pobierania syllabusa');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (syllabusId) {
        const { error } = await supabase
          .from('syllabus')
          .update({
            content_rich_text: content,
            last_edited_by: user?.email || 'admin',
          })
          .eq('id', syllabusId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('syllabus')
          .insert({
            course_id: courseId,
            content_rich_text: content,
            last_edited_by: user?.email || 'admin',
          })
          .select()
          .single();

        if (error) throw error;
        setSyllabusId(data.id);
      }

      toast.success('Syllabus zapisany');
    } catch (error) {
      console.error('Error saving syllabus:', error);
      toast.error('Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Syllabus kursu</h3>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
      </div>

      <div>
        <Label htmlFor="content">Treść syllabusa</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          placeholder="Wprowadź treść syllabusa (wspiera markdown)..."
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Możesz używać markdown do formatowania: **pogrubienie**, *kursywa*, ## Nagłówki, - listy, itp.
        </p>
      </div>
    </div>
  );
};