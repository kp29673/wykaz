import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, ExternalLink, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Journal } from "@/lib/wykazApi";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import DOMPurify from "dompurify";

interface WikipediaData {
  extract: string;
  extract_html: string;
  thumbnail?: string;
  fullUrl: string;
  lang: string;
}

interface WikipediaSectionProps {
  journal: Journal;
}

export function WikipediaSection({ journal }: WikipediaSectionProps) {
  const [data, setData] = useState<WikipediaData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fullArticleHtml, setFullArticleHtml] = useState<string | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  useEffect(() => {
    if (!journal.wikipedia_url) return;

    // Check localStorage cache
    const cacheKey = `wiki_${journal.journal_id}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Cache valid for 7 days
        if (age < 7 * 24 * 60 * 60 * 1000) {
          setData(cachedData);
          return;
        }
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }

    fetchWikipediaData();
  }, [journal.wikipedia_url, journal.journal_id]);

  const extractTitleFromUrl = (url: string): string => {
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  const fetchWikipediaData = async () => {
    if (!journal.wikipedia_url) return;
    
    setIsLoading(true);
    try {
      const title = journal.wikipedia_title || extractTitleFromUrl(journal.wikipedia_url);
      const lang = journal.wikipedia_lang || 'en';
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Wikipedia API request failed');
      }
      
      const json = await response.json();
      
      const wikipediaData: WikipediaData = {
        extract: json.extract || '',
        extract_html: json.extract_html || '',
        thumbnail: json.thumbnail?.source,
        fullUrl: json.content_urls?.desktop?.page || journal.wikipedia_url,
        lang: lang
      };
      
      // Cache in localStorage
      localStorage.setItem(`wiki_${journal.journal_id}`, JSON.stringify({
        data: wikipediaData,
        timestamp: Date.now()
      }));
      
      setData(wikipediaData);
    } catch (error) {
      console.error('Wikipedia fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFullArticle = async () => {
    if (!journal.wikipedia_url || fullArticleHtml) return;
    
    setIsLoadingFull(true);
    try {
      const title = journal.wikipedia_title || extractTitleFromUrl(journal.wikipedia_url);
      const lang = journal.wikipedia_lang || 'en';
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch full article');
      }
      
      const html = await response.text();
      setFullArticleHtml(html);
    } catch (error) {
      console.error('Full article fetch error:', error);
    } finally {
      setIsLoadingFull(false);
    }
  };

  const handleReadMore = () => {
    setIsDialogOpen(true);
    if (!fullArticleHtml) {
      fetchFullArticle();
    }
  };

  if (!journal.wikipedia_url) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const languageLabel = data.lang === 'pl' ? '🇵🇱 Polski' : data.lang === 'en' ? '🇬🇧 English' : data.lang.toUpperCase();

  return (
    <>
      <div className="relative space-y-3 p-4 border rounded-lg bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-blue-950/20 dark:via-purple-950/15 dark:to-pink-950/20 overflow-hidden">
        {/* Gradient Icon Background - Top Left */}
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400/20 via-purple-400/15 to-pink-400/10 rounded-full blur-2xl" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800">
              <BookOpen className="h-3 w-3 mr-1 text-blue-600 dark:text-blue-400" />
              Wikipedia
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              {languageLabel}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">Dane z Wikipedii - zewnętrzne źródło informacji.</p>
              <p className="text-xs mt-1">Treść pobierana dynamicznie, nie zapisywana w bazie.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="relative flex gap-4">
          {data.thumbnail && (
            <img 
              src={data.thumbnail} 
              alt={journal.title}
              className="w-32 h-32 object-cover rounded-md shadow-sm flex-shrink-0 border border-border"
              loading="lazy"
            />
          )}
          
          <div className="flex-1 space-y-3">
            {/* Full first paragraph with HTML formatting */}
            <div 
              className="text-sm leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.extract_html || data.extract || '') }}
            />
            
            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleReadMore}
                className="bg-white/80 dark:bg-gray-900/80"
              >
                <BookOpen className="h-3 w-3 mr-1" />
                Czytaj więcej na stronie
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                asChild
                className="bg-white/80 dark:bg-gray-900/80"
              >
                <a href={data.fullUrl} target="_blank" rel="noopener noreferrer">
                  Otwórz na Wikipedii <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Footer with Source */}
        <div className="relative text-xs text-muted-foreground pt-2 border-t border-border/50">
          Źródło: <a href={data.fullUrl} className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">{data.fullUrl}</a>
          {journal.wikipedia_checked_at && (
            <> • Sprawdzono: {format(new Date(journal.wikipedia_checked_at), 'dd.MM.yyyy', { locale: pl })}</>
          )}
        </div>
      </div>

      {/* Full Article Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              {journal.title} - Artykuł z Wikipedii
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            {isLoadingFull ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-32 w-full mt-4" />
              </div>
            ) : fullArticleHtml ? (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fullArticleHtml) }}
              />
            ) : (
              <p className="text-muted-foreground">Ładowanie artykułu...</p>
            )}
          </ScrollArea>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              asChild
            >
              <a href={data.fullUrl} target="_blank" rel="noopener noreferrer">
                Czytaj na Wikipedii <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
            <Button onClick={() => setIsDialogOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
