import { useEffect, useRef, useState } from 'react';
import type { SortableWidgetProps } from '../components/sortable/SortableWidget.types';

type NoteInlineFormat = 'underline' | 'strike';

const NOTE_FORMAT_MARKERS: Record<NoteInlineFormat, string> = {
  underline: '++',
  strike: '~~',
};

export const useWidgetNotes = (
  widget: SortableWidgetProps['widget'],
  onUpdate: SortableWidgetProps['onUpdate'],
) => {
  const noteTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [noteDraft, setNoteDraft] = useState(() => widget.noteText ?? '');
  const [isNoteEditing, setIsNoteEditing] = useState(false);

  useEffect(() => {
    if (widget.type !== 'notes' || isNoteEditing) return;
    setNoteDraft(widget.noteText ?? '');
  }, [isNoteEditing, widget.noteText, widget.type]);

  useEffect(() => {
    if (widget.type !== 'notes' || !isNoteEditing || noteDraft === (widget.noteText ?? '')) return;
    const timer = window.setTimeout(() => onUpdate(widget.id, { noteText: noteDraft }), 350);
    return () => window.clearTimeout(timer);
  }, [isNoteEditing, noteDraft, onUpdate, widget.id, widget.noteText, widget.type]);

  const noteFontSize = widget.noteFontSize ?? 18;
  const commitNote = () => {
    if (widget.type === 'notes' && noteDraft !== (widget.noteText ?? '')) {
      onUpdate(widget.id, { noteText: noteDraft });
    }
  };
  const openNoteEditor = () => {
    setIsNoteEditing(true);
    requestAnimationFrame(() => noteTextAreaRef.current?.focus());
  };
  const showNotePreview = () => {
    commitNote();
    setIsNoteEditing(false);
  };
  const updateNoteFontSize = (delta: number) => {
    onUpdate(widget.id, { noteFontSize: Math.max(12, Math.min(34, noteFontSize + delta)) });
  };

  const applyNoteInlineFormat = (format: NoteInlineFormat) => {
    const textarea = noteTextAreaRef.current;
    if (!textarea) return;

    const marker = NOTE_FORMAT_MARKERS[format];
    const markerLength = marker.length;
    const rawStart = textarea.selectionStart ?? 0;
    const rawEnd = textarea.selectionEnd ?? rawStart;

    // No explicit selection: format the whole current line instead of inserting
    // an empty marker pair at the caret. This makes typing `ddd` and pressing U
    // produce `++ddd++` (and S -> `~~ddd~~`) in one click.
    let start = rawStart;
    let end = rawEnd;
    if (rawStart === rawEnd) {
      const lineStart = rawStart > 0 ? noteDraft.lastIndexOf('\n', rawStart - 1) + 1 : 0;
      const nextBreak = noteDraft.indexOf('\n', rawStart);
      const lineEnd = nextBreak === -1 ? noteDraft.length : nextBreak;
      const lineText = noteDraft.slice(lineStart, lineEnd);

      if (lineText.length > 0) {
        start = lineStart;
        end = lineEnd;
      }
    }

    const before = noteDraft.slice(0, start);
    const selected = noteDraft.slice(start, end);
    const after = noteDraft.slice(end);
    const selectedHasMarkers = selected.length >= markerLength * 2
      && selected.startsWith(marker)
      && selected.endsWith(marker);
    const hasOuterMarkers = start >= markerLength
      && before.endsWith(marker)
      && after.startsWith(marker);

    let nextDraft: string;
    let nextStart: number;
    let nextEnd: number;

    if (selectedHasMarkers) {
      const inner = selected.slice(markerLength, -markerLength);
      nextDraft = `${before}${inner}${after}`;
      nextStart = start;
      nextEnd = start + inner.length;
    } else if (hasOuterMarkers) {
      nextDraft = `${before.slice(0, -markerLength)}${selected}${after.slice(markerLength)}`;
      nextStart = start - markerLength;
      nextEnd = end - markerLength;
    } else {
      nextDraft = `${before}${marker}${selected}${marker}${after}`;
      nextStart = start + markerLength;
      nextEnd = end + markerLength;
    }

    setNoteDraft(nextDraft);
    requestAnimationFrame(() => {
      const current = noteTextAreaRef.current;
      if (!current) return;
      current.focus();
      current.setSelectionRange(nextStart, nextEnd);
    });
  };

  return {
    applyNoteInlineFormat,
    commitNote,
    isNoteEditing,
    noteDraft,
    noteFontSize,
    noteTextAreaRef,
    openNoteEditor,
    setIsNoteEditing,
    setNoteDraft,
    showNotePreview,
    updateNoteFontSize,
  };
};
