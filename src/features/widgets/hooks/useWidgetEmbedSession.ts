import { useCallback, useEffect, useRef, useState } from 'react';
import { getValidEmbedUrl } from '@/shared/utils/embedUrl';
import { db } from '@/shared/utils/db';
import { requestHostPermissionForUrl } from '@/shared/utils/hostPermission';
import { getLocalWebPageUrl } from '../services/localWebPageService';
import type { SortableWidgetProps } from '../components/sortable/SortableWidget.types';

export const useWidgetEmbedSession = (widget: SortableWidgetProps['widget']) => {
  const [embedReloadVersion, setEmbedReloadVersion] = useState(0);
  const [isEmbedPaused, setIsEmbedPaused] = useState(false);
  const [isEmbedAuthorizing, setIsEmbedAuthorizing] = useState(false);
  const [embedSessionIssue, setEmbedSessionIssue] = useState(false);
  const [localEmbedHtml, setLocalEmbedHtml] = useState<string | null>(null);
  const [localEmbedUrl, setLocalEmbedUrl] = useState<string | null>(null);
  const [localEmbedName, setLocalEmbedName] = useState('');
  const [localEmbedEntryPath, setLocalEmbedEntryPath] = useState<string | null>(null);
  const [isLocalEmbedLoading, setIsLocalEmbedLoading] = useState(false);
  const embedLoadTimesRef = useRef<number[]>([]);

  useEffect(() => {
    embedLoadTimesRef.current = [];
    setIsEmbedPaused(false);
    setEmbedSessionIssue(false);
  }, [widget.embedLocalId, widget.embedUrl]);

  useEffect(() => {
    if (!widget.embedLocalId) {
      setLocalEmbedHtml(null);
      setLocalEmbedUrl(null);
      setLocalEmbedName('');
      setLocalEmbedEntryPath(null);
      setIsLocalEmbedLoading(false);
      return;
    }
    let cancelled = false;
    setIsLocalEmbedLoading(true);
    void db.getLocalWebPage(widget.embedLocalId).then((item) => {
      if (cancelled) return;
      setLocalEmbedHtml(item?.kind === 'package' ? null : item?.html ?? null);
      setLocalEmbedUrl(item ? getLocalWebPageUrl(item) : null);
      setLocalEmbedName(item?.name ?? widget.embedLocalName ?? '本地网页');
      setLocalEmbedEntryPath(item?.kind === 'package' ? item.entryPath ?? null : null);
      setIsLocalEmbedLoading(false);
    });
    return () => { cancelled = true; };
  }, [widget.embedLocalId, widget.embedLocalName, widget.embedLocalUpdatedAt]);

  const handleEmbedLoad = useCallback(() => {
    if (widget.embedLocalId) return;
    const now = Date.now();
    const recentLoads = [...embedLoadTimesRef.current, now].filter((time) => now - time < 15000);
    embedLoadTimesRef.current = recentLoads;
    if (recentLoads.length >= 8) {
      setEmbedSessionIssue(true);
      setIsEmbedPaused(true);
    }
  }, [widget.embedLocalId]);

  const reloadEmbed = useCallback(() => {
    setEmbedSessionIssue(false);
    setIsEmbedPaused(false);
    setEmbedReloadVersion((version) => version + 1);
  }, []);

  const authorizeAndReloadEmbed = useCallback(async () => {
    const url = getValidEmbedUrl(widget.embedUrl);
    if (!url || isEmbedAuthorizing) return;
    setIsEmbedAuthorizing(true);
    try {
      const granted = await requestHostPermissionForUrl(url);
      if (!granted) {
        setEmbedSessionIssue(true);
        return;
      }
      embedLoadTimesRef.current = [];
      setEmbedSessionIssue(false);
      setIsEmbedPaused(false);
      setEmbedReloadVersion((version) => version + 1);
    } finally {
      setIsEmbedAuthorizing(false);
    }
  }, [isEmbedAuthorizing, widget.embedUrl]);

  return {
    authorizeAndReloadEmbed,
    embedReloadVersion,
    embedSessionIssue,
    handleEmbedLoad,
    isEmbedAuthorizing,
    isEmbedPaused,
    isLocalEmbedLoading,
    localEmbedHtml,
    localEmbedUrl,
    localEmbedName,
    localEmbedEntryPath,
    reloadEmbed,
  };
};
