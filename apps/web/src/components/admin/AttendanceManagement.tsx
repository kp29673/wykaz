import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Calendar, CheckSquare, X, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  index_number: string;
}

interface AttendanceSession {
  id: string;
  title: string;
  date: string;
  type: 'LECTURE' | 'EXERCISE';
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_session_id: string;
  present: boolean;
}

interface AttendanceManagementProps {
  courseId: string;
}

export const AttendanceManagement = ({ courseId }: AttendanceManagementProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    type: 'LECTURE' as 'LECTURE' | 'EXERCISE',
  });

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      const [studentsRes, sessionsRes, recordsRes] = await Promise.all([
        supabase.from('students').select('*').eq('course_id', courseId).order('last_name'),
        supabase.from('attendance_sessions').select('*').eq('course_id', courseId).order('date', { ascending: false }),
        supabase.from('attendance_records').select('*')
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      if (recordsRes.error) throw recordsRes.error;

      setStudents(studentsRes.data || []);
      setSessions(sessionsRes.data || []);
      setRecords(recordsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const sessionData = {
        course_id: courseId,
        title: formData.title,
        date: formData.date,
        type: formData.type,
      };

      if (editingId) {
        const { error } = await supabase
          .from('attendance_sessions')
          .update(sessionData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Sesja zaktualizowana');
      } else {
        const { data: newSession, error } = await supabase
          .from('attendance_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) throw error;

        // Create attendance records for all students
        const attendanceRecords = students.map(student => ({
          attendance_session_id: newSession.id,
          student_id: student.id,
          present: false,
        }));

        const { error: recordsError } = await supabase
          .from('attendance_records')
          .insert(attendanceRecords);

        if (recordsError) throw recordsError;
        toast.success('Sesja dodana');
      }

      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Błąd zapisu');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Czy na pewno usunąć tę sesję obecności?')) return;

    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Sesja usunięta');
      fetchData();
      if (selectedSession === id) setSelectedSession(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Błąd usuwania');
    }
  };

  const toggleAttendance = async (studentId: string, sessionId: string, currentStatus: boolean) => {
    try {
      const record = records.find(
        r => r.student_id === studentId && r.attendance_session_id === sessionId
      );

      if (record) {
        const { error } = await supabase
          .from('attendance_records')
          .update({ present: !currentStatus })
          .eq('id', record.id);

        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Błąd aktualizacji obecności');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      type: 'LECTURE',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getAttendanceStats = (studentId: string) => {
    const studentRecords = records.filter(r => r.student_id === studentId);
    const present = studentRecords.filter(r => r.present).length;
    const total = studentRecords.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, total, percentage };
  };

  if (loading) {
    return <div className="text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Obecności</h3>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj sesję
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">
              {editingId ? 'Edytuj sesję' : 'Nowa sesja obecności'}
            </h4>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmitSession} className="space-y-4">
            <div>
              <Label htmlFor="title">Tytuł *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="np. Wykład 1, Ćwiczenia 3"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Typ *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'LECTURE' | 'EXERCISE' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="LECTURE">Wykład</option>
                  <option value="EXERCISE">Ćwiczenia</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingId ? 'Zapisz zmiany' : 'Dodaj sesję'}</Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Anuluj
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {sessions.map((session) => (
          <Card key={session.id} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h4 className="font-semibold">{session.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString('pl-PL')} • {session.type === 'LECTURE' ? 'Wykład' : 'Ćwiczenia'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSession(selectedSession === session.id ? null : session.id)}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {selectedSession === session.id ? 'Ukryj listę' : 'Zaznacz obecność'}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteSession(session.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {selectedSession === session.id && (
              <div className="mt-4 border-t pt-4 space-y-2">
                {students.map((student) => {
                  const record = records.find(
                    r => r.student_id === student.id && r.attendance_session_id === session.id
                  );
                  const isPresent = record?.present || false;

                  return (
                    <div key={student.id} className="flex items-center justify-between py-2 hover:bg-muted/50 px-2 rounded">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isPresent}
                          onCheckedChange={() => toggleAttendance(student.id, session.id, isPresent)}
                        />
                        <span className="text-sm">
                          {student.first_name} {student.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({student.index_number})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}

        {sessions.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Brak sesji obecności</p>
        )}
      </div>

      {students.length > 0 && sessions.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Podsumowanie obecności studentów</h4>
          <div className="space-y-2">
            {students.map((student) => {
              const stats = getAttendanceStats(student.id);
              return (
                <div key={student.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{student.first_name} {student.last_name}</p>
                    <p className="text-xs text-muted-foreground">{student.index_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{stats.percentage}%</p>
                    <p className="text-xs text-muted-foreground">{stats.present}/{stats.total} obecności</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
