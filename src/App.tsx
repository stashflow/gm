import {
  BookOpen,
  Check,
  X,
  GraduationCap,
  Home,
  ListChecks,
  MessageCircle,
  RotateCcw,
  Settings,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { exerciseById, lessons, unitCount } from "./data/course";
import { useProgress } from "./hooks/useProgress";
import { useSpeech } from "./hooks/useSpeech";
import type { Exercise, Lesson, OnboardingPath, Quality } from "./types";

type Tab = "learn" | "review" | "course" | "progress";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
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
  const [activeLocalExercise, setActiveLocalExercise] = useState<Exercise | null>(null);

  const completedCount = progress.progress.completedLessons.length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [tab, activeLesson, activeLocalExercise]);

  if (activeLesson) {
    return (
      <LessonPlayer
        lesson={activeLesson}
        speak={speech.speak}
        speechSupported={speech.supported}
        onRecordLocal={(exercise, quality) => progress.recordReview(exercise.id, findLessonId(exercise.id), quality)}
        onBack={() => setActiveLesson(null)}
        onComplete={() => {
          progress.completeLesson(activeLesson.id);
          setActiveLesson(null);
          setTab("review");
        }}
      />
    );
  }

  if (activeLocalExercise) {
    return (
      <LocalPracticePlayer
        exercise={activeLocalExercise}
        speak={speech.speak}
        speechSupported={speech.supported}
        onBack={() => setActiveLocalExercise(null)}
        onRecord={(exercise, quality) => progress.recordReview(exercise.id, findLessonId(exercise.id), quality)}
        onComplete={() => setActiveLocalExercise(null)}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img src="/gm-logo.png" alt="GM" />
        </div>
        <button className="icon-button" type="button" onClick={() => setTab("progress")} aria-label="Settings">
          <Settings size={21} />
        </button>
      </header>

      {tab === "learn" && (
        <LearnScreen
          nextLesson={progress.nextLesson}
          dueCount={progress.dueReviews.length}
          dailyReviewCount={progress.dailyReviewItems.length}
          weakCount={progress.weakCount}
          progressPercent={progressPercent}
          completedCount={completedCount}
          onboardingPath={progress.progress.onboardingPath}
          currentCanDo={progress.nextLesson.canDo}
          dailyLocalExercise={progress.dailyLocalExercise}
          dailyCompleted={progress.dailyPlan.completed}
          onChoosePath={progress.chooseOnboardingPath}
          onStart={setActiveLesson}
          onStartLocal={setActiveLocalExercise}
          onReview={() => setTab("review")}
        />
      )}

      {tab === "review" && (
        <ReviewScreen
          dueIds={progress.dailyReviewItems.map((item) => item.exerciseId)}
          speak={speech.speak}
          speechSupported={speech.supported}
          onRecord={(exercise, quality) => progress.recordReview(exercise.id, findLessonId(exercise.id), quality)}
        />
      )}

      {tab === "course" && (
        <CourseScreen completedSet={progress.completedSet} currentId={progress.nextLesson.id} onStart={setActiveLesson} />
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
          canDoProgress={progress.canDoProgress}
          voices={speech.germanVoices}
          selectedVoiceURI={progress.progress.settings.voiceURI}
          speechRate={progress.progress.settings.speechRate}
          speechSupported={speech.supported}
          onTestVoice={() => speech.speak("Hallo, ich lerne Deutsch.")}
          onVoice={(voiceURI) => progress.updateSettings({ voiceURI })}
          onRate={(speechRate) => progress.updateSettings({ speechRate })}
          onReset={progress.resetProgress}
        />
      )}

      <nav className="bottom-nav" aria-label="Primary">
        <NavButton active={tab === "learn"} label="Learn" icon={<Home size={19} />} onClick={() => setTab("learn")} />
        <NavButton active={tab === "review"} label="Review" icon={<ListChecks size={19} />} onClick={() => setTab("review")} />
        <NavButton active={tab === "course"} label="Course" icon={<BookOpen size={19} />} onClick={() => setTab("course")} />
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

function imageForLesson(lesson: Lesson) {
  if (lesson.focus.some((tag) => ["football", "world cup"].includes(tag))) {
    return "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1100&q=80";
  }
  if (lesson.focus.some((tag) => ["food", "restaurant", "shopping"].includes(tag))) {
    return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1100&q=80";
  }
  if (lesson.focus.some((tag) => ["travel", "transport", "directions", "places"].includes(tag))) {
    return "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1100&q=80";
  }
  return "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1100&q=80";
}

function LearnScreen({
  nextLesson,
  dueCount,
  dailyReviewCount,
  weakCount,
  progressPercent,
  completedCount,
  onboardingPath,
  currentCanDo,
  dailyLocalExercise,
  dailyCompleted,
  onChoosePath,
  onStart,
  onStartLocal,
  onReview,
}: {
  nextLesson: Lesson;
  dueCount: number;
  dailyReviewCount: number;
  weakCount: number;
  progressPercent: number;
  completedCount: number;
  onboardingPath: OnboardingPath | "";
  currentCanDo: string;
  dailyLocalExercise: Exercise;
  dailyCompleted: string[];
  onChoosePath: (path: OnboardingPath) => void;
  onStart: (lesson: Lesson) => void;
  onStartLocal: (exercise: Exercise) => void;
  onReview: () => void;
}) {
  return (
    <section className="screen">
      <div className="section-heading">
        <p>Today</p>
        <h2>Learn one thing. Use it.</h2>
      </div>

      {!onboardingPath && (
        <div className="placement-panel">
          <strong>Pick your start.</strong>
          <div className="placement-grid">
            <PlacementCard title="I'm new" detail="Start with hello, name, and simple answers." onClick={() => onChoosePath("new")} />
            <PlacementCard title="I know basics" detail="Jump to the first checkpoint and review fast." onClick={() => onChoosePath("basics")} />
            <PlacementCard title="Travel German" detail="Prioritize cafe, train, hotel, and directions." onClick={() => onChoosePath("travel")} />
          </div>
        </div>
      )}

      <div className="daily-path">
        <div className={dailyCompleted.includes("lesson") ? "daily-card done" : "daily-card"}>
          <div className="daily-index">1</div>
          <div>
            <span>{nextLesson.level} · {nextLesson.unit}</span>
            <strong>{nextLesson.title}</strong>
            <p>{nextLesson.goal}</p>
          </div>
          <button className="primary-button" type="button" onClick={() => onStart(nextLesson)}>
            <GraduationCap size={20} />
            Learn
          </button>
        </div>

        <div className={dailyCompleted.includes("review") ? "daily-card done" : "daily-card"}>
          <div className="daily-index red">2</div>
          <div>
            <span>Review</span>
            <strong>{dailyReviewCount > 0 ? `${dailyReviewCount} cards ready` : "Nothing due yet"}</strong>
            <p>{dailyReviewCount > 0 ? "Hear it, type it, build it, and choose articles." : "Finish a lesson to create reviews."}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onReview}>
            <ListChecks size={20} />
            Review
          </button>
        </div>

        <div className={dailyCompleted.includes("local") ? "daily-card done local-task" : "daily-card local-task"}>
          <div className="daily-index yellow">3</div>
          <div>
            <span>Text with a local</span>
            <strong>{dailyLocalExercise.objective}</strong>
            <p>Use German only. The coach helps in English.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => onStartLocal(dailyLocalExercise)}>
            <MessageCircle size={20} />
            Text
          </button>
        </div>
      </div>

      <div className="lesson-focus compact">
        <img className="lesson-image" src={imageForLesson(nextLesson)} alt="" />
        <div className="lesson-meta">
          <span>{nextLesson.level}</span>
          <span>{nextLesson.unit}</span>
        </div>
        <h3>Now: {currentCanDo}</h3>
        <div className="focus-tags">
          {nextLesson.focus.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="Completed" value={`${completedCount}/${unitCount}`} />
        <Metric label="Course" value={`${progressPercent}%`} />
        <Metric label="Due today" value={String(dueCount)} />
        <Metric label="Needs review" value={String(weakCount)} />
      </div>

      <button className="review-banner" type="button" onClick={onReview}>
        <ListChecks size={21} />
        <span>{dueCount > 0 ? `${dueCount} review items ready` : "No due reviews right now"}</span>
      </button>
    </section>
  );
}

function PlacementCard({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <button className="placement-card" type="button" onClick={onClick}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </button>
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
  speechSupported,
  onBack,
  onComplete,
  onRecordLocal,
}: {
  lesson: Lesson;
  speak: (text: string) => void;
  speechSupported: boolean;
  onBack: () => void;
  onComplete: () => void;
  onRecordLocal: (exercise: Exercise, quality: Quality) => void;
}) {
  const [index, setIndex] = useState(0);
  const exercise = lesson.exercises[index];
  const isLast = index === lesson.exercises.length - 1;

  return (
    <main className="lesson-shell">
      <header className="lesson-header">
        <button className="icon-button close-button" type="button" onClick={onBack} aria-label="Close lesson">
          <X size={22} />
        </button>
        <div>
          <p>
            {lesson.unit} · Unit {lesson.number}
          </p>
          <h1>{lesson.title}</h1>
        </div>
      </header>
      <div className="lesson-progress-wrap">
        <div className="progress-track">
          <span style={{ width: `${((index + 1) / lesson.exercises.length) * 100}%` }} />
        </div>
      </div>
      <ExerciseCard
        key={exercise.id}
        exercise={exercise}
        speak={speak}
        speechSupported={speechSupported}
        actionLabel={isLast ? "Finish lesson" : "Next"}
        onAction={() => {
          if (isLast) onComplete();
          else setIndex((current) => current + 1);
        }}
        onRecordLocal={onRecordLocal}
      />
    </main>
  );
}

function LocalPracticePlayer({
  exercise,
  speak,
  speechSupported,
  onBack,
  onComplete,
  onRecord,
}: {
  exercise: Exercise;
  speak: (text: string) => void;
  speechSupported: boolean;
  onBack: () => void;
  onComplete: () => void;
  onRecord: (exercise: Exercise, quality: Quality) => void;
}) {
  return (
    <main className="lesson-shell local-practice-shell">
      <header className="lesson-header">
        <button className="icon-button close-button" type="button" onClick={onBack} aria-label="Close text practice">
          <X size={22} />
        </button>
        <div>
          <p>Daily text</p>
          <h1>Text with a local</h1>
        </div>
      </header>
      <ExerciseCard
        exercise={exercise}
        speak={speak}
        speechSupported={speechSupported}
        actionLabel="Finish text"
        onAction={onComplete}
        onRecordLocal={onRecord}
      />
    </main>
  );
}

function ExerciseCard({
  exercise,
  speak,
  speechSupported,
  actionLabel,
  onAction,
  onReviewQuality,
  onRecordLocal,
}: {
  exercise: Exercise;
  speak: (text: string) => void;
  speechSupported: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onReviewQuality?: (quality: Quality) => void;
  onRecordLocal?: (exercise: Exercise, quality: Quality) => void;
}) {
  const [selected, setSelected] = useState("");
  const [typed, setTyped] = useState("");
  const [built, setBuilt] = useState<number[]>([]);
  const startsRevealed = exercise.type === "teach" || exercise.type === "localText";
  const startsAnswered = exercise.type === "teach";
  const [revealed, setRevealed] = useState(startsRevealed);
  const [answered, setAnswered] = useState(startsAnswered);
  const [correct, setCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    setSelected("");
    setTyped("");
    setBuilt([]);
    const isRevealed = exercise.type === "teach" || exercise.type === "localText";
    setRevealed(isRevealed);
    setAnswered(exercise.type === "teach");
    setCorrect(null);
  }, [exercise.id, exercise.type]);

  const orderedAnswer = Array.isArray(exercise.answer) ? exercise.answer.join(" ") : exercise.answer ?? exercise.de;
  const options = exercise.options ?? [];
  const remainingWords = options.map((word, index) => ({ word, index })).filter((item) => !built.includes(item.index));

  const checkAnswer = () => {
    const attempt =
      exercise.type === "builder"
        ? built.map((index) => options[index]).join(" ")
        : exercise.reviewMode === "typeIt"
          ? typed
          : selected;
    const acceptable = [orderedAnswer, ...(exercise.acceptableAnswers ?? [])];
    const isCorrect = acceptable.some((answer) => normalize(attempt) === normalize(answer));
    setCorrect(isCorrect);
    setAnswered(true);
    setRevealed(true);
    onReviewQuality?.(qualityFromCorrect(isCorrect));
  };

  const isPassive = exercise.type === "teach" || exercise.type === "listenRepeat";
  const visibleDe = exercise.displayDe ?? exercise.de;
  const visibleEn = exercise.displayEn ?? exercise.en;
  const showPhrase = !exercise.promptOnly && exercise.type !== "localText" && exercise.type !== "builder";
  const showFeedbackListen = speechSupported && (!showPhrase || correct === false);
  const leadText =
    exercise.type === "localText"
      ? "Text in German."
      : exercise.reviewMode === "hearIt" && exercise.type !== "teach"
        ? "Listen. Choose what it means."
        : exercise.promptOnly && visibleDe
          ? visibleDe
          : exercise.type === "builder"
            ? exercise.en
            : exercise.prompt;

  return (
    <article className={`exercise-card ${exercise.type} ${correct === true ? "is-correct" : ""} ${correct === false ? "is-incorrect" : ""}`}>
      <h2>{leadText}</h2>
      {leadText !== exercise.prompt && exercise.type !== "localText" && <p className="prompt">{exercise.prompt}</p>}

      {exercise.promptOnly && visibleDe && visibleEn && (
        <div className="question-block">
          <strong>{visibleDe}</strong>
          <span>{visibleEn}</span>
        </div>
      )}

      {showPhrase && (
        <div className="phrase-block">
          <div>
            <strong>{visibleDe}</strong>
            {visibleEn && <span>{visibleEn}</span>}
          </div>
          <button className="speak-button" type="button" onClick={() => speak(exercise.tts)} aria-label="Listen" disabled={!speechSupported}>
            <Volume2 size={20} />
          </button>
        </div>
      )}

      {exercise.reviewMode === "hearIt" && exercise.type !== "teach" && (
        <button className="audio-first" type="button" onClick={() => speak(exercise.tts)} disabled={!speechSupported}>
          <Volume2 size={24} />
          Hear German
        </button>
      )}

      {exercise.type === "builder" && (
        <div className="builder-area">
          <button className="built-sentence" type="button" onClick={() => setBuilt([])}>
            {built.length > 0 ? built.map((index) => options[index]).join(" ") : "Tap words below"}
          </button>
          <div className="word-bank">
            {remainingWords.map(({ word, index }) => (
              <button key={`${word}-${index}`} type="button" onClick={() => setBuilt((current) => [...current, index])}>
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {exercise.reviewMode === "typeIt" && !answered && (
        <label className="answer-field">
          Type the German
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            placeholder="Deutsch..."
          />
        </label>
      )}

      {exercise.type !== "builder" && exercise.reviewMode !== "typeIt" && options.length > 0 && (
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

      {!isPassive && exercise.type !== "localText" && !answered && (
        <button
          className="primary-button"
          type="button"
          disabled={exercise.type === "builder" ? built.length === 0 : exercise.reviewMode === "typeIt" ? typed.trim().length === 0 : selected.length === 0}
          onClick={checkAnswer}
        >
          <Check size={20} />
          Check
        </button>
      )}

      {revealed && exercise.type !== "localText" && (
        <div className={correct === false ? "feedback needs-work" : "feedback"}>
          {correct !== null && <strong>{correct ? "Correct" : "Review this one"}</strong>}
          {correct === false && <p>The correct answer is: {orderedAnswer}</p>}
          {exercise.pronunciation && <p>Say it like: {exercise.pronunciation}</p>}
          {exercise.note && <p>{exercise.note}</p>}
          {showFeedbackListen && (
            <button className="feedback-listen" type="button" onClick={() => speak(orderedAnswer)}>
              <Volume2 size={17} />
              Hear it
            </button>
          )}
        </div>
      )}

      {exercise.type === "localText" && (
        <LocalChatBox
          exercise={exercise}
          onComplete={() => setAnswered(true)}
          onRecord={(quality) => onRecordLocal?.(exercise, quality)}
        />
      )}

      {answered && onAction && (
        <button className="primary-button next-button" type="button" onClick={onAction}>
          {actionLabel ?? "Continue"}
        </button>
      )}
    </article>
  );
}

function ReviewScreen({
  dueIds,
  speak,
  speechSupported,
  onRecord,
}: {
  dueIds: string[];
  speak: (text: string) => void;
  speechSupported: boolean;
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
        <p>Finish a lesson and your review cards will appear here.</p>
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
        speechSupported={speechSupported}
        onReviewQuality={(quality) => {
          onRecord(exercise, quality);
          setCompleted((items) => [...items, exercise.id]);
        }}
        onRecordLocal={(item, quality) => {
          onRecord(item, quality);
          setCompleted((items) => [...items, item.id]);
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

const looksLikeEnglish = (text: string) =>
  /\b(my name|where are|where do|i am|i'm|i come|thank you|thanks|please|what is|what are|how much|how old|do you|can you|the local)\b/i.test(text);

const coachText = (data: LocalResponse) => {
  const feedback = data.feedback.trim();
  const correction = data.correction.trim();
  if (!correction) return feedback;
  return `${feedback} ${correction}`;
};

function LocalChatBox({
  exercise,
  onComplete,
  onRecord,
}: {
  exercise: Exercise;
  onComplete: () => void;
  onRecord: (quality: Quality) => void;
}) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [missionComplete, setMissionComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canContinueOffline, setCanContinueOffline] = useState(false);

  useEffect(() => {
    setMissionComplete(false);
    setStatus("");
    setInput("");
    setCanContinueOffline(false);
    setMessages([{ role: "local", text: greetingFor(exercise) }]);
  }, [exercise]);

  const send = async () => {
    const learnerText = input.trim();
    if (!learnerText) return;
    if (looksLikeEnglish(learnerText)) {
      setInput("");
      setMessages((current) => [
        ...current,
        { role: "learner", text: learnerText },
        { role: "coach", text: "Use German only here. Keep it short and use the sentence pattern from this lesson." },
      ]);
      setStatus("German only");
      return;
    }
    setLoading(true);
    setStatus("");
    setInput("");
    const nextMessages: LocalMessage[] = [...messages, { role: "learner", text: learnerText }];
    setMessages(nextMessages);

    try {
      const staticPreview =
        ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port === "4173";
      if (staticPreview) throw new Error("Local chat is unavailable.");
      const response = await fetch("/api/local-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise: {
            level: exercise.level,
            title: exercise.title,
            objective: exercise.objective,
            persona: exercise.persona,
            targetAnswer: Array.isArray(exercise.answer) ? exercise.answer.join(" ") : exercise.answer,
            scene: exercise.scene,
            skillId: exercise.skillId,
            acceptableAnswers: exercise.acceptableAnswers,
            tags: exercise.tags,
          },
          messages: nextMessages,
        }),
      });
      const data = (await response.json().catch(() => ({ error: "Local chat is unavailable." }))) as LocalResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Local chat failed.");

      setMessages([
        ...nextMessages,
        { role: "local", text: data.reply },
        { role: "coach", text: coachText(data) },
      ]);
      setMissionComplete(data.missionComplete);
      setStatus(data.missionComplete ? "Objective complete" : "Keep going in German");
      if (data.missionComplete) {
        onRecord("good");
        onComplete();
      }
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "coach",
          text: "Local chat needs the deployment API route and OpenAI key. You can still finish this practice.",
        },
      ]);
      setStatus("Chat unavailable");
      setCanContinueOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const idk = () => {
    setMessages((current) => [
      ...current,
      {
        role: "coach",
        text: exercise.hint ?? "Think of the question or sentence from this lesson. Keep it short and German.",
      },
    ]);
  };

  return (
    <div className="local-mini">
      <div className="local-mini-head">
        <div>
          <strong>Use what you learned.</strong>
          <p>{exercise.objective}</p>
        </div>
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
      {canContinueOffline && (
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            onRecord("hard");
            onComplete();
          }}
        >
          Continue without chat
        </button>
      )}

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
    </div>
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
  const [levelFilter, setLevelFilter] = useState<"all" | "A1" | "A2">("all");
  const visibleLessons = lessons.filter((lessonItem) => levelFilter === "all" || lessonItem.level === levelFilter);

  return (
    <section className="screen course-list">
      <div className="section-heading">
        <p>Course map</p>
        <h2>128 micro-lessons</h2>
      </div>
      <div className="course-tabs" role="tablist" aria-label="Course level">
        <button className={levelFilter === "all" ? "active" : ""} type="button" onClick={() => setLevelFilter("all")}>
          All
        </button>
        <button className={levelFilter === "A1" ? "active" : ""} type="button" onClick={() => setLevelFilter("A1")}>
          A1
        </button>
        <button className={levelFilter === "A2" ? "active" : ""} type="button" onClick={() => setLevelFilter("A2")}>
          A2
        </button>
      </div>
      {visibleLessons.map((lessonItem) => {
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
                {lessonItem.unit} · {lessonItem.checkpoint ? "Checkpoint" : lessonItem.focus.join(", ")}
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
  canDoProgress,
  voices,
  selectedVoiceURI,
  speechRate,
  speechSupported,
  onTestVoice,
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
  canDoProgress: Array<{ id: string; text: string; lessonId: string; level: "A1" | "A2"; status: string }>;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  speechRate: number;
  speechSupported: boolean;
  onTestVoice: () => void;
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

      <div className="can-do-panel">
        <strong>What you can do</strong>
        {canDoProgress.slice(0, 10).map((item) => (
          <div className="can-do-row" key={item.id}>
            <span>{item.text}</span>
            <small className={`status-pill ${item.status}`}>{item.status}</small>
          </div>
        ))}
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
        <button className="secondary-button" type="button" onClick={onTestVoice} disabled={!speechSupported}>
          <Volume2 size={18} />
          {speechSupported ? "Test German voice" : "Speech unavailable"}
        </button>
        {!speechSupported && <p className="settings-help">This browser does not expose text to speech.</p>}
      </div>

      <div className="retention-note">
        <strong>{reviewTotal} review cards</strong>
        <p>Practice words from your lessons.</p>
      </div>

      <div className="concept-panel">
        <strong>Practice next</strong>
        {conceptStats.length === 0 && <p>Finish a unit to see what to practice.</p>}
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
