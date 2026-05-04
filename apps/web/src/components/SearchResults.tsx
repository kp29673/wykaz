import { Search, ChevronRight } from 'lucide-react';

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  position: { top: number; left: number; width: number };
  isClosing: boolean;
}

export const SearchResults = ({ query, results, position, isClosing }: SearchResultsProps) => {
  const hasQuery = query.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <div 
      className={`fixed bg-card border-x border-b border-border rounded-b-[24px] shadow-2xl overflow-hidden z-50 ${isClosing ? 'animate-slideUp' : 'animate-slideDown'}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        transformOrigin: 'center -24px'
      }}
    >
      <div className="max-h-[320px] overflow-y-auto scrollbar-hide">
        {!hasResults && hasQuery ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nie znaleziono wyników dla "<span className="text-foreground font-medium">{query}</span>"
            </p>
          </div>
        ) : (
          results.map((result, index) => {
            const isInternal = result.url.startsWith('/');
            
            const content = (
              <div className="flex items-center gap-3 group">
                <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-colors group-hover:text-foreground" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {result.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {result.description}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-all group-hover:text-foreground group-hover:translate-x-1" />
              </div>
            );

            if (isInternal) {
              return (
                <a
                  key={index}
                  href={result.url}
                  className="block px-4 py-2.5 hover:bg-accent/60 transition-all duration-150 border-b border-border/20 last:border-b-0"
                >
                  {content}
                </a>
              );
            }

            return (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2.5 hover:bg-accent/60 transition-all duration-150 border-b border-border/20 last:border-b-0"
              >
                {content}
              </a>
            );
          })
        )}
      </div>
    </div>
  );
};
