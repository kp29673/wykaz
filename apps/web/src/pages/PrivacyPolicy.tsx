import { Header } from '@/components/Header';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Wróć
        </Button>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>Polityka Prywatności</h1>
          
          <p className="text-muted-foreground">
            Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
          </p>

          <section>
            <h2>1. Administrator danych</h2>
            <p>
              Administratorem danych osobowych jest Kosma Piekarski, kontakt: [adres email].
            </p>
          </section>

          <section>
            <h2>2. Jakie dane zbieramy</h2>
            <p>Podczas korzystania z naszej strony możemy zbierać następujące dane:</p>
            <ul>
              <li>Adres IP</li>
              <li>Typ przeglądarki i urządzenia</li>
              <li>Dane o aktywności na stronie (przez cookies analityczne)</li>
              <li>Dane kontaktowe podane dobrowolnie przez użytkownika</li>
            </ul>
          </section>

          <section>
            <h2>3. Cel przetwarzania danych</h2>
            <p>Dane osobowe są przetwarzane w celu:</p>
            <ul>
              <li>Zapewnienia poprawnego działania strony</li>
              <li>Analizy ruchu i ulepszania serwisu</li>
              <li>Komunikacji z użytkownikami</li>
              <li>Wypełnienia obowiązków prawnych</li>
            </ul>
          </section>

          <section>
            <h2>4. Podstawa prawna</h2>
            <p>
              Przetwarzanie danych odbywa się na podstawie:
            </p>
            <ul>
              <li>Zgody użytkownika (art. 6 ust. 1 lit. a RODO)</li>
              <li>Prawnie uzasadnionego interesu administratora (art. 6 ust. 1 lit. f RODO)</li>
            </ul>
          </section>

          <section>
            <h2>5. Cookies</h2>
            <p>
              Nasza strona używa plików cookies. Szczegółowe informacje znajdują się w naszej{' '}
              <Link to="/" className="text-primary hover:underline">
                polityce cookies
              </Link>.
            </p>
          </section>

          <section>
            <h2>6. Udostępnianie danych</h2>
            <p>
              Dane osobowe mogą być udostępniane wyłącznie:
            </p>
            <ul>
              <li>Organom uprawnionym na podstawie przepisów prawa</li>
              <li>Podmiotom przetwarzającym dane w naszym imieniu (np. dostawcy hostingu)</li>
            </ul>
          </section>

          <section>
            <h2>7. Prawa użytkownika</h2>
            <p>Użytkownik ma prawo do:</p>
            <ul>
              <li>Dostępu do swoich danych</li>
              <li>Sprostowania danych</li>
              <li>Usunięcia danych</li>
              <li>Ograniczenia przetwarzania</li>
              <li>Przenoszenia danych</li>
              <li>Wniesienia sprzeciwu wobec przetwarzania</li>
              <li>Cofnięcia zgody w dowolnym momencie</li>
            </ul>
          </section>

          <section>
            <h2>8. Kontakt</h2>
            <p>
              W sprawach dotyczących danych osobowych prosimy o kontakt: [adres email]
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
