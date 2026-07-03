import { useMemo, useState } from "react";
import { allExercises, canDoStatements, exerciseById, lessons, localObjectives } from "../data/course";
import type { CanDoStatus, LocalMemory, OnboardingPath, ProgressState, Quality, ReviewItem } from "../types";

const STORAGE_KEY = "gm-progress-v2";
const LEGACY_STORAGE_KEY = "gm-progress-v1";

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const defaultLocalMemory = (): LocalMemory => ({
  name: "Lukas",
  personality: "Patient, funny, football-loving Berliner who keeps German simple and asks natural follow-up questions.",
  relationship: "New local",
  facts: ["Lukas likes football.", "Lukas lives in Berlin."],
  exchanges: 0,
});

const emptyProgress = (): ProgressState => ({
  completedLessons: [],
  reviewItems: {},
  lastQuality: {},
  onboardingPath: "",
  unlockedLessonIndex: 0,
  dailyPlan: {},
  canDoState: {},
  conceptMastery: {},
  reviewHistory: {},
  localMemory: defaultLocalMemory(),
  settings: {
    speechRate: 0.82,
    voiceURI: "",
    speechMode: "auto",
    reviewLimit: 5,
    showPronunciation: true,
    autoPlayGerman: false,
  },
});

const isQuality = (value: unknown): value is Quality => value === "again" || value === "hard" || value === "good";

const cleanLastQuality = (value: unknown): Record<string, Quality> => {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([id, quality]) => exerciseById.has(id) && isQuality(quality)),
  ) as Record<string, Quality>;
};

const cleanReviewItems = (value: unknown): Record<string, ReviewItem> => {
  if (!value || typeof value !== "object") return {};
  const items: Record<string, ReviewItem> = {};
  for (const [id, raw] of Object.entries(value as Record<string, Partial<ReviewItem>>)) {
    if (!exerciseById.has(id) || !raw.lessonId) continue;
    const exercise = exerciseById.get(id);
    items[id] = {
      exerciseId: id,
      lessonId: raw.lessonId,
      dueAt: typeof raw.dueAt === "number" ? raw.dueAt : Date.now(),
      intervalDays: typeof raw.intervalDays === "number" ? raw.intervalDays : 0,
      repetitions: typeof raw.repetitions === "number" ? raw.repetitions : 0,
      quality: isQuality(raw.quality) ? raw.quality : "hard",
      reviewMode: raw.reviewMode ?? exercise?.reviewMode,
    };
  }
  return items;
};

const conceptCategories = [
  "articles",
  "noun gender",
  "present verbs",
  "word order",
  "questions",
  "accusative",
  "dative",
  "modal verbs",
  "Perfekt",
  "separable verbs",
  "weil/reasons",
  "conversation survival",
] as const;

const conceptsForExercise = (exercise: (typeof allExercises)[number]) => {
  const tags = exercise.tags.map((tag) => tag.toLowerCase());
  const concepts = new Set<string>();
  const addWhen = (concept: (typeof conceptCategories)[number], test: (tag: string) => boolean) => {
    if (tags.some(test)) concepts.add(concept);
  };

  addWhen("articles", (tag) => tag.includes("article") || tag.includes("case"));
  addWhen("noun gender", (tag) => tag.includes("noun gender") || tag.includes("articles and nouns"));
  addWhen("present verbs", (tag) => tag.includes("present verbs"));
  addWhen("word order", (tag) => tag.includes("word order"));
  addWhen("questions", (tag) => tag.includes("question"));
  addWhen("accusative", (tag) => tag.includes("accusative"));
  addWhen("dative", (tag) => tag.includes("dative"));
  addWhen("modal verbs", (tag) => tag.includes("modal"));
  addWhen("Perfekt", (tag) => tag.includes("perfekt") || tag.includes("past tense"));
  addWhen("separable verbs", (tag) => tag.includes("separable"));
  addWhen("weil/reasons", (tag) => tag.includes("weil") || tag.includes("reason"));
  addWhen("conversation survival", (tag) => tag.includes("conversation") || tag.includes("dialogue") || tag.includes("local text"));

  if (exercise.reviewMode === "respondInChat" || exercise.type === "dialogue") concepts.add("conversation survival");
  if (exercise.reviewMode === "buildIt") concepts.add("word order");
  if (exercise.reviewMode === "chooseArticle") concepts.add("articles");
  if (concepts.size === 0) concepts.add("conversation survival");
  return concepts;
};

const buildCanDoState = (completedLessons: string[]): Record<string, CanDoStatus> => {
  const completed = new Set(completedLessons);
  const state: Record<string, CanDoStatus> = {};
  for (const item of canDoStatements) {
    state[item.text] = completed.has(item.lessonId) ? "comfortable" : "locked";
  }
  const nextLesson = lessons.find((lesson) => !completed.has(lesson.id));
  if (nextLesson && state[nextLesson.canDo] !== "comfortable") {
    state[nextLesson.canDo] = "practicing";
  }
  return state;
};

const buildConceptMastery = (
  lastQuality: Record<string, Quality>,
): ProgressState["conceptMastery"] => {
  const stats: ProgressState["conceptMastery"] = Object.fromEntries(
    conceptCategories.map((concept) => [concept, { comfortable: 0, weak: 0, seen: 0, total: 0, score: 0 }]),
  );
  for (const exercise of allExercises) {
    for (const concept of conceptsForExercise(exercise)) {
      const current = stats[concept] ?? { comfortable: 0, weak: 0, seen: 0, total: 0, score: 0 };
      const quality = lastQuality[exercise.id];
      current.total += 1;
      if (quality) current.seen += 1;
      if (quality === "good") current.comfortable += 1;
      if (quality === "again" || quality === "hard") current.weak += 1;
      current.score = current.total === 0 ? 0 : Math.round((current.comfortable / current.total) * 100);
      stats[concept] = current;
    }
  }
  return stats;
};

const mergeProgress = (raw: Partial<ProgressState>): ProgressState => {
  const base = emptyProgress();
  const completedLessons = Array.isArray(raw.completedLessons)
    ? raw.completedLessons.filter((id) => lessons.some((lesson) => lesson.id === id))
    : [];
  const lastQuality = cleanLastQuality(raw.lastQuality);
  const reviewItems = cleanReviewItems(raw.reviewItems);
  const onboardingPath =
    raw.onboardingPath === "new" || raw.onboardingPath === "basics" || raw.onboardingPath === "travel"
      ? raw.onboardingPath
      : "";

  return {
    ...base,
    ...raw,
    completedLessons,
    reviewItems,
    lastQuality,
    onboardingPath,
    unlockedLessonIndex: Math.max(raw.unlockedLessonIndex ?? 0, completedLessons.length),
    dailyPlan: raw.dailyPlan && typeof raw.dailyPlan === "object" ? raw.dailyPlan : {},
    canDoState: { ...buildCanDoState(completedLessons), ...(raw.canDoState ?? {}) },
    conceptMastery: buildConceptMastery(lastQuality),
    reviewHistory: raw.reviewHistory && typeof raw.reviewHistory === "object" ? raw.reviewHistory : {},
    localMemory: { ...base.localMemory, ...(raw.localMemory ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}) },
  };
};

const persist = (state: ProgressState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const migrateLegacy = (): ProgressState | undefined => {
  const saved = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!saved) return undefined;
  try {
    const migrated = mergeProgress(JSON.parse(saved) as Partial<ProgressState>);
    persist(migrated);
    return migrated;
  } catch {
    return undefined;
  }
};

const readProgress = (): ProgressState => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return migrateLegacy() ?? emptyProgress();
    return mergeProgress(JSON.parse(saved) as Partial<ProgressState>);
  } catch {
    return emptyProgress();
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

const qualityRank = (quality: Quality) => {
  if (quality === "again") return 0;
  if (quality === "hard") return 1;
  return 2;
};

const lessonIndexForPath = (path: OnboardingPath) => {
  if (path === "new") return 0;
  if (path === "basics") return 7;
  const travelIndex = lessons.findIndex((lesson) => lesson.track === "travel");
  return travelIndex >= 0 ? travelIndex : 0;
};

const reviewableExercises = (lessonId: string) => {
  const lesson = lessons.find((item) => item.id === lessonId);
  return lesson?.exercises.filter((exercise) => exercise.type !== "teach" && exercise.type !== "listenRepeat") ?? [];
};

export function useProgress() {
  const [progress, setProgressState] = useState<ProgressState>(readProgress);

  const setProgress = (updater: (current: ProgressState) => ProgressState) => {
    setProgressState((current) => {
      const updated = updater(current);
      const lastQuality = cleanLastQuality(updated.lastQuality);
      const next = mergeProgress({
        ...updated,
        lastQuality,
        canDoState: buildCanDoState(updated.completedLessons),
        conceptMastery: buildConceptMastery(lastQuality),
      });
      persist(next);
      return next;
    });
  };

  const completedSet = useMemo(() => new Set(progress.completedLessons), [progress.completedLessons]);
  const dueReviews = useMemo(() => {
    const now = Date.now();
    return Object.values(progress.reviewItems)
      .filter((item) => item.dueAt <= now)
      .sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality) || a.dueAt - b.dueAt);
  }, [progress.reviewItems]);

  const weakCount = useMemo(
    () => Object.values(progress.lastQuality).filter((quality) => quality === "again" || quality === "hard").length,
    [progress.lastQuality],
  );

  const nextLesson = useMemo(() => {
    const startIndex = progress.onboardingPath ? lessonIndexForPath(progress.onboardingPath) : 0;
    const unlockIndex = Math.max(startIndex, progress.unlockedLessonIndex);
    return (
      lessons.find((lesson, index) => index >= unlockIndex && !completedSet.has(lesson.id)) ??
      lessons.find((lesson) => !completedSet.has(lesson.id)) ??
      lessons[lessons.length - 1]
    );
  }, [completedSet, progress.onboardingPath, progress.unlockedLessonIndex]);

  const dailyReviewItems = useMemo(
    () => dueReviews.slice(0, Math.min(20, Math.max(3, progress.settings.reviewLimit || 5))),
    [dueReviews, progress.settings.reviewLimit],
  );
  const dailyLocalExercise = useMemo(() => {
    const nextLocal = nextLesson.exercises.find((exercise) => exercise.type === "localText");
    return nextLocal ?? localObjectives.find((exercise) => !progress.lastQuality[exercise.id]) ?? localObjectives[0];
  }, [nextLesson, progress.lastQuality]);

  const dailyPlan = useMemo(
    () => ({
      date: dayKey(),
      lesson: nextLesson,
      reviewItems: dailyReviewItems,
      localExercise: dailyLocalExercise,
      completed: progress.dailyPlan[dayKey()]?.completed ?? [],
    }),
    [dailyLocalExercise, dailyReviewItems, nextLesson, progress.dailyPlan],
  );

  const chooseOnboardingPath = (path: OnboardingPath) => {
    setProgress((current) => {
      const startIndex = lessonIndexForPath(path);
      const completedLessons =
        path === "basics"
          ? lessons.slice(0, startIndex).map((lesson) => lesson.id)
          : current.completedLessons;
      return {
        ...current,
        onboardingPath: path,
        unlockedLessonIndex: startIndex,
        completedLessons: Array.from(new Set([...current.completedLessons, ...completedLessons])),
      };
    });
  };

  const completeLesson = (lessonId: string) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;

    setProgress((current) => {
      const completedLessons = current.completedLessons.includes(lessonId)
        ? current.completedLessons
        : [...current.completedLessons, lessonId];
      const reviewItems = { ...current.reviewItems };
      const now = Date.now();
      const today = dayKey();

      for (const exercise of reviewableExercises(lessonId)) {
        reviewItems[exercise.id] = {
          exerciseId: exercise.id,
          lessonId,
          dueAt: now,
          intervalDays: 0,
          repetitions: 0,
          quality: "hard",
          reviewMode: exercise.reviewMode,
        };
      }

      return {
        ...current,
        completedLessons,
        reviewItems,
        unlockedLessonIndex: Math.max(current.unlockedLessonIndex, lesson.number),
        dailyPlan: {
          ...current.dailyPlan,
          [today]: {
            ...(current.dailyPlan[today] ?? { reviewed: [], completed: [] }),
            lessonId,
            completed: Array.from(new Set([...(current.dailyPlan[today]?.completed ?? []), "lesson"])),
          },
        },
      };
    });
  };

  const recordReview = (exerciseId: string, lessonId: string, quality: Quality) => {
    setProgress((current) => {
      const currentItem = current.reviewItems[exerciseId];
      const exercise = exerciseById.get(exerciseId);
      const intervalDays = nextInterval(currentItem, quality);
      const dueAt = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
      const today = dayKey();
      const reviewItems = {
        ...current.reviewItems,
        [exerciseId]: {
          exerciseId,
          lessonId,
          dueAt,
          intervalDays,
          repetitions: (currentItem?.repetitions ?? 0) + 1,
          quality,
          reviewMode: exercise?.reviewMode,
        },
      };

      return {
        ...current,
        reviewItems,
        lastQuality: { ...current.lastQuality, [exerciseId]: quality },
        reviewHistory: {
          ...current.reviewHistory,
          [exerciseId]: [
            ...(current.reviewHistory[exerciseId] ?? []),
            { at: Date.now(), quality, reviewMode: exercise?.reviewMode },
          ],
        },
        dailyPlan: {
          ...current.dailyPlan,
          [today]: {
            ...(current.dailyPlan[today] ?? { reviewed: [], completed: [] }),
            reviewed: Array.from(new Set([...(current.dailyPlan[today]?.reviewed ?? []), exerciseId])),
            completed: Array.from(
              new Set([
                ...(current.dailyPlan[today]?.completed ?? []),
                exercise?.type === "localText" ? "local" : "review",
              ]),
            ),
          },
        },
      };
    });
  };

  const updateSettings = (settings: Partial<ProgressState["settings"]>) => {
    setProgress((current) => ({ ...current, settings: { ...current.settings, ...settings } }));
  };

  const recordLocalExchange = (text: string, objective?: string) => {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    setProgress((current) => {
      const exchanges = current.localMemory.exchanges + 1;
      const relationship = exchanges >= 18 ? "Regular contact" : exchanges >= 8 ? "Familiar local" : "New local";
      const fact = trimmed.length > 90 ? `${trimmed.slice(0, 87)}...` : trimmed;
      const facts = Array.from(new Set([...current.localMemory.facts, fact])).slice(-8);
      return {
        ...current,
        localMemory: {
          ...current.localMemory,
          facts,
          exchanges,
          relationship,
          lastObjective: objective,
        },
      };
    });
  };

  const resetProgress = () => {
    const next = emptyProgress();
    persist(next);
    setProgressState(next);
  };

  const comfortCount = Object.values(progress.lastQuality).filter((quality) => quality === "good").length;
  const reviewTotal = allExercises.filter((exercise) => progress.reviewItems[exercise.id]).length;
  const conceptStats = useMemo(
    () =>
      Object.entries(progress.conceptMastery)
        .map(([tag, item]) => ({ tag, ...item }))
        .sort((a, b) => b.seen - a.seen || b.weak - a.weak || a.tag.localeCompare(b.tag))
        .slice(0, 12),
    [progress.conceptMastery],
  );
  const canDoProgress = useMemo(
    () =>
      canDoStatements.map((item) => ({
        ...item,
        status: progress.canDoState[item.text] ?? "locked",
      })),
    [progress.canDoState],
  );

  return {
    progress,
    completedSet,
    dueReviews,
    dailyPlan,
    dailyReviewItems,
    dailyLocalExercise,
    canDoProgress,
    weakCount,
    comfortCount,
    reviewTotal,
    conceptStats,
    nextLesson,
    chooseOnboardingPath,
    completeLesson,
    recordReview,
    recordLocalExchange,
    updateSettings,
    resetProgress,
  };
}
