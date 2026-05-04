import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  max_points: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  index_number: string;
}

export default function StudentUpload() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [indexNumber, setIndexNumber] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchAssignments();
    }
  }, [courseId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('deadline', { ascending: true });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Błąd podczas pobierania zadań');
    }
  };

  const verifyStudent = async () => {
    if (!indexNumber.trim()) {
      toast.error('Podaj numer indeksu');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('course_id', courseId)
        .eq('index_number', indexNumber.trim())
        .single();

      if (error || !data) {
        toast.error('Nie znaleziono studenta o podanym numerze indeksu');
        return;
      }

      setStudent(data);
      toast.success(`Witaj ${data.first_name} ${data.last_name}!`);
    } catch (error) {
      console.error('Error verifying student:', error);
      toast.error('Błąd podczas weryfikacji studenta');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!student) {
      toast.error('Najpierw zweryfikuj numer indeksu');
      return;
    }

    if (!selectedAssignment) {
      toast.error('Wybierz zadanie');
      return;
    }

    if (!file) {
      toast.error('Wybierz plik');
      return;
    }

    if (!email.trim()) {
      toast.error('Podaj adres email');
      return;
    }

    setLoading(true);

    try {
      const assignment = assignments.find(a => a.id === selectedAssignment);
      if (!assignment) throw new Error('Assignment not found');

      const isLate = new Date() > new Date(assignment.deadline);
      const fileExt = file.name.split('.').pop();
      const fileName = `${courseId}/${selectedAssignment}/${student.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assignment-submissions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const verificationToken = crypto.randomUUID();

      const { error: insertError } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: selectedAssignment,
          student_id: student.id,
          file_url: fileName,
          file_name: file.name,
          file_size: file.size,
          comment: comment.trim() || null,
          is_late: isLate,
          verification_token: verificationToken,
        });

      if (insertError) throw insertError;

      const { error: emailError } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email.trim(),
          studentName: `${student.first_name} ${student.last_name}`,
          assignmentTitle: assignment.title,
          verificationToken,
        },
      });

      if (emailError) {
        console.error('Error sending verification email:', emailError);
        toast.warning('Plik został wysłany, ale nie udało się wysłać maila weryfikacyjnego');
      } else {
        toast.success('Plik wysłany! Sprawdź email aby potwierdzić wysłanie.');
      }

      setFile(null);
      setComment('');
      setEmail('');
      setSelectedAssignment('');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast.error('Błąd podczas wysyłania pliku');
    } finally {
      setLoading(false);
    }
  };

  const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);
  const isLate = selectedAssignmentData && new Date() > new Date(selectedAssignmentData.deadline);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Wysyłanie pracy</CardTitle>
        </CardHeader>
        <CardContent>
          {!student ? (
            <div className="space-y-4">
              <div>
                <Label>Numer indeksu</Label>
                <div className="flex gap-2">
                  <Input
                    value={indexNumber}
                    onChange={(e) => setIndexNumber(e.target.value)}
                    placeholder="np. 123456"
                  />
                  <Button onClick={verifyStudent}>Weryfikuj</Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Zalogowano jako: {student.first_name} {student.last_name} ({student.index_number})
                </AlertDescription>
              </Alert>

              <div>
                <Label>Zadanie</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={selectedAssignment}
                  onChange={(e) => setSelectedAssignment(e.target.value)}
                  required
                >
                  <option value="">Wybierz zadanie</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.title} (termin: {format(new Date(assignment.deadline), 'dd.MM.yyyy HH:mm')})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAssignmentData && (
                <Alert variant={isLate ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isLate
                      ? `Uwaga! Termin wysłania minął: ${format(new Date(selectedAssignmentData.deadline), 'dd.MM.yyyy HH:mm')}`
                      : `Termin: ${format(new Date(selectedAssignmentData.deadline), 'dd.MM.yyyy HH:mm')}`}
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label>Email do weryfikacji</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="twoj@email.com"
                  required
                />
              </div>

              <div>
                <Label>Plik</Label>
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div>
                <Label>Komentarz / Uwagi</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Opcjonalny komentarz..."
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Upload className="mr-2 h-4 w-4" />
                {loading ? 'Wysyłanie...' : 'Wyślij pracę'}
              </Button>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Po wysłaniu otrzymasz email z linkiem weryfikacyjnym. Kliknij w link aby potwierdzić, że to Ty wysłałeś tę pracę.
                </AlertDescription>
              </Alert>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
