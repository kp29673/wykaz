import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type FollowCursorTooltipProps = {
  content: React.ReactNode;
  offset?: { x: number; y: number };
  className?: string;
  children: React.ReactElement;
};

export function FollowCursorTooltip({ 
  content, 
  offset = { x: 12, y: 12 }, 
  className, 
  children 
}: FollowCursorTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);

  function onMove(e: React.MouseEvent) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const cx = e.clientX;
    const cy = e.clientY;
    
    rafRef.current = requestAnimationFrame(() => {
      let x = cx + offset.x;
      let y = cy + offset.y;

      // Clamp to viewport edges if tooltip is rendered
      if (tipRef.current && open) {
        const rect = tipRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 10;
        const maxY = window.innerHeight - rect.height - 10;
        
        x = Math.min(x, maxX);
        y = Math.min(y, maxY);
        x = Math.max(10, x);
        y = Math.max(10, y);
      }

      setPos({ x, y });
    });
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const trigger = (
    <span 
      onMouseEnter={() => setOpen(true)} 
      onMouseLeave={() => setOpen(false)} 
      onMouseMove={onMove}
      style={{ display: "inline-block" }}
    >
      {children}
    </span>
  );

  const style: React.CSSProperties = {
    position: "fixed",
    left: pos.x,
    top: pos.y,
    pointerEvents: "none",
    zIndex: 9999,
  };

  return (
    <>
      {trigger}
      {open && createPortal(
        <div 
          ref={tipRef} 
          style={style} 
          className={cn(
            "rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md animate-fade-in",
            className
          )}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
