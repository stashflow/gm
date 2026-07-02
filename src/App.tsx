import {
  BookOpen,
  Check,
  ChevronLeft,
  GraduationCap,
  Home,
  MessageCircle,
  ListChecks,
  RotateCcw,
  Settings,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { allExercises, exerciseById, lessons, unitCount } from "./data/course";
import { useProgress } from "./hooks/useProgress";
import { useSpeech } from "./hooks/useSpeech";
import type { Exercise, Lesson, Quality } from "./types";

type Tab = "learn" | "review" | "course" | "local" | "progress";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const qualityFromCorrect = (correct: boolean): Quality => (correct ? "good" : "again");

function App() {
  const progress = useProgress();
  const speech = useSpeech(progress.progress.settings.voiceURI, progress.progress.settings.speechRate);
  const [tab, setTab] = useState<Tab>("learn");
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [localExerciseId, setLocalExerciseId] = useState<string | null>(null);

  const completedCount = progress.progress.completedLessons.length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  if (activeLesson) {
    return (
      <LessonPlayer
        lesson={activeLesson}
        speak={speech.speak}
        onOpenLocal={(exerciseId) => {
          setLocalExerciseId(exerciseId);
          setActiveLesson(null);
          setTab("local");
        }}
        onBack={() => setActiveLesson(null)}
        onComplete={() => {
          progress.completeLesson(activeLesson.id);
          setActiveLesson(null);
          setTab("review");
        }}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img src="/gm-logo.png" alt="GM" />
          <div>
            <p>Germeade</p>
            <h1>GM</h1>
          </div>
        </div>
        <button className="icon-button" type="button" onClick={() => setTab("progress")} aria-label="Settings">
          <Settings size={21} />
        </button>
      </header>

      {tab === "learn" && (
        <LearnScreen
          nextLesson={progress.nextLesson}
          dueCount={progress.dueReviews.length}
          weakCount={progress.weakCount}
          progressPercent={progressPercent}
          completedCount={completedCount}
          onStart={setActiveLesson}
          onReview={() => setTab("review")}
        />
      )}

      {tab === "review" && (
        <ReviewScreen
          dueIds={progress.dueReviews.map((item) => item.exerciseId)}
          speak={speech.speak}
          onRecord={(exercise, quality) => progress.recordReview(exercise.id, findLessonId(exercise.id), quality)}
        />
      )}

      {tab === "course" && (
        <CourseScreen completedSet={progress.completedSet} currentId={progress.nextLesson.id} onStart={setActiveLesson} />
      )}

      {tab === "local" && (
        <LocalTextScreen
          initialExerciseId={localExerciseId}
          speak={speech.speak}
          onRecord={(exercise, quality) => progress.recordReview(exercise.id, findLessonId(exercise.id), quality)}
        />
      )}

      {tab === "progress" && (
        <ProgressScreen
          completedCount={completedCount}
          progressPercent={progressPercent}
          dueCount={progress.dueReviews.length}
          weakCount={progress.weakCount}
          comfortCount={progress.comfortCount}
          reviewTotal={progress.reviewTotal}
          conceptStats={progress.conceptStats}
          voices={speech.germanVoices}
          selectedVoiceURI={progress.progress.settings.voiceURI}
          speechRate={progress.progress.settings.speechRate}
          onVoice={(voiceURI) => progress.updateSettings({ voiceURI })}
          onRate={(speechRate) => progress.updateSettings({ speechRate })}
          onReset={progress.resetProgress}
        />
      )}

      <nav className="bottom-nav" aria-label="Primary">
        <NavButton active={tab === "learn"} label="Learn" icon={<Home size={19} />} onClick={() => setTab("learn")} />
        <NavButton active={tab === "review"} label="Review" icon={<ListChecks size={19} />} onClick={() => setTab("review")} />
        <NavButton active={tab === "course"} label="Course" icon={<BookOpen size={19} />} onClick={() => setTab("course")} />
        <NavButton active={tab === "local"} label="Local" icon={<MessageCircle size={19} />} onClick={() => setTab("local")} />
        <NavButton active={tab === "progress"} label="Progress" icon={<ShieldCheck size={19} />} onClick={() => setTab("progress")} />
      </nav>
    </main>
  );
}

function findLessonId(exerciseId: string) {
  return lessons.find((lessonItem) => lessonItem.exercises.some((exercise) => exercise.id === exerciseId))?.id ?? lessons[0].id;
}

function NavButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function LearnScreen({
  nextLesson,
  dueCount,
  weakCount,
  progressPercent,
  completedCount,
  onStart,
  onReview,
}: {
  nextLesson: Lesson;
  dueCount: number;
  weakCount: number;
  progressPercent: number;
  completedCount: number;
  onStart: (lesson: Lesson) => void;
  onReview: () => void;
}) {
  return (
    <section className="screen">
      <div className="section-heading">
        <p>Today</p>
        <h2>Learn German that sticks.</h2>
      </div>

      <div className="lesson-focus">
        <div className="lesson-meta">
          <span>{nextLesson.level}</span>
          <span>{nextLesson.unit}</span>
        </div>
        <h3>{nextLesson.title}</h3>
        <p>{nextLesson.goal}</p>
        <div className="focus-tags">
          {nextLesson.focus.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <button className="primary-button" type="button" onClick={() => onStart(nextLesson)}>
          <GraduationCap size={20} />
          Start lesson
        </button>
      </div>

      <div className="metric-grid">
        <Metric label="Completed" value={`${completedCount}/${unitCount}`} />
        <Metric label="Course" value={`${progressPercent}%`} />
        <Metric label="Due today" value={String(dueCount)} />
        <Metric label="Needs review" value={String(weakCount)} />
      </div>

      <button className="review-banner" type="button" onClick={onReview}>
        <ListChecks size={21} />
        <span>{dueCount > 0 ? `${dueCount} items ready for recall` : "No due reviews right now"}</span>
      </button>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function LessonPlayer({
  lesson,
  speak,
  onBack,
  onComplete,
  onOpenLocal,
}: {
  lesson: Lesson;
  speak: (text: string) => void;
  onBack: () => void;
  onComplete: () => void;
  onOpenLocal: (exerciseId: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const exercise = lesson.exercises[index];
  const isLast = index === lesson.exercises.length - 1;

  return (
    <main className="app-shell lesson-shell">
      <header className="lesson-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <div>
          <p>
            {lesson.unit} · Unit {lesson.number}
          </p>
          <h1>{lesson.title}</h1>
        </div>
      </header>
      <div className="progress-track">
        <span style={{ width: `${((index + 1) / lesson.exercises.length) * 100}%` }} />
      </div>
      <ExerciseCard
        key={exercise.id}
        exercise={exercise}
        speak={speak}
        actionLabel={isLast ? "Finish lesson" : "Next"}
        onAction={() => {
          if (isLast) onComplete();
          else setIndex((current) => current + 1);
        }}
        onOpenLocal={onOpenLocal}
      />
    </main>
  );
}

function ExerciseCard({
  exercise,
  speak,
  actionLabel,
  onAction,
  onReviewQuality,
  onOpenLocal,
}: {
  exercise: Exercise;
  speak: (text: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  onReviewQuality?: (quality: Quality) => void;
  onOpenLocal?: (exerciseId: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [built, setBuilt] = useState<string[]>([]);
  const startsOpen = exercise.type === "teach" || exercise.type === "localText";
  const [revealed, setRevealed] = useState(startsOpen);
  const [answered, setAnswered] = useState(startsOpen);
  const [correct, setCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    setSelected("");
    setBuilt([]);
    const isOpen = exercise.type === "teach" || exercise.type === "localText";
    setRevealed(isOpen);
    setAnswered(isOpen);
    setCorrect(null);
  }, [exercise.id, exercise.type]);

  const orderedAnswer = Array.isArray(exercise.answer) ? exercise.answer.join(" ") : exercise.answer ?? exercise.de;
  const options = exercise.options ?? [];
  const remainingWords = options.filter((word, idx) => {
    const usedIndexes = built.map((builtWord) => options.indexOf(builtWord));
    return !usedIndexes.includes(idx);
  });

  const checkAnswer = () => {
    const attempt = exercise.type === "builder" ? built.join(" ") : selected;
    const isCorrect = normalize(attempt) === normalize(orderedAnswer);
    setCorrect(isCorrect);
    setAnswered(true);
    setRevealed(true);
    onReviewQuality?.(qualityFromCorrect(isCorrect));
  };

  const isPassive = exercise.type === "teach" || exercise.type === "listenRepeat";

  return (
    <article className={`exercise-card ${exercise.type}`}>
      <div className="template-label">{labelForType(exercise.type)}</div>
      <h2>{exercise.title}</h2>
      <p className="prompt">{exercise.prompt}</p>

      {exercise.type === "localText" && (
        <div className="objective-card">
          <strong>Objective</strong>
          <p>{exercise.objective}</p>
          <small>German only. English does not count.</small>
        </div>
      )}

      <div className="phrase-block">
        <div>
          <strong>{exercise.de}</strong>
          <span>{exercise.en}</span>
        </div>
        <button className="speak-button" type="button" onClick={() => speak(exercise.tts)} aria-label="Listen">
          <Volume2 size={20} />
        </button>
      </div>

      {exercise.type === "builder" && (
        <div className="builder-area">
          <button className="built-sentence" type="button" onClick={() => setBuilt([])}>
            {built.length > 0 ? built.join(" ") : "Tap words below"}
          </button>
          <div className="word-bank">
            {remainingWords.map((word) => (
              <button key={`${word}-${built.length}`} type="button" onClick={() => setBuilt((current) => [...current, word])}>
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {exercise.type !== "builder" && options.length > 0 && (
        <div className="choice-list">
          {options.map((option) => (
            <button
              key={option}
              className={selected === option ? "choice selected" : "choice"}
              type="button"
              onClick={() => setSelected(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {isPassive && !revealed && (
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            setRevealed(true);
            setAnswered(true);
            onReviewQuality?.("good");
          }}
        >
          I said it
        </button>
      )}

      {!isPassive && !answered && (
        <button
          className="primary-button"
          type="button"
          disabled={exercise.type === "builder" ? built.length === 0 : selected.length === 0}
          onClick={checkAnswer}
        >
          <Check size={20} />
          Check
        </button>
      )}

      {revealed && (
        <div className={correct === false ? "feedback needs-work" : "feedback"}>
          {correct !== null && <strong>{correct ? "Correct" : "Review this one"}</strong>}
          {correct === false && <p>The correct answer is: {orderedAnswer}</p>}
          {exercise.pronunciation && <p>Say it like: {exercise.pronunciation}</p>}
          {exercise.note && <p>{exercise.note}</p>}
        </div>
      )}

      {exercise.type === "localText" && onOpenLocal && (
        <button className="secondary-button" type="button" onClick={() => onOpenLocal(exercise.id)}>
          <MessageCircle size={20} />
          Text with a local
        </button>
      )}

      {answered && onAction && (
        <button className="primary-button next-button" type="button" onClick={onAction}>
          {actionLabel ?? "Continue"}
        </button>
      )}
    </article>
  );
}

function labelForType(type: Exercise["type"]) {
  const labels: Record<Exercise["type"], string> = {
    teach: "Teach card",
    listenRepeat: "Listen + repeat",
    article: "Article trainer",
    match: "Meaning match",
    builder: "Sentence builder",
    gap: "Fill the gap",
    recall: "Active recall",
    dialogue: "Mini dialogue",
    football: "Football drill",
    mixed: "Mixed review",
    localText: "Text with a local",
  };
  return labels[type];
}

function ReviewScreen({
  dueIds,
  speak,
  onRecord,
}: {
  dueIds: string[];
  speak: (text: string) => void;
  onRecord: (exercise: Exercise, quality: Quality) => void;
}) {
  const [completed, setCompleted] = useState<string[]>([]);
  const current = dueIds.find((id) => !completed.includes(id));
  const exercise = current ? exerciseById.get(current) : undefined;

  if (!exercise) {
    return (
      <section className="screen empty-state">
        <ShieldCheck size={38} />
        <h2>No due reviews.</h2>
        <p>New recall items appear after lessons and return on spaced intervals.</p>
      </section>
    );
  }

  return (
    <section className="screen">
      <div className="section-heading">
        <p>Review</p>
        <h2>{dueIds.length - completed.length} due today</h2>
      </div>
      <ExerciseCard
        exercise={exercise}
        speak={speak}
        onReviewQuality={(quality) => {
          onRecord(exercise, quality);
          setCompleted((items) => [...items, exercise.id]);
        }}
      />
      <div className="manual-quality">
        <button type="button" onClick={() => onRecordAndAdvance(exercise, "again", onRecord, setCompleted)}>
          Again
        </button>
        <button type="button" onClick={() => onRecordAndAdvance(exercise, "hard", onRecord, setCompleted)}>
          Hard
        </button>
        <button type="button" onClick={() => onRecordAndAdvance(exercise, "good", onRecord, setCompleted)}>
          Good
        </button>
      </div>
    </section>
  );
}

function onRecordAndAdvance(
  exercise: Exercise,
  quality: Quality,
  onRecord: (exercise: Exercise, quality: Quality) => void,
  setCompleted: Dispatch<SetStateAction<string[]>>,
) {
  onRecord(exercise, quality);
  setCompleted((items) => [...items, exercise.id]);
}

type LocalMessage = {
  role: "local" | "learner" | "coach";
  text: string;
};

type LocalResponse = {
  reply: string;
  feedback: string;
  correction: string;
  missionComplete: boolean;
};

function LocalTextScreen({
  initialExerciseId,
  speak,
  onRecord,
}: {
  initialExerciseId: string | null;
  speak: (text: string) => void;
  onRecord: (exercise: Exercise, quality: Quality) => void;
}) {
  const localExercises = useMemo(() => allExercises.filter((exercise) => exercise.type === "localText"), []);
  const initialExercise = localExercises.find((exercise) => exercise.id === initialExerciseId) ?? localExercises[0];
  const [exerciseId, setExerciseId] = useState(initialExercise?.id ?? "");
  const exercise = localExercises.find((item) => item.id === exerciseId) ?? localExercises[0];
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [missionComplete, setMissionComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialExerciseId) setExerciseId(initialExerciseId);
  }, [initialExerciseId]);

  useEffect(() => {
    if (!exercise) return;
    setMissionComplete(false);
    setStatus("");
    setInput("");
    setMessages([{ role: "local", text: greetingFor(exercise) }]);
  }, [exercise]);

  if (!exercise) {
    return (
      <section className="screen empty-state">
        <MessageCircle size={38} />
        <h2>No local objectives yet.</h2>
      </section>
    );
  }

  const send = async () => {
    const learnerText = input.trim();
    if (!learnerText) return;
    setLoading(true);
    setStatus("");
    setInput("");
    const nextMessages: LocalMessage[] = [...messages, { role: "learner", text: learnerText }];
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/local-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise: {
            level: exercise.level,
            title: exercise.title,
            objective: exercise.objective,
            persona: exercise.persona,
            targetAnswer: exercise.targetAnswer,
            tags: exercise.tags,
          },
          messages: nextMessages,
        }),
      });
      const data = (await response.json()) as LocalResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Local chat failed.");

      setMessages([
        ...nextMessages,
        { role: "local", text: data.reply },
        { role: "coach", text: `${data.feedback}${data.correction ? ` Correction: ${data.correction}` : ""}` },
      ]);
      setMissionComplete(data.missionComplete);
      setStatus(data.missionComplete ? "Objective complete" : "Keep going in German");
      if (data.missionComplete) onRecord(exercise, "good");
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "coach",
          text:
            error instanceof Error
              ? error.message
              : "The local chat could not answer. Check that OPENAI_API_KEY is set in your .env file.",
        },
      ]);
      setStatus("Needs API key");
    } finally {
      setLoading(false);
    }
  };

  const idk = () => {
    setMessages((current) => [
      ...current,
      {
        role: "coach",
        text: `Tiny hint: try "${exercise.targetAnswer}" or ask one short W-question. Stay in German.`,
      },
    ]);
  };

  return (
    <section className="screen local-screen">
      <div className="section-heading">
        <p>Text with a local</p>
        <h2>{exercise.objective}</h2>
      </div>

      <div className="local-toolbar">
        <label>
          Objective
          <select value={exercise.id} onChange={(event) => setExerciseId(event.target.value)}>
            {localExercises.map((item) => {
              const lessonItem = lessons.find((lesson) => lesson.exercises.some((candidate) => candidate.id === item.id));
              return (
                <option key={item.id} value={item.id}>
                  {lessonItem?.unit} · {lessonItem?.title}
                </option>
              );
            })}
          </select>
        </label>
        <button className="speak-button" type="button" onClick={() => speak(exercise.targetAnswer ?? exercise.de)} aria-label="Hear target">
          <Volume2 size={20} />
        </button>
      </div>

      <div className="chat-panel">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`bubble ${message.role}`}>
            <span>{message.role === "learner" ? "You" : message.role === "local" ? "Local" : "Coach"}</span>
            <p>{message.text}</p>
          </div>
        ))}
      </div>

      {status && <div className={missionComplete ? "feedback" : "feedback needs-work"}>{status}</div>}

      <div className="composer">
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Schreib auf Deutsch..." rows={3} />
        <div className="composer-actions">
          <button className="secondary-button" type="button" onClick={idk} disabled={loading}>
            IDK
          </button>
          <button className="primary-button" type="button" onClick={send} disabled={loading || !input.trim()}>
            {loading ? "Checking..." : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}

function greetingFor(exercise: Exercise) {
  if (exercise.persona?.includes("ticket") || exercise.persona?.includes("cashier")) return "Guten Tag. Was möchten Sie?";
  if (exercise.persona?.includes("station")) return "Hallo. Wohin möchtest du?";
  return "Hallo! Schreib mir auf Deutsch.";
}

function CourseScreen({
  completedSet,
  currentId,
  onStart,
}: {
  completedSet: Set<string>;
  currentId: string;
  onStart: (lesson: Lesson) => void;
}) {
  return (
    <section className="screen course-list">
      <div className="section-heading">
        <p>Course map</p>
        <h2>A1.1 to A2.16</h2>
      </div>
      {lessons.map((lessonItem) => {
        const complete = completedSet.has(lessonItem.id);
        const current = currentId === lessonItem.id;
        return (
          <button key={lessonItem.id} className="course-row" type="button" onClick={() => onStart(lessonItem)}>
            <span className={complete ? "lesson-dot complete" : current ? "lesson-dot current" : "lesson-dot"}>
              {complete ? <Check size={15} /> : lessonItem.number}
            </span>
            <span>
              <strong>{lessonItem.title}</strong>
              <small>
                {lessonItem.unit} · {lessonItem.focus.join(", ")}
              </small>
            </span>
          </button>
        );
      })}
    </section>
  );
}

function ProgressScreen({
  completedCount,
  progressPercent,
  dueCount,
  weakCount,
  comfortCount,
  reviewTotal,
  conceptStats,
  voices,
  selectedVoiceURI,
  speechRate,
  onVoice,
  onRate,
  onReset,
}: {
  completedCount: number;
  progressPercent: number;
  dueCount: number;
  weakCount: number;
  comfortCount: number;
  reviewTotal: number;
  conceptStats: Array<{ tag: string; comfortable: number; weak: number; seen: number; total: number; score: number }>;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  speechRate: number;
  onVoice: (voiceURI: string) => void;
  onRate: (rate: number) => void;
  onReset: () => void;
}) {
  return (
    <section className="screen">
      <div className="section-heading">
        <p>Quiet progress</p>
        <h2>{progressPercent}% complete</h2>
      </div>

      <div className="metric-grid">
        <Metric label="Completed" value={`${completedCount}/${unitCount}`} />
        <Metric label="Due today" value={String(dueCount)} />
        <Metric label="Comfortable" value={String(comfortCount)} />
        <Metric label="Needs review" value={String(weakCount)} />
      </div>

      <div className="settings-panel">
        <label>
          German voice
          <select value={selectedVoiceURI} onChange={(event) => onVoice(event.target.value)}>
            <option value="">Default German voice</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>
        <label>
          Speech rate
          <input
            type="range"
            min="0.65"
            max="1.05"
            step="0.05"
            value={speechRate}
            onChange={(event) => onRate(Number(event.target.value))}
          />
          <span>{speechRate.toFixed(2)}x</span>
        </label>
      </div>

      <div className="retention-note">
        <strong>{reviewTotal} items in retention</strong>
        <p>Reviews come back sooner when missed and later when comfortable.</p>
      </div>

      <div className="concept-panel">
        <strong>Concept tracking</strong>
        {conceptStats.length === 0 && <p>Complete a unit to start tracking concepts.</p>}
        {conceptStats.map((concept) => (
          <div className="concept-row" key={concept.tag}>
            <span>{concept.tag}</span>
            <meter min="0" max="100" value={concept.score} />
            <small>
              {concept.comfortable} comfortable · {concept.weak} needs review
            </small>
          </div>
        ))}
      </div>

      <button className="danger-button" type="button" onClick={onReset}>
        <RotateCcw size={18} />
        Reset progress
      </button>
    </section>
  );
}

export default App;
