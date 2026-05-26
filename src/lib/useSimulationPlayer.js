"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MONTHS_TOTAL = 60;

// Milliseconds between month advances at each speed setting.
// 1× → ~20 s total; 2× → ~10 s; 4× → ~5 s.
const INTERVAL_MS = { 1: 333, 2: 167, 4: 83 };

/**
 * Animation engine for the simulation player.
 *
 * Uses requestAnimationFrame and timestamp-based stepping so the speed is
 * independent of frame rate.  Refs are used for all mutable state that must be
 * read inside the rAF callback to avoid stale-closure bugs.
 *
 * Returns:
 *   currentMonth  – 0 (not started) or 1–60
 *   isPlaying     – bool
 *   speed         – 1 | 2 | 4
 *   isComplete    – true when currentMonth === 60
 *   play()        – starts / resumes (resets to 0 if already complete)
 *   pause()       – freezes without resetting
 *   reset()       – stops and resets to month 0
 *   scrub(month)  – jump to a specific month (pauses playback)
 *   setSpeed(n)   – change speed mid-play; takes effect immediately
 */
export function useSimulationPlayer() {
  const [currentMonth, setCurrentMonth] = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [speed, setSpeedState]          = useState(1);

  // Refs to avoid stale closures in the rAF callback
  const monthRef   = useRef(0);
  const speedRef   = useRef(1);
  const rafRef     = useRef(null);
  const lastTickRef = useRef(null);
  // Separate flag so the callback can check without reading React state
  const playingRef = useRef(false);

  // ── helpers ──────────────────────────────────────────────────────────────

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTickRef.current = null;
  }, []);

  // ── rAF tick ─────────────────────────────────────────────────────────────

  const tick = useCallback(
    (timestamp) => {
      if (!playingRef.current) return;

      // First frame: just record start time, don't advance yet
      if (lastTickRef.current === null) {
        lastTickRef.current = timestamp;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed  = timestamp - lastTickRef.current;
      const interval = INTERVAL_MS[speedRef.current] ?? INTERVAL_MS[1];

      if (elapsed >= interval) {
        const steps = Math.max(1, Math.floor(elapsed / interval));
        lastTickRef.current = timestamp - (elapsed % interval);

        const next = Math.min(monthRef.current + steps, MONTHS_TOTAL);
        monthRef.current = next;
        setCurrentMonth(next);

        if (next >= MONTHS_TOTAL) {
          // Reached end — stop without rescheduling
          playingRef.current = false;
          setIsPlaying(false);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [] // no deps — uses only refs
  );

  // ── public API ────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    if (monthRef.current >= MONTHS_TOTAL) {
      // Replay from start
      monthRef.current = 0;
      setCurrentMonth(0);
    }
    playingRef.current = true;
    setIsPlaying(true);
    lastTickRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    cancelRaf();
  }, [cancelRaf]);

  const reset = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    cancelRaf();
    monthRef.current = 0;
    setCurrentMonth(0);
  }, [cancelRaf]);

  const scrub = useCallback(
    (month) => {
      const m = Math.max(0, Math.min(MONTHS_TOTAL, Math.round(month)));
      // Pause if scrubbing to end
      if (m >= MONTHS_TOTAL && playingRef.current) {
        playingRef.current = false;
        setIsPlaying(false);
        cancelRaf();
      }
      monthRef.current = m;
      setCurrentMonth(m);
    },
    [cancelRaf]
  );

  const setSpeed = useCallback((s) => {
    speedRef.current = s;
    setSpeedState(s);
    // Reset last-tick so the next interval is measured from now
    lastTickRef.current = null;
  }, []);

  // ── cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => () => cancelRaf(), [cancelRaf]);

  // ── derived ───────────────────────────────────────────────────────────────

  return {
    currentMonth,
    isPlaying,
    speed,
    play,
    pause,
    reset,
    scrub,
    setSpeed,
    isComplete: currentMonth >= MONTHS_TOTAL,
  };
}
