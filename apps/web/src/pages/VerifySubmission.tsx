import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function VerifySubmission() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifySubmission(token);
    } else {
      setStatus('error');
      setMessage('Brak tokenu weryfikacyjnego');
    }
  }, [searchParams]);

  const verifySubmission = async (token: string) => {
    try {
      // First, fetch the submission to check expiration and status
      const { data: submission, error: fetchError } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          assignments (
            id,
            title,
            course_id
          ),
          students (
            first_name,
            last_name,
            index_number
          )
        `)
        .eq('verification_token', token)
        .single();

      if (fetchError || !submission) {
        setStatus('error');
        setMessage('Nieprawidłowy token weryfikacyjny');
        return;
      }

      // Check if already verified
      if (submission.email_verified) {
        setStatus('success');
        setMessage('Ta praca została już wcześniej zweryfikowana.');
        return;
      }

      // Check if token expired
      const expiresAt = new Date(submission.token_expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        setStatus('expired');
        setMessage('Link weryfikacyjny wygasł. Upłynęło 24 godziny od jego wygenerowania.');
        setSubmissionData(submission);
        return;
      }

      // Verify the submission
      const { error: updateError } = await supabase
        .from('assignment_submissions')
        .update({
          email_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq('verification_token', token);

      if (updateError) throw updateError;

      setStatus('success');
      setMessage('Wysłanie pracy zostało pomyślnie zweryfikowane!');
    } catch (error) {
      console.error('Error verifying submission:', error);
      setStatus('error');
      setMessage('Błąd podczas weryfikacji');
    }
  };

  const resendVerificationLink = async () => {
    if (!submissionData) return;
    
    setResending(true);
    try {
      // Generate new token with 24h expiration
      const newToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Update token in database
      const { error: updateError } = await supabase
        .from('assignment_submissions')
        .update({
          verification_token: newToken,
          token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', submissionData.id);

      if (updateError) throw updateError;

      // Fetch course name for email
      const { data: courseData } = await supabase
        .from('courses')
        .select('name')
        .eq('id', submissionData.assignments.course_id)
        .single();

      // Send new verification email
      const verificationUrl = `${window.location.origin}/verify-submission?token=${newToken}`;
      
      const { error: emailError } = await supabase.functions.invoke('send-verification-email', {
        body: {
          recipients: [{
            email: submissionData.student_email,
            studentName: `${submissionData.students.first_name} ${submissionData.students.last_name}`,
            indexNumber: submissionData.students.index_number,
            verificationUrl: verificationUrl,
          }],
          courseName: courseData?.name || 'Kurs',
          assignmentTitle: submissionData.assignments.title,
          fileName: submissionData.file_name,
          fileUrl: submissionData.file_url,
          comment: submissionData.comment || '',
        },
      });

      if (emailError) throw emailError;

      toast({
        title: 'Wysłano nowy link',
        description: 'Sprawdź swoją skrzynkę mailową i kliknij nowy link weryfikacyjny.',
      });
      
      setStatus('success');
      setMessage('Nowy link weryfikacyjny został wysłany. Sprawdź swoją skrzynkę mailową.');
    } catch (error) {
      console.error('Error resending verification:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać nowego linku weryfikacyjnego',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container mx-auto py-16 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Weryfikacja wysłania</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Weryfikacja w trakcie...</p>
            </div>
          )}

          {status === 'success' && (
            <>
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {message}
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/')} className="w-full">
                Wróć do strony głównej
              </Button>
            </>
          )}

          {status === 'expired' && (
            <>
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  {message}
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Linki weryfikacyjne są ważne przez 24 godziny od momentu przesłania pracy.
                </p>
                <Button 
                  onClick={resendVerificationLink} 
                  className="w-full"
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    'Wyślij nowy link weryfikacyjny'
                  )}
                </Button>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline" 
                  className="w-full"
                >
                  Wróć do strony głównej
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Wróć do strony głównej
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
