import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  comment: string | null;
  submitted_at: string;
  email_verified: boolean;
  verified_at: string | null;
  grade: number | null;
  points: number | null;
  graded_at: string | null;
  graded_by: string | null;
  is_late: boolean;
  students: {
    first_name: string;
    last_name: string;
    index_number: string;
  };
  assignments: {
    title: string;
    max_points: number;
  };
}

export const AssignmentSubmissions = ({ courseId }: { courseId: string }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [pointsInput, setPointsInput] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, [courseId]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          students (first_name, last_name, index_number),
          assignments!inner (title, max_points, course_id)
        `)
        .eq('assignments.course_id', courseId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Błąd podczas pobierania zgłoszeń');
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedSubmission) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: gradeInput ? parseFloat(gradeInput) : null,
          points: pointsInput ? parseFloat(pointsInput) : null,
          graded_at: new Date().toISOString(),
          graded_by: user?.email || 'admin',
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast.success('Ocena zapisana');
      setSelectedSubmission(null);
      setGradeInput('');
      setPointsInput('');
      fetchSubmissions();
    } catch (error) {
      console.error('Error grading submission:', error);
      toast.error('Błąd podczas zapisywania oceny');
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      // Extract file path from public URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/assignment-submissions/[path]
      const urlParts = fileUrl.split('/assignment-submissions/');
      if (urlParts.length < 2) {
        throw new Error('Invalid file URL');
      }
      const filePath = urlParts[1];

      const { data, error } = await supabase.storage
        .from('assignment-submissions')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Plik pobrany');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Błąd podczas pobierania pliku');
    }
  };

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Wysłane prace</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Zadanie</TableHead>
                <TableHead>Data wysłania</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ocena</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {submission.students.first_name} {submission.students.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {submission.students.index_number}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{submission.assignments.title}</TableCell>
                  <TableCell>
                    <div>
                      <div>{format(new Date(submission.submitted_at), 'dd.MM.yyyy HH:mm')}</div>
                      {submission.is_late && (
                        <Badge variant="destructive" className="mt-1">
                          <Clock className="mr-1 h-3 w-3" />
                          Spóźnione
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {submission.email_verified ? (
                      <Badge variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Zweryfikowane
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="mr-1 h-3 w-3" />
                        Niezweryfikowane
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {submission.grade ? (
                      <div>
                        <div className="font-medium">{submission.grade}</div>
                        <div className="text-sm text-muted-foreground">
                          {submission.points}/{submission.assignments.max_points} pkt
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Nieocenione</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadFile(submission.file_url, submission.file_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setGradeInput(submission.grade?.toString() || '');
                            setPointsInput(submission.points?.toString() || '');
                          }}
                        >
                          Oceń
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ocenianie pracy</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Student</p>
                            <p className="font-medium">
                              {submission.students.first_name} {submission.students.last_name} ({submission.students.index_number})
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Zadanie</p>
                            <p className="font-medium">{submission.assignments.title}</p>
                          </div>
                          {submission.comment && (
                            <div>
                              <p className="text-sm text-muted-foreground">Komentarz studenta</p>
                              <p className="text-sm">{submission.comment}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium">Ocena</label>
                            <Input
                              value={gradeInput}
                              onChange={(e) => setGradeInput(e.target.value)}
                              placeholder="np. 5.0"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">
                              Punkty (max {submission.assignments.max_points})
                            </label>
                            <Input
                              type="number"
                              value={pointsInput}
                              onChange={(e) => setPointsInput(e.target.value)}
                              max={submission.assignments.max_points}
                            />
                          </div>
                          <Button onClick={handleGrade} className="w-full">
                            Zapisz ocenę
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {submissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Brak wysłanych prac
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};
