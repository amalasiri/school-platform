import { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';

// Max upload size in MB as configured on the server (GOOGLE_DRIVE_MAX_FILE_SIZE_MB). null until loaded.
export function useMaxFileSizeMb(): number | null {
  const [maxMb, setMaxMb] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    storageService.getMaxFileSizeMb().then((mb) => {
      if (active) setMaxMb(mb);
    });
    return () => {
      active = false;
    };
  }, []);

  return maxMb;
}
