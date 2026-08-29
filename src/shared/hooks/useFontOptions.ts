import { useCallback, useEffect, useState } from 'react';
import {
  BUILT_IN_FONTS,
  CUSTOM_FONT_CHANGED_EVENT,
  getCustomFontOptions,
  type FontOption,
} from '@/shared/constants/builtInFonts';

export const useFontOptions = () => {
  const [customFonts, setCustomFonts] = useState<FontOption[]>([]);
  const [isLoadingFonts, setIsLoadingFonts] = useState(true);

  const refreshFonts = useCallback(async () => {
    setIsLoadingFonts(true);
    try {
      setCustomFonts(await getCustomFontOptions());
    } finally {
      setIsLoadingFonts(false);
    }
  }, []);

  useEffect(() => {
    void refreshFonts();
    const handleChanged = () => { void refreshFonts(); };
    window.addEventListener(CUSTOM_FONT_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(CUSTOM_FONT_CHANGED_EVENT, handleChanged);
  }, [refreshFonts]);

  return {
    fonts: [...BUILT_IN_FONTS, ...customFonts] as FontOption[],
    customFonts,
    isLoadingFonts,
    refreshFonts,
  };
};
