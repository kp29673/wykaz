import { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchResults } from './SearchResults';

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

const profileLinks: SearchResult[] = [
  {
    title: 'Zasoby dla studentów',
    url: '/student-resources',
    description: 'Prezentacje, materiały dydaktyczne i zasoby edukacyjne'
  },
  {
    title: 'Wykaz czasopism punktowanych MEiN',
    url: '/wykaz',
    description: 'Wyszukiwarka czasopism naukowych z punktacją ministerialną'
  }
];

const placeholderSuggestions = [
  'Zasoby dla studentów',
  'Wykaz czasopism MEiN',
];

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

export const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchBarRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length > 0) {
      const filtered = profileLinks.filter(
        link =>
          link.title.toLowerCase().includes(query.toLowerCase()) ||
          link.description.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setShowDropdown(true);
      updateDropdownPosition();
    } else if (isFocused) {
      setResults(profileLinks);
      setShowDropdown(true);
      updateDropdownPosition();
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query, isFocused]);

  const updateDropdownPosition = () => {
    if (searchBarRef.current) {
      const rect = searchBarRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (!isFocused && !query) {
      intervalRef.current = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderSuggestions.length);
      }, 3000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isFocused, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => {
        setIsFocused(false);
        setShowDropdown(false);
        setIsClosing(false);
        
        // Reset position on mobile
        if (window.innerWidth < 768 && containerRef.current) {
          containerRef.current.style.position = 'static';
          containerRef.current.style.transform = 'none';
        }
      }, 150);
    }, 200);
  };

  const handleFocusWithScroll = () => {
    setIsFocused(true);
    updateDropdownPosition();
    
    // On mobile, move searchbar to top
    if (window.innerWidth < 768 && containerRef.current) {
      containerRef.current.style.position = 'fixed';
      containerRef.current.style.top = '80px';
      containerRef.current.style.left = '50%';
      containerRef.current.style.transform = 'translateX(-50%)';
      containerRef.current.style.transition = 'all 0.3s ease-out';
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-[672px] relative">
      <div ref={searchBarRef}>
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <div className="relative">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={handleFocusWithScroll}
                onBlur={handleBlur}
                style={{
                  borderBottomLeftRadius: showDropdown ? '0' : '24px',
                  borderBottomRightRadius: showDropdown ? '0' : '24px',
                  borderBottomWidth: showDropdown ? '0' : '1px',
                  transition: 'border-radius 0.15s ease-out, border-bottom-width 0.15s ease-out'
                }}
                className="h-12 pl-10 pr-6 py-2 text-base bg-card border border-border rounded-t-[24px] shadow-none outline-none focus:outline-none focus-visible:outline-none !ring-0 !ring-offset-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 active:shadow-none"
              />
              {!query && !isFocused && (
                <div className="absolute left-11 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden h-5">
                  <div
                    key={placeholderIndex}
                    className="text-muted-foreground text-base animate-fade-in"
                  >
                    {placeholderSuggestions[placeholderIndex]}
                  </div>
                </div>
              )}
            </div>
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-10 w-10 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground z-10"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <SearchResults 
            query={query} 
            results={results}
            position={dropdownPosition}
            isClosing={isClosing}
          />
        </>
      )}
    </div>
  );
};
