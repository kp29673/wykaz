import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { Header } from '@/components/Header';
import { CookieConsent } from '@/components/CookieConsent';
import { Footer } from '@/components/Footer';

const Index = () => {
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  useEffect(() => {
    const handleClose = () => setShowCookieSettings(false);
    window.addEventListener('cookie-consent-closed', handleClose);
    return () => window.removeEventListener('cookie-consent-closed', handleClose);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-12 w-full flex-1 justify-center">
          <SearchBar />
        </div>
        <Footer onCookieSettingsClick={() => setShowCookieSettings(true)} />
      </main>
      
      <CookieConsent forceShow={showCookieSettings} />
    </div>
  );
};

export default Index;
