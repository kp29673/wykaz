import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

interface StudentGrade {
  grade_item_id: string;
  points: number | null;
  grade: string | null;
  notes: string | null;
  grade_items: {
    name: string;
    max_points: number;
    weight: number;
  };
}

const StudentGrades = () => {
  const navigate = useNavigate();
  const [indexNumber, setIndexNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState<{
    firstName: string;
    lastName: string;
    courseName: string;
    grades: StudentGrade[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!indexNumber.trim()) {
      toast.error('Wprowadź numer indeksu');
      return;
    }

    setLoading(true);
    try {
      // Find student by index number
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, course_id, courses(name)')
        .eq('index_number', indexNumber.trim())
        .single();

      if (studentError || !student) {
        toast.error('Nie znaleziono studenta o podanym numerze indeksu');
        setStudentData(null);
        return;
      }

      // Fetch grades for the student
      const { data: grades, error: gradesError } = await supabase
        .from('grade_records')
        .select(`
          grade_item_id,
          points,
          grade,
          notes,
          grade_items(name, max_points, weight)
        `)
        .eq('student_id', student.id);

      if (gradesError) throw gradesError;

      setStudentData({
        firstName: student.first_name,
        lastName: student.last_name,
        courseName: (student.courses as any)?.name || 'Kurs',
        grades: grades || [],
      });

      toast.success('Dane pobrane pomyślnie');
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast.error('Błąd pobierania ocen');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalGrade = () => {
    if (!studentData?.grades.length) return null;

    let totalWeightedPoints = 0;
    let totalWeight = 0;

    studentData.grades.forEach((record) => {
      if (record.points !== null && record.points !== undefined && record.grade_items) {
        const percentage = (record.points / record.grade_items.max_points) * 100;
        totalWeightedPoints += percentage * record.grade_items.weight;
        totalWeight += record.grade_items.weight;
      }
    });

    if (totalWeight === 0) return null;
    
    return (totalWeightedPoints / totalWeight).toFixed(2);
  };

  const finalGrade = calculateFinalGrade();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Wstecz
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Sprawdź Oceny</h1>
                <p className="text-sm text-muted-foreground">Wprowadź numer indeksu</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        {/* Index Number Form */}
        <Card className="dashboard-card p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="indexNumber" className="text-sm font-medium block mb-2">
                Numer Indeksu
              </label>
              <div className="flex gap-3">
                <Input
                  id="indexNumber"
                  value={indexNumber}
                  onChange={(e) => setIndexNumber(e.target.value)}
                  placeholder="np. 123456"
                  className="flex-1"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Szukam...
                    </>
                  ) : (
                    <>
                      <Trophy className="h-4 w-4" />
                      Pokaż Oceny
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Student Grades Display */}
        {studentData && (
          <div className="space-y-6 animate-slide-in">
            {/* Student Info */}
            <Card className="dashboard-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">
                    {studentData.firstName} {studentData.lastName}
                  </h2>
                  <p className="text-muted-foreground">{studentData.courseName}</p>
                  <p className="text-sm text-muted-foreground mt-1">Nr indeksu: {indexNumber}</p>
                </div>
                {finalGrade && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Średnia ważona</p>
                    <div className="text-3xl font-bold flex items-baseline gap-2">
                      {finalGrade}%
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Grades List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Oceny szczegółowe</h3>
              
              {studentData.grades.length === 0 ? (
                <Card className="dashboard-card p-8">
                  <p className="text-center text-muted-foreground">
                    Brak ocen dla tego studenta
                  </p>
                </Card>
              ) : (
                studentData.grades.map((record, index) => (
                  <Card key={index} className="dashboard-card p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">
                          {record.grade_items?.name || 'Brak nazwy'}
                        </h4>
                        {record.notes && (
                          <p className="text-sm text-muted-foreground">{record.notes}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Waga: {record.grade_items?.weight || 0}</span>
                          {record.grade_items?.max_points && (
                            <span>Max punktów: {record.grade_items.max_points}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {record.points !== null && record.points !== undefined ? (
                          <>
                            <div className="text-2xl font-semibold">
                              {record.points}/{record.grade_items?.max_points || 0}
                            </div>
                            {record.grade && (
                              <div className="text-sm font-medium text-primary mt-1">
                                Ocena: {record.grade}
                              </div>
                            )}
                            {record.grade_items?.max_points && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {((record.points / record.grade_items.max_points) * 100).toFixed(1)}%
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-muted-foreground">Brak oceny</div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentGrades;
