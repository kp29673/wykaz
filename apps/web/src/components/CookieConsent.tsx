import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, Settings } from 'lucide-react';

interface ConsentData {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

interface CookieConsentProps {
  forceShow?: boolean;
}

export const CookieConsent = ({ forceShow = false }: CookieConsentProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, [forceShow]);

  const logConsent = async (consentData: ConsentData) => {
    try {
      // Log to Cloudflare Analytics or Workers
      await fetch('/api/log-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...consentData,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log consent:', error);
    }
  };

  const handleAccept = async () => {
    const consent: ConsentData = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    await logConsent(consent);
    setIsVisible(false);
  };

  const handleNecessaryOnly = async () => {
    const consent: ConsentData = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    await logConsent(consent);
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible && forceShow) {
      // Reset the parent state when popup is closed
      window.dispatchEvent(new Event('cookie-consent-closed'));
    }
  }, [isVisible, forceShow]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-sm">
        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Cookie className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm text-foreground mb-1">Pliki cookie</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Używamy plików cookie niezbędnych do działania strony oraz analitycznych w celach statystycznych.
              </p>
            </div>
          </div>
          
          {showDetails && (
            <div className="mb-3 p-3 bg-muted/30 rounded-xl space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">Niezbędne</span>
                <span className="text-muted-foreground">Zawsze aktywne</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">Analityczne</span>
                <span className="text-muted-foreground">Opcjonalne</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">Marketingowe</span>
                <span className="text-muted-foreground">Opcjonalne</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="rounded-full px-3 h-8 text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              {showDetails ? 'Ukryj' : 'Szczegóły'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNecessaryOnly}
              className="rounded-full px-3 h-8 text-xs flex-1"
            >
              Tylko niezbędne
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="rounded-full px-4 h-8 text-xs bg-foreground text-background hover:bg-foreground/90"
            >
              Akceptuję
            </Button>
          </div>
          
          <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
            Zgodnie z RODO przysługuje Ci prawo do wglądu, modyfikacji i usunięcia danych. 
            <a href="/privacy" className="underline ml-1">Polityka prywatności</a>
          </p>
        </div>
      </div>
    </div>
  );
};
