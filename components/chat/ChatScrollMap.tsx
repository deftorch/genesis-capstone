import React, { useEffect, useState, useRef } from 'react';

interface ChatScrollMapProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  messages: any[];
}

export const ChatScrollMap: React.FC<ChatScrollMapProps> = ({ containerRef, messages }) => {
  const [scrollData, setScrollData] = useState({
    scrollTop: 0,
    scrollHeight: 1,
    clientHeight: 1,
  });
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const [userMarkers, setUserMarkers] = useState<{ id: string; top: number; text: string; absoluteTop: number }[]>([]);

  const calculateMarkers = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollHeight = container.scrollHeight;
    
    const nodes = container.querySelectorAll('.user-message-marker');
    const markers: any[] = [];
    
    // We need to calculate absolute top relative to the scrollHeight
    // offsetTop of an element inside a relative container gives distance from that container's top.
    // If MessageItem is not absolute, its offsetTop relative to the scroll container works if we loop up to the scroll container.
    // A simpler way: getBoundingClientRect
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
    // Recalculate slightly after render to ensure DOM is updated and images loaded
    const t1 = setTimeout(calculateMarkers, 100);
    const t2 = setTimeout(calculateMarkers, 500);
    const t3 = setTimeout(calculateMarkers, 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollData({
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
      });
      
      setIsScrolling(true);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1200); // hide after 1.2s of no scrolling
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Initialize
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [containerRef]);

  if (userMarkers.length === 0) return null;

  // Find nearest user message
  const viewportCenter = scrollData.scrollTop + (scrollData.clientHeight / 2);
  let nearestMarker = userMarkers[0];
  let minDistance = Infinity;
  
  userMarkers.forEach(marker => {
    const dist = Math.abs(marker.absoluteTop - viewportCenter);
    if (dist < minDistance) {
      minDistance = dist;
      nearestMarker = marker;
    }
  });

  // Position of native scroll thumb top edge
  const thumbTopPercentage = (scrollData.scrollTop / scrollData.scrollHeight) * 100;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-3 pointer-events-none z-50">
      {/* Markers on the scrollbar track */}
      {userMarkers.map(marker => (
        <div
          key={marker.id}
          className="absolute right-1 w-1 h-2 rounded-full bg-gray-400 dark:bg-gray-500 opacity-40 transition-all"
          style={{ top: `${marker.top}%` }}
        />
      ))}
      
      {/* Active Scroll Tooltip */}
      <div 
        className={`absolute right-full mr-3 transition-opacity duration-300 ${isScrolling && nearestMarker ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          top: `${thumbTopPercentage}%`,
          transform: 'translateY(10px)' // roughly align with middle of thumb
        }}
      >
        {nearestMarker && (
          <div className="bg-[#1f2937]/90 dark:bg-[#0f172a]/90 backdrop-blur-sm text-white text-[11px] px-3 py-2 rounded-lg shadow-xl w-48 border border-white/10 pointer-events-none flex flex-col gap-1">
            <span className="text-[#60aaff] font-semibold text-[9px] uppercase tracking-wider">User Prompt</span>
            <span className="line-clamp-2 leading-relaxed">{nearestMarker.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
