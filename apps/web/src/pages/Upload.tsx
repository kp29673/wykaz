import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Upload = () => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "Błąd",
        description: "Proszę wprowadzić hasło",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Simulate checking password
    setTimeout(() => {
      const correctPassword = 'upload2024'; // Change this to your desired password
      
      if (password === correctPassword) {
        window.location.href = 'https://onedrive.live.com/?v=validatepermission&id=BA0510F3E1198724%217613&challengeToken=AE3xLWkIPXza9fw';
      } else {
        toast({
          title: "Nieprawidłowe hasło",
          description: "Wprowadzone hasło jest nieprawidłowe",
          variant: "destructive"
        });
        setIsLoading(false);
        setPassword('');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-light mb-2">Przesyłanie plików</h1>
                <p className="text-muted-foreground">Wprowadź hasło, aby uzyskać dostęp</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="w-full">
              <div className="relative">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wprowadź hasło..."
                  disabled={isLoading}
                  className="h-14 pl-6 pr-14 text-base bg-card border-border rounded-[24px] shadow-none outline-none focus:outline-none focus-visible:outline-none !ring-0 !ring-offset-0"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  disabled={isLoading}
                  className="absolute right-1 top-1 h-12 w-12 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Upload;
