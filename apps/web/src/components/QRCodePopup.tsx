import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export const QRCodePopup = ({ isOpen, onClose, url }: QRCodePopupProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-[10px] z-50 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-xl font-semibold text-foreground">Zeskanuj kod QR</h2>
            
            <div className="bg-white p-6 rounded-2xl">
              <QRCodeSVG 
                value={url} 
                size={240}
                level="H"
                includeMargin={false}
              />
            </div>
            
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Zeskanuj kod, aby przejść do strony przesyłania plików
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
