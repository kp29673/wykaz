import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const studentSchema = z.object({
  indexNumber: z.string().trim().min(1, 'Numer indeksu jest wymagany').max(50, 'Numer indeksu jest za długi'),
  email: z.string().trim().email('Nieprawidłowy format email').max(255, 'Email jest za długi'),
});

const formSchema = z.object({
  students: z.array(studentSchema).min(1, 'Dodaj przynajmniej jednego studenta'),
  comment: z.string().max(500, 'Komentarz nie może przekraczać 500 znaków').optional(),
  file: z.instanceof(File).refine((file) => file.size <= MAX_FILE_SIZE, {
    message: 'Plik nie może przekraczać 20MB',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface AssignmentSubmissionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: {
    id: string;
    title: string;
    deadline: string;
    max_points: number;
  };
  courseId: string;
  courseName: string;
}

export const AssignmentSubmissionForm = ({
  open,
  onOpenChange,
  assignment,
  courseId,
  courseName,
}: AssignmentSubmissionFormProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const deadline = new Date(assignment.deadline);
  const isOverdue = isPast(deadline);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      students: [{ indexNumber: '', email: '' }],
      comment: '',
    },
  });

  const addStudent = () => {
    const current = form.getValues('students');
    form.setValue('students', [...current, { indexNumber: '', email: '' }]);
  };

  const removeStudent = (index: number) => {
    const current = form.getValues('students');
    if (current.length > 1) {
      form.setValue('students', current.filter((_, i) => i !== index));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Plik jest za duży. Maksymalny rozmiar to 20MB.');
        return;
      }
      setSelectedFile(file);
      form.setValue('file', file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!selectedFile) {
      toast.error('Wybierz plik do przesłania');
      return;
    }

    setSubmitting(true);

    try {
      // Verify all students exist
      const studentsData = [];
      for (const student of values.students) {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('index_number', student.indexNumber)
          .eq('course_id', courseId)
          .maybeSingle();

        if (studentError || !studentData) {
          toast.error(`Nie znaleziono studenta o numerze indeksu: ${student.indexNumber}`);
          setSubmitting(false);
          return;
        }

        studentsData.push({
          ...studentData,
          email: student.email,
        });
      }

      // Generate unique file name using first student
      const fileExtension = selectedFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${courseId}/${assignment.id}/${studentsData[0].id}_${timestamp}.${fileExtension}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('assignment-submissions')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Błąd podczas przesyłania pliku');
        setSubmitting(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assignment-submissions')
        .getPublicUrl(fileName);

      // Create submission records for all students with unique tokens
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const submissionRecords = studentsData.map(student => {
        const verificationToken = crypto.randomUUID(); // Unique token per student
        return {
          assignment_id: assignment.id,
          student_id: student.id,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          comment: values.comment || null,
          is_late: isOverdue,
          verification_token: verificationToken,
          token_expires_at: expiresAt.toISOString(),
          student_email: student.email,
        };
      });

      const { error: insertError } = await supabase
        .from('assignment_submissions')
        .insert(submissionRecords);

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error('Błąd podczas zapisywania przesyłki');
        setSubmitting(false);
        return;
      }

      // Send verification emails to all students with unique URLs
      const { error: emailError } = await supabase.functions.invoke('send-verification-email', {
        body: {
          recipients: submissionRecords.map((record, index) => {
            const student = studentsData[index];
            return {
              email: student.email,
              studentName: `${student.first_name} ${student.last_name}`,
              indexNumber: student.index_number,
              verificationUrl: `${window.location.origin}/verify-submission?token=${record.verification_token}`,
            };
          }),
          courseName: courseName,
          assignmentTitle: assignment.title,
          fileName: fileName,
          fileUrl: urlData.publicUrl,
          comment: values.comment || '',
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast.warning('Przesłano pracę, ale nie udało się wysłać emaila weryfikacyjnego');
      }

      setSubmitted(true);
      toast.success('Praca została przesłana do wszystkich studentów!');

      // Reset form after a delay
      setTimeout(() => {
        form.reset();
        setSelectedFile(null);
        setSubmitted(false);
        onOpenChange(false);
      }, 3000);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Wystąpił nieoczekiwany błąd');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wyślij pracę</DialogTitle>
          <DialogDescription>{assignment.title}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Praca została przesłana!</h3>
              <p className="text-sm text-muted-foreground">
                Sprawdź swoją skrzynkę email i kliknij link weryfikacyjny, aby potwierdzić przesłanie.
              </p>
            </div>
          </div>
        ) : (
          <>
            {isOverdue && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Termin oddania minął. Praca zostanie oznaczona jako spóźniona.
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Ważne:</strong> Każdy autor projektu musi potwierdzić swój adres email klikając w link weryfikacyjny wysłany na podany adres. 
                Praca zostanie zaakceptowana dopiero po weryfikacji emaili wszystkich autorów.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 py-2">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Termin oddania:</span>
                  <span className="font-medium">{format(deadline, 'dd.MM.yyyy HH:mm', { locale: pl })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maksymalna liczba punktów:</span>
                  <span className="font-medium">{assignment.max_points}</span>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel>Studenci *</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStudent}
                      disabled={submitting}
                    >
                      Dodaj studenta
                    </Button>
                  </div>

                  {form.watch('students').map((_, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Student {index + 1}</span>
                        {form.watch('students').length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStudent(index)}
                            disabled={submitting}
                          >
                            Usuń
                          </Button>
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name={`students.${index}.indexNumber`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numer indeksu</FormLabel>
                            <FormControl>
                              <Input placeholder="np. 12345" {...field} disabled={submitting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`students.${index}.email`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="np. student@uczelnia.pl" {...field} disabled={submitting} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="file"
                  render={() => (
                    <FormItem>
                      <FormLabel>Plik pracy *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors bg-muted/20">
                              {selectedFile ? (
                                <div className="text-center space-y-1">
                                  <FileText className="h-8 w-8 text-primary mx-auto" />
                                  <p className="text-sm font-medium">{selectedFile.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              ) : (
                                <div className="text-center space-y-1">
                                  <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                                  <p className="text-sm text-muted-foreground">Kliknij aby wybrać plik</p>
                                  <p className="text-xs text-muted-foreground">Maksymalnie 20MB</p>
                                </div>
                              )}
                            </div>
                          </label>
                          <input
                            id="file-upload"
                            type="file"
                            onChange={handleFileChange}
                            disabled={submitting}
                            className="hidden"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Komentarz (opcjonalnie)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatkowe informacje..."
                          className="resize-none"
                          rows={3}
                          {...field}
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={submitting}>
                    Anuluj
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting || !selectedFile}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Wysyłanie...
                      </>
                    ) : (
                      'Wyślij pracę'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
