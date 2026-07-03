import React, { useEffect, useState, useRef } from 'react';

interface ChatScrollMapProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  messages: any[];
}

export const ChatScrollMap: React.FC<ChatScrollMapProps> = ({ containerRef, messages }) => {
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [userMarkers, setUserMarkers] = useState<{ id: string; top: number; text: string; absoluteTop: number }[]>([]);

  const calculateMarkers = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollHeight = container.scrollHeight;
    
    const nodes = container.querySelectorAll('.user-message-marker');
    const markers: any[] = [];
    const containerRect = container.getBoundingClientRect();
    
    nodes.forEach(node => {
      const el = node as HTMLElement;
      const elRect = el.getBoundingClientRect();
      const absoluteTop = (elRect.top - containerRect.top) + container.scrollTop;
      const percentage = (absoluteTop / scrollHeight) * 100;
      
      markers.push({
        id: el.getAttribute('data-msg-id') || '',
        text: el.getAttribute('data-msg-text') || '',
        top: percentage,
        absoluteTop,
      });
    });
    
    setUserMarkers(markers);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const t1 = setTimeout(calculateMarkers, 100);
    const t2 = setTimeout(calculateMarkers, 500);
    const t3 = setTimeout(calculateMarkers, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [messages]);

  if (userMarkers.length === 0) return null;

  const scrollToMessage = (id: string) => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-msg-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="absolute right-1 top-0 bottom-0 w-4 pointer-events-none z-50">
      {/* The Track Line */}
      <div className="absolute left-1/2 -translate-x-1/2 w-[1px] bg-[#1e468c]/10 dark:bg-white/10 top-4 bottom-4" />

      {userMarkers.map(marker => (
        <div
          key={marker.id}
          className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gray-500/60 dark:bg-gray-400/50 hover:bg-[#1a6adf] dark:hover:bg-[#60aaff] hover:scale-[2] transition-all duration-200 pointer-events-auto cursor-pointer"
          style={{ top: `${marker.top}%`, marginTop: '-3px' }}
          onMouseEnter={() => setHoveredMarkerId(marker.id)}
          onMouseLeave={() => setHoveredMarkerId(null)}
          onClick={() => scrollToMessage(marker.id)}
        >
          {hoveredMarkerId === marker.id && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 w-48 bg-[#1f2937]/95 dark:bg-[#0f172a]/95 backdrop-blur-md text-white text-[11px] px-3 py-2.5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/10 pointer-events-none flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 origin-right duration-150">
              <span className="text-[#60aaff] font-bold text-[9px] uppercase tracking-wider">User Prompt</span>
              <span className="line-clamp-2 leading-relaxed text-gray-200">{marker.text}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
