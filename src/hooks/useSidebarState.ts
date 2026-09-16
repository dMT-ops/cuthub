import { useState, useEffect, useCallback, useRef } from 'react';

const PIN_STORAGE_KEY = 'cuthub:sidebar:pinned';

export function useSidebarState() {
  const [isPinned, setIsPinned] = useState(() => {
    try {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // matchMedia para isMobile
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    
    // Set initial
    setIsMobile(mediaQuery.matches);
    
    // Listener de mudança
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback para browsers antigos
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  const togglePin = useCallback(() => {
    setIsPinned((prev: boolean) => {
      const next = !prev;
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  }, []);
  
  // Limpar os timers no unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Forçar abertura pelo teclado (focus)
  const handleFocus = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(true);
  }, []);
  
  const handleBlur = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  }, []);

  const isExpanded = isPinned || isHovered;

  return {
    isPinned,
    isHovered,
    isMobile,
    isExpanded,
    togglePin,
    handleMouseEnter,
    handleMouseLeave,
    handleFocus,
    handleBlur
  };
}
