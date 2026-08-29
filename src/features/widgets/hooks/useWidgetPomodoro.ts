import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { SortableWidgetProps } from '../components/sortable/SortableWidget.types';

export const useWidgetPomodoro = (
  widget: SortableWidgetProps['widget'],
  onUpdate: SortableWidgetProps['onUpdate'],
  widgetRef: RefObject<HTMLDivElement>,
) => {
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'break'>('focus');
  const [focusMinutes, setFocusMinutes] = useState(() => widget.pomodoroFocusMinutes ?? 25);
  const [breakMinutes, setBreakMinutes] = useState(() => widget.pomodoroBreakMinutes ?? 5);
  const [secondsLeft, setSecondsLeft] = useState(() => (widget.pomodoroFocusMinutes ?? 25) * 60);
  const pomodoroDeadlineRef = useRef<number | null>(null);
  const pomodoroDurationsRef = useRef({
    focus: widget.pomodoroFocusMinutes ?? 25,
    break: widget.pomodoroBreakMinutes ?? 5,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isPomodoroMenuOpen, setIsPomodoroMenuOpen] = useState(false);
  const [pomodoroStatus, setPomodoroStatus] = useState('');

  useEffect(() => {
    const nextFocusMinutes = Math.max(1, Math.min(120, widget.pomodoroFocusMinutes ?? 25));
    const nextBreakMinutes = Math.max(1, Math.min(60, widget.pomodoroBreakMinutes ?? 5));
    const focusChanged = pomodoroDurationsRef.current.focus !== nextFocusMinutes;
    const breakChanged = pomodoroDurationsRef.current.break !== nextBreakMinutes;

    pomodoroDurationsRef.current = { focus: nextFocusMinutes, break: nextBreakMinutes };
    setFocusMinutes(nextFocusMinutes);
    setBreakMinutes(nextBreakMinutes);

    if (!isRunning && ((pomodoroMode === 'focus' && focusChanged) || (pomodoroMode === 'break' && breakChanged))) {
      setSecondsLeft((pomodoroMode === 'focus' ? nextFocusMinutes : nextBreakMinutes) * 60);
    }
  }, [isRunning, pomodoroMode, widget.pomodoroBreakMinutes, widget.pomodoroFocusMinutes]);

  useEffect(() => {
    if (!isRunning || pomodoroDeadlineRef.current === null) return;

    const updateRemainingTime = () => {
      const deadline = pomodoroDeadlineRef.current;
      if (deadline === null) return;
      const nextSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(nextSeconds);
      if (nextSeconds === 0) {
        const nextMode = pomodoroMode === 'focus' ? 'break' : 'focus';
        pomodoroDeadlineRef.current = null;
        setIsRunning(false);
        setPomodoroMode(nextMode);
        setSecondsLeft((nextMode === 'focus' ? focusMinutes : breakMinutes) * 60);
        setPomodoroStatus(pomodoroMode === 'focus' ? '专注完成，休息一下' : '休息结束，准备专注');
      }
    };

    updateRemainingTime();
    const timer = window.setInterval(updateRemainingTime, 250);
    return () => window.clearInterval(timer);
  }, [breakMinutes, focusMinutes, isRunning, pomodoroMode]);

  useEffect(() => {
    if (!isPomodoroMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPomodoroMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPomodoroMenuOpen]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const activePomodoroMinutes = pomodoroMode === 'focus' ? focusMinutes : breakMinutes;
  const pomodoroProgress = Math.min(1, Math.max(0, 1 - secondsLeft / Math.max(1, activePomodoroMinutes * 60)));
  const pomodoroHintText = isRunning
    ? (pomodoroMode === 'focus' ? '专注进行中' : '休息进行中')
    : (pomodoroStatus || '点击时间调整时长');
  const pomodoroMenuAnchor = widgetRef.current?.getBoundingClientRect();
  const pomodoroMenuStyle = pomodoroMenuAnchor ? {
    left: pomodoroMenuAnchor.right + 12 + 168 <= window.innerWidth ? pomodoroMenuAnchor.right + 12 : Math.max(12, pomodoroMenuAnchor.left - 180),
    top: Math.min(Math.max(12, pomodoroMenuAnchor.top + pomodoroMenuAnchor.height / 2 - 74), window.innerHeight - 160),
  } : { left: 12, top: 12 };

  const switchPomodoroMode = () => {
    const nextMode = pomodoroMode === 'focus' ? 'break' : 'focus';
    pomodoroDeadlineRef.current = null;
    setPomodoroMode(nextMode);
    setIsRunning(false);
    setIsPomodoroMenuOpen(false);
    setSecondsLeft((nextMode === 'focus' ? focusMinutes : breakMinutes) * 60);
    setPomodoroStatus(nextMode === 'focus' ? '已切换到专注' : '已切换到休息');
  };

  const setPomodoroDuration = useCallback((value: number) => {
    if (isRunning) return;
    if (pomodoroMode === 'focus') {
      const next = Math.max(1, Math.min(120, value));
      setFocusMinutes(next);
      setSecondsLeft(next * 60);
      onUpdate(widget.id, { pomodoroFocusMinutes: next });
      setPomodoroStatus(`专注时长已设为 ${next} 分钟`);
    } else {
      const next = Math.max(1, Math.min(60, value));
      setBreakMinutes(next);
      setSecondsLeft(next * 60);
      onUpdate(widget.id, { pomodoroBreakMinutes: next });
      setPomodoroStatus(`休息时长已设为 ${next} 分钟`);
    }
  }, [isRunning, onUpdate, pomodoroMode, widget.id]);

  const adjustPomodoroMinutes = (delta: number) => setPomodoroDuration(activePomodoroMinutes + delta);
  const setPomodoroMinutes = (value: number) => setPomodoroDuration(value);

  const togglePomodoro = () => {
    if (isRunning) {
      const deadline = pomodoroDeadlineRef.current;
      if (deadline !== null) {
        setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      }
      pomodoroDeadlineRef.current = null;
      setIsRunning(false);
      setPomodoroStatus('已暂停');
      return;
    }

    const duration = secondsLeft > 0 ? secondsLeft : activePomodoroMinutes * 60;
    if (secondsLeft === 0) setSecondsLeft(duration);
    pomodoroDeadlineRef.current = Date.now() + duration * 1000;
    setIsPomodoroMenuOpen(false);
    setPomodoroStatus('');
    setIsRunning(true);
  };

  const resetPomodoro = () => {
    pomodoroDeadlineRef.current = null;
    setIsRunning(false);
    setSecondsLeft(activePomodoroMinutes * 60);
    setPomodoroStatus('已重置');
  };

  return {
    activePomodoroMinutes,
    adjustPomodoroMinutes,
    isPomodoroMenuOpen,
    isRunning,
    minutes,
    pomodoroHintText,
    pomodoroMenuStyle,
    pomodoroMode,
    pomodoroProgress,
    resetPomodoro,
    seconds,
    setIsPomodoroMenuOpen,
    setPomodoroMinutes,
    switchPomodoroMode,
    togglePomodoro,
  };
};
