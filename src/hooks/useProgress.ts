import { useMemo, useState } from "react";
import { allExercises, lessons } from "../data/course";
import type { ProgressState, Quality, ReviewItem } from "../types";

const STORAGE_KEY = "gm-progress-v1";

const defaultProgress: ProgressState = {
  completedLessons: [],
  reviewItems: {},
  lastQuality: {},
  settings: {
    speechRate: 0.82,
    voiceURI: "",
  },
};

const readProgress = (): ProgressState => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultProgress;
    return { ...defaultProgress, ...JSON.parse(saved) } as ProgressState;
  } catch {
    return defaultProgress;
  }
};

const nextInterval = (item: ReviewItem | undefined, quality: Quality) => {
  if (quality === "again") return 1 / 24;
  if (quality === "hard") return Math.max(1, item?.intervalDays ?? 1);
  const current = item?.intervalDays ?? 0;
  if (current < 1) return 1;
  if (current < 3) return 3;
  if (current < 7) return 7;
  return Math.min(30, Math.round(current * 1.8));
};

const persist = (state: ProgressState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export function useProgress() {
  const [progress, setProgressState] = useState<ProgressState>(readProgress);

  const setProgress = (updater: (current: ProgressState) => ProgressState) => {
    setProgressState((current) => {
      const next = updater(current);
      persist(next);
      return next;
    });
  };

  const completedSet = useMemo(() => new Set(progress.completedLessons), [progress.completedLessons]);
  const dueReviews = useMemo(() => {
    const now = Date.now();
    return Object.values(progress.reviewItems)
      .filter((item) => item.dueAt <= now)
      .sort((a, b) => a.dueAt - b.dueAt);
  }, [progress.reviewItems]);

  const weakCount = useMemo(
    () => Object.values(progress.lastQuality).filter((quality) => quality === "again" || quality === "hard").length,
    [progress.lastQuality],
  );

  const nextLesson = lessons.find((item) => !completedSet.has(item.id)) ?? lessons[lessons.length - 1];

  const completeLesson = (lessonId: string) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    setProgress((current) => {
      const completedLessons = current.completedLessons.includes(lessonId)
        ? current.completedLessons
        : [...current.completedLessons, lessonId];
      const reviewItems = { ...current.reviewItems };
      const now = Date.now();

      for (const exercise of lesson.exercises) {
        reviewItems[exercise.id] = {
          exerciseId: exercise.id,
          lessonId,
          dueAt: now,
          intervalDays: 0,
          repetitions: 0,
          quality: "hard",
        };
      }

      return { ...current, completedLessons, reviewItems };
    });
  };

  const recordReview = (exerciseId: string, lessonId: string, quality: Quality) => {
    setProgress((current) => {
      const currentItem = current.reviewItems[exerciseId];
      const intervalDays = nextInterval(currentItem, quality);
      const dueAt = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
      const reviewItems = {
        ...current.reviewItems,
        [exerciseId]: {
          exerciseId,
          lessonId,
          dueAt,
          intervalDays,
          repetitions: (currentItem?.repetitions ?? 0) + 1,
          quality,
        },
      };

      return {
        ...current,
        reviewItems,
        lastQuality: { ...current.lastQuality, [exerciseId]: quality },
      };
    });
  };

  const updateSettings = (settings: Partial<ProgressState["settings"]>) => {
    setProgress((current) => ({ ...current, settings: { ...current.settings, ...settings } }));
  };

  const resetProgress = () => {
    persist(defaultProgress);
    setProgressState(defaultProgress);
  };

  const comfortCount = Object.values(progress.lastQuality).filter((quality) => quality === "good").length;
  const reviewTotal = allExercises.filter((exercise) => progress.reviewItems[exercise.id]).length;
  const conceptStats = useMemo(() => {
    const stats = new Map<string, { comfortable: number; weak: number; seen: number; total: number }>();

    for (const exercise of allExercises) {
      for (const tag of exercise.tags) {
        const current = stats.get(tag) ?? { comfortable: 0, weak: 0, seen: 0, total: 0 };
        const quality = progress.lastQuality[exercise.id];
        current.total += 1;
        if (quality) current.seen += 1;
        if (quality === "good") current.comfortable += 1;
        if (quality === "again" || quality === "hard") current.weak += 1;
        stats.set(tag, current);
      }
    }

    return [...stats.entries()]
      .map(([tag, item]) => ({
        tag,
        ...item,
        score: item.total === 0 ? 0 : Math.round((item.comfortable / item.total) * 100),
      }))
      .sort((a, b) => b.seen - a.seen || b.weak - a.weak || a.tag.localeCompare(b.tag))
      .slice(0, 12);
  }, [progress.lastQuality]);

  return {
    progress,
    completedSet,
    dueReviews,
    weakCount,
    comfortCount,
    reviewTotal,
    conceptStats,
    nextLesson,
    completeLesson,
    recordReview,
    updateSettings,
    resetProgress,
  };
}
