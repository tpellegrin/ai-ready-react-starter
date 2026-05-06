import { useEffect, useState } from 'react';

// Taken from https://usehooks-ts.com/react-hook/use-media-query

export function useMediaQuery(rawQuery: string): boolean {
  const formattedQuery = rawQuery.slice(7);

  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(formattedQuery));

  function handleChange() {
    setMatches(getMatches(formattedQuery));
  }

  useEffect(() => {
    const matchMedia = window.matchMedia(formattedQuery);

    // Triggered at the first client-side load and if query changes
    handleChange();

    // Listen matchMedia
    if (matchMedia.addListener) {
      matchMedia.addListener(handleChange);
    } else {
      matchMedia.addEventListener('change', handleChange);
    }

    return () => {
      if (matchMedia.removeListener) {
        matchMedia.removeListener(handleChange);
      } else {
        matchMedia.removeEventListener('change', handleChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formattedQuery]);

  return matches;
}
