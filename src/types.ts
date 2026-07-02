export type Level = "A1" | "A2" | "B1" | "B2";

export type ExerciseType =
  | "teach"
  | "listenRepeat"
  | "article"
  | "match"
  | "builder"
  | "gap"
  | "recall"
  | "dialogue"
  | "football"
  | "mixed"
  | "localText";

export type Quality = "again" | "hard" | "good";
export type OnboardingPath = "new" | "basics" | "travel";
export type ReviewMode = "hearIt" | "typeIt" | "buildIt" | "chooseArticle" | "respondInChat";
export type CanDoStatus = "locked" | "practicing" | "comfortable";

export interface ExampleLine {
  de: string;
  en: string;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  level: Level;
  title: string;
  prompt: string;
  de: string;
  en: string;
  tts: string;
  pronunciation?: string;
  note?: string;
  tags: string[];
  options?: string[];
  answer?: string | string[];
  pairs?: ExampleLine[];
  words?: string[];
  hint?: string;
  displayDe?: string;
  displayEn?: string;
  promptOnly?: boolean;
  objective?: string;
  persona?: string;
  targetAnswer?: string;
  reviewMode?: ReviewMode;
  scene?: string;
  skillId?: string;
  acceptableAnswers?: string[];
  localObjectiveId?: string;
}

export interface Lesson {
  id: string;
  number: number;
  level: "A1" | "A2";
  unitId: string;
  unit: string;
  track: "core" | "travel" | "soccer" | "checkpoint";
  title: string;
  goal: string;
  canDo: string;
  checkpoint: boolean;
  reviewedBy: string;
  reviewNotes: string;
  contentStatus: "draft" | "reviewed";
  focus: string[];
  exercises: Exercise[];
}

export interface ReviewItem {
  exerciseId: string;
  lessonId: string;
  dueAt: number;
  intervalDays: number;
  repetitions: number;
  quality: Quality;
  reviewMode?: ReviewMode;
}

export interface ProgressState {
  completedLessons: string[];
  reviewItems: Record<string, ReviewItem>;
  lastQuality: Record<string, Quality>;
  onboardingPath: OnboardingPath | "";
  unlockedLessonIndex: number;
  dailyPlan: Record<string, { lessonId?: string; reviewed: string[]; localObjectiveId?: string; completed: string[] }>;
  canDoState: Record<string, CanDoStatus>;
  conceptMastery: Record<string, { comfortable: number; weak: number; seen: number; total: number; score: number }>;
  reviewHistory: Record<string, Array<{ at: number; quality: Quality; reviewMode?: ReviewMode }>>;
  settings: {
    speechRate: number;
    voiceURI: string;
  };
}
