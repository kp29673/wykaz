import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trophy, Edit, Trash2, X, Save } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  index_number: string;
}

interface GradeItem {
  id: string;
  name: string;
  max_points: number;
  weight: number;
}

interface GradeRecord {
  id: string;
  student_id: string;
  grade_item_id: string;
  points: number | null;
  grade: string | null;
  notes: string | null;
}

interface GradingScale {
  id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
}

interface GradeManagementProps {
  courseId: string;
}

export const GradeManagement = ({ courseId }: GradeManagementProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeItems, setGradeItems] = useState<GradeItem[]>([]);
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingRecords, setEditingRecords] = useState<Record<string, { points: string }>>({});
  const [itemFormData, setItemFormData] = useState({
    name: '',
    max_points: '',
    weight: '',
  });

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      const [studentsRes, itemsRes, recordsRes, scalesRes] = await Promise.all([
        supabase.from('students').select('*').eq('course_id', courseId).order('last_name'),
        supabase.from('grade_items').select('*').eq('course_id', courseId).order('name'),
        supabase.from('grade_records').select('*'),
        supabase.from('grading_scales').select('*').eq('course_id', courseId).order('min_percentage')
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (recordsRes.error) throw recordsRes.error;
      if (scalesRes.error) throw scalesRes.error;

      setStudents(studentsRes.data || []);
      setGradeItems(itemsRes.data || []);
      setGradeRecords(recordsRes.data || []);
      setGradingScales(scalesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const itemData = {
        course_id: courseId,
        name: itemFormData.name,
        max_points: parseInt(itemFormData.max_points),
        weight: parseFloat(itemFormData.weight),
      };

      if (editingItemId) {
        const { error } = await supabase
          .from('grade_items')
          .update(itemData)
          .eq('id', editingItemId);

        if (error) throw error;
        toast.success('Składowa zaktualizowana');
      } else {
        const { data: newItem, error } = await supabase
          .from('grade_items')
          .insert(itemData)
          .select()
          .single();

        if (error) throw error;

        // Create grade records for all students
        const records = students.map(student => ({
          grade_item_id: newItem.id,
          student_id: student.id,
          points: null,
          grade: null,
        }));

        const { error: recordsError } = await supabase
          .from('grade_records')
          .insert(records);

        if (recordsError) throw recordsError;
        toast.success('Składowa dodana');
      }

      fetchData();
      resetItemForm();
    } catch (error) {
      console.error('Error saving grade item:', error);
      toast.error('Błąd zapisu');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Czy na pewno usunąć tę składową oceny?')) return;

    try {
      const { error } = await supabase
        .from('grade_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Składowa usunięta');
      fetchData();
    } catch (error) {
      console.error('Error deleting grade item:', error);
      toast.error('Błąd usuwania');
    }
  };

  const handleEditRecord = (studentId: string, itemId: string) => {
    const key = `${studentId}-${itemId}`;
    const record = gradeRecords.find(
      r => r.student_id === studentId && r.grade_item_id === itemId
    );
    setEditingRecords({
      ...editingRecords,
      [key]: { 
        points: record?.points?.toString() || '',
      }
    });
  };

  const calculateLetterGrade = (percentage: number): string | null => {
    if (gradingScales.length === 0) return null;
    
    const scale = gradingScales.find(
      s => percentage >= s.min_percentage && percentage <= s.max_percentage
    );
    
    return scale?.grade || null;
  };

  const handleSaveRecord = async (studentId: string, itemId: string) => {
    const key = `${studentId}-${itemId}`;
    const editData = editingRecords[key];
    if (!editData) return;

    try {
      const record = gradeRecords.find(
        r => r.student_id === studentId && r.grade_item_id === itemId
      );

      const points = editData.points ? parseFloat(editData.points) : null;
      
      // Calculate final grade percentage and letter grade
      let letterGrade = null;
      if (points !== null) {
        const finalPercentage = calculateFinalGrade(studentId);
        if (finalPercentage !== null) {
          letterGrade = calculateLetterGrade(finalPercentage);
        }
      }

      const recordData = {
        points,
        grade: letterGrade,
      };

      if (record) {
        const { error } = await supabase
          .from('grade_records')
          .update(recordData)
          .eq('id', record.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grade_records')
          .insert({
            student_id: studentId,
            grade_item_id: itemId,
            ...recordData,
          });

        if (error) throw error;
      }

      const newEditingRecords = { ...editingRecords };
      delete newEditingRecords[key];
      setEditingRecords(newEditingRecords);
      
      fetchData();
      toast.success('Ocena zapisana');
    } catch (error) {
      console.error('Error saving grade record:', error);
      toast.error('Błąd zapisu oceny');
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      name: '',
      max_points: '',
      weight: '',
    });
    setEditingItemId(null);
    setShowItemForm(false);
  };

  const calculateFinalGrade = (studentId: string) => {
    let totalWeightedPoints = 0;
    let totalWeight = 0;

    gradeItems.forEach(item => {
      const record = gradeRecords.find(
        r => r.student_id === studentId && r.grade_item_id === item.id
      );
      if (record?.points !== null && record?.points !== undefined) {
        const percentage = (record.points / item.max_points) * 100;
        totalWeightedPoints += percentage * item.weight;
        totalWeight += item.weight;
      }
    });

    if (totalWeight === 0) return null;
    return Math.round(totalWeightedPoints / totalWeight);
  };

  if (loading) {
    return <div className="text-muted-foreground">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Oceny</h3>
        <Button onClick={() => setShowItemForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj składową
        </Button>
      </div>

      {showItemForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold">
              {editingItemId ? 'Edytuj składową' : 'Nowa składowa oceny'}
            </h4>
            <Button variant="ghost" size="icon" onClick={resetItemForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmitItem} className="space-y-4">
            <div>
              <Label htmlFor="name">Nazwa składowej *</Label>
              <Input
                id="name"
                value={itemFormData.name}
                onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                placeholder="np. Egzamin, Projekt, Kolokwium 1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_points">Maksymalna liczba punktów *</Label>
                <Input
                  id="max_points"
                  type="number"
                  min="1"
                  value={itemFormData.max_points}
                  onChange={(e) => setItemFormData({ ...itemFormData, max_points: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="weight">Waga (0-1) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={itemFormData.weight}
                  onChange={(e) => setItemFormData({ ...itemFormData, weight: e.target.value })}
                  placeholder="np. 0.3 dla 30%"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">{editingItemId ? 'Zapisz zmiany' : 'Dodaj składową'}</Button>
              <Button type="button" variant="outline" onClick={resetItemForm}>
                Anuluj
              </Button>
            </div>
          </form>
        </Card>
      )}

      {gradeItems.length > 0 && (
        <Card className="p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-semibold">Student</th>
                {gradeItems.map(item => (
                  <th key={item.id} className="text-center py-2 px-2 min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.max_points}pkt • waga {item.weight}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </th>
                ))}
                <th className="text-center py-2 px-2 font-semibold">Średnia</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const finalGrade = calculateFinalGrade(student.id);
                return (
                  <tr key={student.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-muted-foreground">{student.index_number}</p>
                      </div>
                    </td>
                    {gradeItems.map(item => {
                      const record = gradeRecords.find(
                        r => r.student_id === student.id && r.grade_item_id === item.id
                      );
                      const key = `${student.id}-${item.id}`;
                      const isEditing = !!editingRecords[key];

                      return (
                        <td key={item.id} className="py-2 px-2 text-center">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                max={item.max_points}
                                value={editingRecords[key].points}
                                onChange={(e) => setEditingRecords({
                                  ...editingRecords,
                                  [key]: { ...editingRecords[key], points: e.target.value }
                                })}
                                placeholder="Punkty"
                                className="h-8 text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveRecord(student.id, item.id)}
                                className="h-6 gap-1"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleEditRecord(student.id, item.id)}
                              className="cursor-pointer hover:bg-muted p-2 rounded"
                            >
                              {record && record.points !== null && record.points !== undefined ? (
                                <div>
                                  <p className="font-semibold">{record.points}/{item.max_points}</p>
                                  {record.grade && <p className="text-xs text-muted-foreground">{record.grade}</p>}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">Kliknij aby edytować</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center">
                      {finalGrade !== null ? (
                        <div className="font-semibold">
                          <div className="text-lg text-primary">
                            {calculateLetterGrade(finalGrade) || '-'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {finalGrade}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {gradeItems.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Brak składowych oceny. Dodaj pierwszą składową aby rozpocząć.
        </p>
      )}
    </div>
  );
};
