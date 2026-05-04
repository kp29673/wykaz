import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Terms = () => {
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
          <h1>Regulamin Strony</h1>
          
          <p className="text-muted-foreground">
            Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
          </p>

          <section>
            <h2>1. Postanowienia ogólne</h2>
            <p>
              Niniejszy regulamin określa zasady korzystania ze strony internetowej dostępnej pod adresem [adres strony].
            </p>
            <p>
              Właścicielem i administratorem strony jest Kosma Piekarski.
            </p>
          </section>

          <section>
            <h2>2. Definicje</h2>
            <ul>
              <li><strong>Serwis</strong> - strona internetowa dostępna pod adresem [adres strony]</li>
              <li><strong>Administrator</strong> - Kosma Piekarski</li>
              <li><strong>Użytkownik</strong> - każda osoba korzystająca z Serwisu</li>
            </ul>
          </section>

          <section>
            <h2>3. Zasady korzystania</h2>
            <p>Korzystanie z Serwisu jest dobrowolne i bezpłatne.</p>
            <p>Użytkownik zobowiązuje się do:</p>
            <ul>
              <li>Korzystania z Serwisu w sposób zgodny z prawem i dobrymi obyczajami</li>
              <li>Nienaruszania praw osób trzecich</li>
              <li>Niepodejmowania działań mogących zakłócić funkcjonowanie Serwisu</li>
            </ul>
          </section>

          <section>
            <h2>4. Materiały przesyłane przez użytkowników</h2>
            <p>
              Serwis może umożliwiać przesyłanie materiałów (plików, tekstów). W takim przypadku:
            </p>
            <ul>
              <li>Administrator nie odpowiada za treść materiałów przesyłanych przez Użytkowników</li>
              <li>Użytkownik ponosi pełną odpowiedzialność za przesłane materiały</li>
              <li>Zabronione jest przesyłanie treści niezgodnych z prawem, obraźliwych lub naruszających prawa osób trzecich</li>
              <li>Administrator zastrzega sobie prawo do usunięcia materiałów naruszających regulamin</li>
            </ul>
          </section>

          <section>
            <h2>5. Wyłączenie odpowiedzialności</h2>
            <p>
              Administrator nie ponosi odpowiedzialności za:
            </p>
            <ul>
              <li>Treści umieszczane przez Użytkowników</li>
              <li>Sposób wykorzystania Serwisu przez Użytkowników</li>
              <li>Szkody wynikające z korzystania lub niemożności korzystania z Serwisu</li>
              <li>Przerwanie lub ustanie funkcjonowania Serwisu</li>
            </ul>
          </section>

          <section>
            <h2>6. Własność intelektualna</h2>
            <p>
              Wszystkie materiały dostępne w Serwisie są chronione prawem autorskim i stanowią własność Administratora lub zostały użyte za zgodą właściciela praw.
            </p>
          </section>

          <section>
            <h2>7. Zmiany regulaminu</h2>
            <p>
              Administrator zastrzega sobie prawo do wprowadzania zmian w Regulaminie. 
              Zmiany wchodzą w życie z chwilą ich publikacji w Serwisie.
            </p>
          </section>

          <section>
            <h2>8. Postanowienia końcowe</h2>
            <p>
              W sprawach nieuregulowanych niniejszym Regulaminem stosuje się przepisy prawa polskiego.
            </p>
            <p>
              Wszelkie spory rozstrzygane będą przez właściwy sąd powszechny.
            </p>
          </section>

          <section>
            <h2>9. Kontakt</h2>
            <p>
              W sprawach dotyczących Serwisu lub Regulaminu prosimy o kontakt: [adres email]
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Terms;
