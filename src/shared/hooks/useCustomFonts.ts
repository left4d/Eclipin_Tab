/*
 * @Author: left4d 3190836003@qq.com
 * @Date: 2026-08-06 16:15:05
 * @LastEditors: left4d 3190836003@qq.com
 * @LastEditTime: 2026-08-07 04:56:56
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUILT_IN_FONTS,
  CUSTOM_FONT_CHANGED_EVENT,
  getCustomFontOptions,
  type CustomFontOption,
  type FontOption,
} from '@/shared/constants/builtInFonts';

/**
 * 统一提供内置字体与用户本地字体。
 *
 * 文件名与导出名统一使用 useCustomFonts，作为字体列表的唯一状态入口。
 */
export const useCustomFonts = () => {
  const [customFonts, setCustomFonts] = useState<CustomFontOption[]>([]);
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

  const fonts = useMemo<FontOption[]>(
    () => [...BUILT_IN_FONTS, ...customFonts],
    [customFonts],
  );

  return {
    fonts,
    customFonts,
    isLoadingFonts,
    refreshFonts,
    // 保留旧版调用字段，方便现有组件渐进迁移。
    isLoading: isLoadingFonts,
    refresh: refreshFonts,
  };
};
