import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { QRCodePopup } from './QRCodePopup';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { Upload, QrCode, FileText, Settings, LogOut, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export const Header = () => {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const {
          data
        } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').single();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(async ({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const {
          data
        } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').single();
        setIsAdmin(!!data);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Wylogowano pomyślnie');
    navigate('/');
  };
  return <>
      <header className="fixed top-0 right-0 p-4 z-50 flex gap-2 items-center h-16">
        <ThemeToggle />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => setShowQR(true)}>
              <QrCode className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-popover border border-border">
            <p>QR Code</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate('/wykaz')}>
              <BookOpen className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-popover border border-border">
            <p>Wykaz MEiN</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate('/pastebin')}>
              <FileText className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-popover border border-border">
            <p>Pastebin</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate('/upload')}>
              <Upload className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-popover border border-border">
            <p>Upload</p>
          </TooltipContent>
        </Tooltip>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {user ? <>
            {isAdmin && <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate('/admin')}>
                    <Settings className="h-[1.2rem] w-[1.2rem]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-popover border border-border">
                  <p>Admin</p>
                </TooltipContent>
              </Tooltip>}
            <Button variant="secondary" className="rounded-full px-6 h-9" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Wyloguj
            </Button>
          </> : <Button variant="secondary" className="rounded-full px-6 h-9" onClick={() => navigate('/login')}>​Zaloguj</Button>}
      </header>
      
      <QRCodePopup isOpen={showQR} onClose={() => setShowQR(false)} url="https://kosmapiekarski.pl/upload" />
    </>;
};