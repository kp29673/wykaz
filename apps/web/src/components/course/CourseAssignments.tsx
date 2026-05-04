import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClipboardList, Calendar, Award, Clock, Search, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AssignmentSubmissionForm } from './AssignmentSubmissionForm';
import { supabase } from '@/integrations/supabase/client';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  max_points: number;
}

interface CourseAssignmentsProps {
  assignments: Assignment[];
  courseId: string;
  courseName: string;
}

export const CourseAssignments = ({ assignments, courseId, courseName }: CourseAssignmentsProps) => {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [indexNumber, setIndexNumber] = useState('');
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const handleSubmitClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmissionForm(true);
  };

  const handleSearchSubmissions = async () => {
    if (!indexNumber.trim()) return;
    
    setLoadingSubmissions(true);
    try {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('index_number', indexNumber.trim())
        .eq('course_id', courseId)
        .maybeSingle();

      if (!student) {
        setStudentSubmissions([]);
        setLoadingSubmissions(false);
        return;
      }

      const { data: submissions, error } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          assignment_id,
          student_id,
          file_url,
          file_name,
          submitted_at,
          is_late,
          email_verified,
          verified_at,
          points,
          grade,
          graded_at,
          assignments!inner(id, title, course_id)
        `)
        .eq('student_id', student.id)
        .eq('assignments.course_id', courseId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const groupedSubmissions = await Promise.all(
        (submissions || []).map(async (submission) => {
          const { data: teamMembers } = await supabase
            .from('assignment_submissions')
            .select(`
              id,
              student_id,
              email_verified,
              verified_at,
              students!inner(index_number)
            `)
            .eq('file_url', submission.file_url)
            .eq('assignment_id', submission.assignment_id);

          return {
            ...submission,
            teamMembers: teamMembers || []
          };
        })
      );

      setStudentSubmissions(groupedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student submissions lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Moje przesyłki
          </CardTitle>
          <CardDescription>
            Wpisz swój numer indeksu aby zobaczyć historię swoich przesyłek
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="indexNumber">Numer indeksu</Label>
              <Input
                id="indexNumber"
                placeholder="np. 12345"
                value={indexNumber}
                onChange={(e) => setIndexNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmissions()}
              />
            </div>
            <Button 
              onClick={handleSearchSubmissions} 
              disabled={loadingSubmissions || !indexNumber.trim()}
              className="mt-auto"
            >
              {loadingSubmissions ? 'Szukam...' : 'Szukaj'}
            </Button>
          </div>

          {studentSubmissions.length > 0 && (
            <div className="space-y-3 mt-4">
              <Separator />
              <h4 className="font-medium">Znalezione przesyłki:</h4>
              {studentSubmissions.map((submission) => (
                <Card key={submission.id} className="border-muted">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{submission.assignments.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Przesłano: {format(new Date(submission.submitted_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Plik: {submission.file_name}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {submission.is_late && (
                          <Badge variant="destructive" className="text-xs">Spóźnione</Badge>
                        )}
                        {submission.graded_at && (
                          <Badge variant="secondary" className="text-xs">Ocenione</Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Autorzy projektu:</p>
                      <div className="space-y-1">
                        {submission.teamMembers.map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                            <span className="font-mono">{member.students.index_number}</span>
                            <div className="flex items-center gap-1">
                              {member.email_verified ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-xs text-green-600">Zweryfikowany</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-destructive" />
                                  <span className="text-xs text-destructive">Nie zweryfikowany</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Wszyscy autorzy muszą potwierdzić swoje adresy email aby praca została zaakceptowana.
                          {submission.graded_at && ' Ocena dostępna w zakładce "Oceny".'}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {indexNumber.trim() && !loadingSubmissions && studentSubmissions.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nie znaleziono przesyłek dla podanego numeru indeksu.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <Card className="dashboard-card p-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Brak dostępnych zadań</p>
        </Card>
      ) : (
        <div className="space-y-4">
        {assignments.map((assignment) => {
          const deadline = new Date(assignment.deadline);
          const isOverdue = isPast(deadline);

          return (
            <Card
              key={assignment.id}
              className={`dashboard-card p-6 transition-all ${
                isOverdue ? 'border-destructive/30 bg-destructive/5' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <ClipboardList className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {assignment.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        Termin: {format(deadline, 'dd MMMM yyyy, HH:mm', { locale: pl })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Max. punktów: {assignment.max_points}
                      </span>
                    </div>
                    {isOverdue && (
                      <div className="flex items-center gap-2 text-destructive">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Termin minął</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => handleSubmitClick(assignment)}
                  variant={isOverdue ? 'outline' : 'default'}
                  className="md:self-start"
                >
                  Wyślij pracę
                </Button>
              </div>
            </Card>
          );
        })}
        </div>
      )}

      {selectedAssignment && (
        <AssignmentSubmissionForm
          open={showSubmissionForm}
          onOpenChange={setShowSubmissionForm}
          assignment={selectedAssignment}
          courseId={courseId}
          courseName={courseName}
        />
      )}
    </div>
  );
};
