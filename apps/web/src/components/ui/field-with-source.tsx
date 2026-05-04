import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { Building2, Microscope, BookOpen, Unlock, ExternalLink } from "lucide-react";

interface FieldWithSourceProps {
  label: string;
  value: any;
  source?: string;
  updatedAt?: string;
  method?: string;
  meinLink?: string;
  className?: string;
}

const sourceIcons: Record<string, React.ReactNode> = {
  openalex: <Microscope className="h-3 w-3" />,
  crossref: <BookOpen className="h-3 w-3" />,
  mein_wykaz: <Building2 className="h-3 w-3" />,
  doaj: <Unlock className="h-3 w-3" />
};

const sourceLabels: Record<string, string> = {
  openalex: "OpenAlex",
  crossref: "Crossref",
  mein_wykaz: "MEiN",
  doaj: "DOAJ"
};

export function FieldWithSource({ 
  label, 
  value, 
  source, 
  updatedAt,
  method,
  meinLink,
  className = ""
}: FieldWithSourceProps) {
  if (value === null || value === undefined) return null;

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="flex-1">
        <span className="text-sm text-muted-foreground">{label}:</span>
        <span className="ml-2 font-semibold">
          {typeof value === 'number' && !Number.isInteger(value) 
            ? value.toFixed(2) 
            : value}
        </span>
      </div>
      
      {source && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-help shrink-0 gap-1 flex items-center">
                {sourceIcons[source]}
                <span>{sourceLabels[source] || source}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <div className="font-semibold">Źródło: {sourceLabels[source] || source}</div>
                {updatedAt && (
                  <div className="text-xs text-muted-foreground">
                    Zaktualizowano: {format(parseISO(updatedAt), 'dd.MM.yyyy HH:mm', { locale: pl })}
                  </div>
                )}
                {method && (
                  <div className="text-xs text-muted-foreground">
                    Metoda: {method}
                  </div>
                )}
                {meinLink && (
                  <a 
                    href={meinLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-2 pt-2 border-t border-border/30"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Oficjalny wykaz MEiN
                  </a>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}