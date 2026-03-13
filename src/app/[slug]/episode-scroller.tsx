'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function EpisodeScroller() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ep = searchParams.get('ep');
    if (!ep) return;
    // Small delay to let the page render fully before scrolling
    const timer = setTimeout(() => {
      const el = document.getElementById(`ep-${ep}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Brief highlight flash so the user knows which episode was linked
        el.style.transition = 'background-color 0.4s ease';
        el.style.backgroundColor = '#f0fdf8';
        setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchParams]);

  return null;
}
