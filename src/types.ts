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
}

export interface Lesson {
  id: string;
  number: number;
  level: "A1" | "A2";
  unit: string;
  title: string;
  goal: string;
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
}

export interface ProgressState {
  completedLessons: string[];
  reviewItems: Record<string, ReviewItem>;
  lastQuality: Record<string, Quality>;
  settings: {
    speechRate: number;
    voiceURI: string;
  };
}
