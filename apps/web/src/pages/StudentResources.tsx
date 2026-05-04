import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const StudentResources = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Wprowadź kod zasobu');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_codes')
        .select('course_id, courses(id, code)')
        .eq('code', code.trim().toLowerCase())
        .single();

      if (error || !data) {
        toast.error('Nieprawidłowy kod zasobu');
        setLoading(false);
        return;
      }

      navigate(`/course/${data.courses.code}`);
    } catch (error) {
      toast.error('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-20">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Powrót
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif mb-4">Zasoby Studenckie</h1>
            <p className="text-muted-foreground text-lg">
              Wprowadź kod zasobu, aby uzyskać dostęp do materiałów kursu
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Kod Zasobu
              </label>
              <Input
                id="code"
                type="text"
                placeholder="np. fizjo-zp01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-lg py-6"
              />
              <p className="text-sm text-muted-foreground">
                Wpisz kod otrzymany od wykładowcy
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg"
              disabled={loading}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {loading ? 'Sprawdzanie...' : 'Uzyskaj dostęp'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default StudentResources;
