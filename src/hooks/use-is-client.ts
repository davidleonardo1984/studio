
import { useState, useEffect } from 'react';

// This hook helps to safely render client-only components
// without causing hydration mismatches in Next.js
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
