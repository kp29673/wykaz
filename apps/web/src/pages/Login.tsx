import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Header } from '@/components/Header';

const authSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email').max(255, 'Email nie może przekraczać 255 znaków'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków').max(100, 'Hasło nie może przekraczać 100 znaków'),
});

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/admin');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (blockedUntil) {
      const timer = setInterval(() => {
        if (Date.now() >= blockedUntil) {
          setBlockedUntil(null);
          setAttempts(0);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [blockedUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (blockedUntil && Date.now() < blockedUntil) {
      const remainingMinutes = Math.ceil((blockedUntil - Date.now()) / 60000);
      toast.error(`Zbyt wiele nieudanych prób. Spróbuj ponownie za ${remainingMinutes} minut.`);
      return;
    }
    
    try {
      authSchema.parse({ email: email.trim(), password });
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || 'Błąd walidacji');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          const blockTime = Date.now() + 15 * 60 * 1000;
          setBlockedUntil(blockTime);
          toast.error('Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.');
        } else {
          toast.error('Nieprawidłowy e-mail lub hasło.');
        }
        return;
      }

      toast.success('Zalogowano pomyślnie!');
      setAttempts(0);
    } catch (error: any) {
      toast.error('Wystąpił błąd podczas logowania');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Proszę podać adres email');
      return;
    }

    try {
      z.string().email().parse(email.trim());
    } catch {
      toast.error('Nieprawidłowy format adresu email');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        toast.error('Wystąpił błąd podczas wysyłania emaila resetującego');
        return;
      }

      setResetEmailSent(true);
      toast.success('Link do resetowania hasła został wysłany na podany email');
    } catch (error: any) {
      toast.error('Wystąpił błąd podczas wysyłania emaila');
    } finally {
      setLoading(false);
    }
  };

  if (showPasswordReset) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-normal text-foreground">
                Resetuj hasło
              </h1>
            </div>

            {resetEmailSent ? (
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  Link do resetowania hasła został wysłany na adres <strong className="text-foreground">{email}</strong>
                </p>
                <Button
                  onClick={() => {
                    setShowPasswordReset(false);
                    setResetEmailSent(false);
                  }}
                  variant="outline"
                  className="w-full h-12 rounded-full font-medium"
                >
                  Wróć do logowania
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm">
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="twoj@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                    className="h-12"
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-full font-medium"
                  >
                    {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setShowPasswordReset(false)}
                    variant="outline"
                    className="w-full h-12 rounded-full font-medium"
                  >
                    Anuluj
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-normal text-foreground">
              Zaloguj się przez email
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="twoj@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                disabled={loading || (blockedUntil !== null && Date.now() < blockedUntil)}
                className="h-12"
                aria-invalid={attempts > 0}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">
                  Hasło
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Zapomniałeś hasła?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading || (blockedUntil !== null && Date.now() < blockedUntil)}
                className="h-12"
                aria-invalid={attempts > 0}
              />
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading || (blockedUntil !== null && Date.now() < blockedUntil)}
                className="w-full h-12 rounded-full font-medium"
              >
                {loading ? 'Logowanie...' : 'Dalej'}
              </Button>

              <Button
                type="button"
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full h-12 rounded-full font-medium"
              >
                Wróć
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
