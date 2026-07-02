import type { Exercise, ExerciseType, Lesson, Level, ReviewMode } from "../types";

type Track = "core" | "travel" | "soccer" | "checkpoint";

type MicroSkill = {
  title: string;
  canDo: string;
  skillId: string;
  concept: string;
  scene: string;
  phrase: string;
  meaning: string;
  pronunciation: string;
  tip: string;
  tipExample: string;
  tipMeaning: string;
  checkPrompt: string;
  checkAnswer: string;
  choices: string[];
  gapPrompt: string;
  gapAnswer: string;
  gapChoices: string[];
  builderPrompt: string;
  builderAnswer: string[];
  replyPrompt: string;
  replyAnswer: string;
  replyChoices: string[];
  localObjective: string;
  localPersona: string;
  localTarget: string;
  acceptableAnswers?: string[];
  articleLike?: boolean;
};

type UnitDefinition = {
  id: string;
  level: "A1" | "A2";
  unitPrefix: string;
  theme: string;
  track: Track;
  focus: string[];
  lessons: MicroSkill[];
};

type Draft = Omit<Exercise, "id" | "level">;

const reviewMeta = {
  reviewedBy: "GM German Review",
  reviewNotes: "Mock native/teacher quality pass: beginner-safe grammar, useful Standard German, CEFR-aligned scope.",
  contentStatus: "reviewed" as const,
};

const normalizeWords = (word: string) => word.replace(/[.,!?]/g, "");

const exercise = (lessonNumber: number, level: Level, index: number, draft: Draft): Exercise => ({
  id: `l${lessonNumber}-e${index + 1}`,
  level,
  ...draft,
});

const teachPhrase = (unit: UnitDefinition, skill: MicroSkill): Draft => ({
  type: "teach",
  title: "New phrase",
  prompt: "Listen and read.",
  de: skill.phrase,
  en: skill.meaning,
  tts: skill.phrase,
  tags: [unit.theme, skill.concept, ...unit.focus],
  note: skill.tip,
  scene: skill.scene,
  skillId: skill.skillId,
});

const hearOrChoose = (unit: UnitDefinition, skill: MicroSkill): Draft => ({
  type: skill.articleLike ? "article" : "match",
  title: "Choose",
  prompt: skill.checkPrompt,
  de: skill.phrase,
  en: skill.meaning,
  tts: skill.phrase,
  displayDe: "",
  displayEn: "",
  promptOnly: true,
  answer: skill.checkAnswer,
  acceptableAnswers: [skill.checkAnswer, ...(skill.acceptableAnswers ?? [])],
  options: skill.choices,
  tags: [unit.theme, skill.concept, ...unit.focus],
  note: skill.tip,
  scene: skill.scene,
  skillId: skill.skillId,
  reviewMode: skill.articleLike ? "chooseArticle" : "hearIt",
});

const typeOrGap = (unit: UnitDefinition, skill: MicroSkill): Draft => ({
  type: "gap",
  title: "Complete",
  prompt: skill.gapPrompt,
  de: skill.phrase,
  en: skill.meaning,
  tts: skill.phrase,
  displayDe: "",
  displayEn: "",
  promptOnly: true,
  answer: skill.gapAnswer,
  acceptableAnswers: [skill.gapAnswer],
  options: skill.gapChoices,
  tags: [unit.theme, skill.concept, ...unit.focus],
  note: skill.tip,
  scene: skill.scene,
  skillId: skill.skillId,
  reviewMode: "typeIt",
});

const localText = (unit: UnitDefinition, skill: MicroSkill, lessonNumber: number): Draft => ({
  type: "localText",
  title: "Text in German",
  prompt: skill.localObjective,
  de: skill.localTarget,
  en: "",
  tts: skill.localTarget,
  answer: skill.localTarget,
  acceptableAnswers: [skill.localTarget, ...(skill.acceptableAnswers ?? [])],
  tags: [unit.theme, skill.concept, "local text", ...unit.focus],
  objective: skill.localObjective,
  persona: skill.localPersona,
  targetAnswer: "",
  hint: "Use one short German sentence from this lesson.",
  scene: skill.scene,
  skillId: skill.skillId,
  reviewMode: "respondInChat",
  localObjectiveId: `local-${lessonNumber}`,
});

const buildSentence = (unit: UnitDefinition, skill: MicroSkill): Draft => ({
  type: "builder",
  title: "Build",
  prompt: skill.builderPrompt,
  de: skill.builderAnswer.join(" "),
  en: skill.builderPrompt,
  tts: skill.builderAnswer.join(" "),
  displayDe: skill.builderPrompt,
  displayEn: "",
  answer: skill.builderAnswer,
  acceptableAnswers: [skill.builderAnswer.join(" ")],
  options: [...skill.builderAnswer].sort((a, b) => normalizeWords(a).localeCompare(normalizeWords(b))),
  tags: [unit.theme, "word order", skill.concept, ...unit.focus],
  note: "German word order is part of the answer.",
  scene: skill.scene,
  skillId: skill.skillId,
  reviewMode: "buildIt",
});

const dialogue = (unit: UnitDefinition, skill: MicroSkill): Draft => ({
  type: "dialogue",
  title: "Reply",
  prompt: skill.replyPrompt,
  de: skill.replyAnswer,
  en: "Choose the natural reply.",
  tts: skill.replyAnswer,
  displayDe: skill.replyPrompt,
  displayEn: "",
  promptOnly: true,
  answer: skill.replyAnswer,
  acceptableAnswers: [skill.replyAnswer],
  options: skill.replyChoices,
  tags: [unit.theme, "dialogue", skill.concept, ...unit.focus],
  note: skill.tip,
  scene: skill.scene,
  skillId: skill.skillId,
  reviewMode: "typeIt",
});

const checkpointSkill = (unit: UnitDefinition): MicroSkill => {
  const first = unit.lessons[0];
  const last = unit.lessons[unit.lessons.length - 1];
  return {
    ...last,
    title: `${unit.theme} checkpoint`,
    canDo: `Review: ${unit.theme.toLowerCase()}`,
    skillId: `${unit.id}-checkpoint`,
    concept: "checkpoint",
    scene: `${unit.theme}: checkpoint conversation`,
    phrase: `${first.phrase} ${last.phrase}`,
    meaning: `${first.meaning} ${last.meaning}`,
    pronunciation: last.pronunciation,
    tip: "Use short, correct sentences. Accuracy first, speed later.",
    tipExample: first.tipExample,
    tipMeaning: first.tipMeaning,
    checkPrompt: "Choose the sentence that fits the conversation.",
    checkAnswer: last.replyAnswer,
    choices: [last.replyAnswer, first.replyAnswer, last.choices.find((choice) => choice !== last.replyAnswer) ?? last.checkAnswer],
    gapPrompt: last.gapPrompt,
    gapAnswer: last.gapAnswer,
    gapChoices: last.gapChoices,
    builderPrompt: last.builderPrompt,
    builderAnswer: last.builderAnswer,
    localObjective: `Complete a short ${unit.theme.toLowerCase()} conversation.`,
    localPersona: last.localPersona,
    localTarget: last.localTarget,
  };
};

const makeLessons = () => {
  const output: Lesson[] = [];

  for (const unit of units) {
    for (let index = 0; index < 8; index += 1) {
      const number = output.length + 1;
      const skill = index === 7 ? checkpointSkill(unit) : unit.lessons[index];
      const checkpoint = index === 7;
      const drafts = [
        teachPhrase(unit, skill),
        hearOrChoose(unit, skill),
        typeOrGap(unit, skill),
        localText(unit, skill, number),
        buildSentence(unit, skill),
        dialogue(unit, skill),
      ];

      output.push({
        id: `lesson-${number}`,
        number,
        level: unit.level,
        unitId: unit.id,
        unit: `${unit.unitPrefix}.${index + 1}`,
        track: checkpoint ? "checkpoint" : unit.track,
        title: skill.title,
        goal: skill.canDo,
        canDo: skill.canDo,
        checkpoint,
        focus: Array.from(new Set([skill.concept, ...unit.focus])),
        exercises: drafts.map((draft, draftIndex) => exercise(number, unit.level, draftIndex, draft)),
        ...reviewMeta,
      });
    }
  }

  return output;
};

const s = (partial: MicroSkill): MicroSkill => partial;

const units: UnitDefinition[] = [
  {
    id: "a1-first-conversation",
    level: "A1",
    unitPrefix: "A1.1",
    theme: "First conversation",
    track: "core",
    focus: ["conversation survival", "questions", "present verbs"],
    lessons: [
      s({
        title: "Say your name",
        canDo: "You can introduce yourself.",
        skillId: "introduce-name",
        concept: "conversation survival",
        scene: "Small talk: first hello",
        phrase: "Hallo, ich heiße Sam.",
        meaning: "Hello, my name is Sam.",
        pronunciation: "HA-lo, ikh HAI-suh Sam.",
        tip: "Ich heiße means my name is.",
        tipExample: "Ich heiße Mia.",
        tipMeaning: "My name is Mia.",
        checkPrompt: "Which sentence gives a name?",
        checkAnswer: "Ich heiße Sam.",
        choices: ["Ich heiße Sam.", "Ich komme aus Berlin.", "Ich spreche Deutsch."],
        gapPrompt: "Complete: Ich ___ Sam.",
        gapAnswer: "heiße",
        gapChoices: ["heiße", "komme", "spreche"],
        builderPrompt: "Build: My name is Sam.",
        builderAnswer: ["Ich", "heiße", "Sam."],
        replyPrompt: "Wie heißt du?",
        replyAnswer: "Ich heiße Sam.",
        replyChoices: ["Ich heiße Sam.", "Ich komme aus den USA.", "Ich spreche Deutsch."],
        localObjective: "Introduce yourself.",
        localPersona: "You are Lena. Ask the learner's name and reply warmly.",
        localTarget: "Hallo, ich heiße Sam.",
      }),
      s({
        title: "Ask a name",
        canDo: "You can ask someone's name.",
        skillId: "ask-name",
        concept: "questions",
        scene: "Small talk: meeting someone",
        phrase: "Wie heißt du?",
        meaning: "What is your name?",
        pronunciation: "vee hyst doo.",
        tip: "Wie heißt du? is informal. Use Sie later for polite situations.",
        tipExample: "Und du?",
        tipMeaning: "And you?",
        checkPrompt: "Which question asks a name?",
        checkAnswer: "Wie heißt du?",
        choices: ["Wie heißt du?", "Woher kommst du?", "Sprichst du Deutsch?"],
        gapPrompt: "Complete: Wie ___ du?",
        gapAnswer: "heißt",
        gapChoices: ["heißt", "heiße", "kommst"],
        builderPrompt: "Build: What is your name?",
        builderAnswer: ["Wie", "heißt", "du?"],
        replyPrompt: "Someone asks your name.",
        replyAnswer: "Ich heiße Sam.",
        replyChoices: ["Ich heiße Sam.", "Aus den USA.", "Ein bisschen."],
        localObjective: "Ask the local's name.",
        localPersona: "You are Lena from Hamburg. Your name is Lena.",
        localTarget: "Wie heißt du?",
      }),
      s({
        title: "Say where you are from",
        canDo: "You can say where you come from.",
        skillId: "say-origin",
        concept: "questions",
        scene: "Small talk: origin",
        phrase: "Ich komme aus den USA.",
        meaning: "I come from the USA.",
        pronunciation: "ikh KOM-uh ows dain oo-es-AH.",
        tip: "Use aus for from.",
        tipExample: "Ich komme aus Deutschland.",
        tipMeaning: "I come from Germany.",
        checkPrompt: "Which sentence answers where you are from?",
        checkAnswer: "Ich komme aus den USA.",
        choices: ["Ich komme aus den USA.", "Ich heiße Sam.", "Ich lerne Deutsch."],
        gapPrompt: "Complete: Ich komme ___ Deutschland.",
        gapAnswer: "aus",
        gapChoices: ["aus", "um", "mit"],
        builderPrompt: "Build: I come from Germany.",
        builderAnswer: ["Ich", "komme", "aus", "Deutschland."],
        replyPrompt: "Woher kommst du?",
        replyAnswer: "Ich komme aus den USA.",
        replyChoices: ["Ich komme aus den USA.", "Ich heiße Sam.", "Ich wohne in Berlin."],
        localObjective: "Tell the local where you are from.",
        localPersona: "You are Mira from Köln. Ask where the learner is from.",
        localTarget: "Ich komme aus den USA.",
      }),
      s({
        title: "Ask where from",
        canDo: "You can ask where someone is from.",
        skillId: "ask-origin",
        concept: "questions",
        scene: "Small talk: origin",
        phrase: "Woher kommst du?",
        meaning: "Where do you come from?",
        pronunciation: "voh-HAIR komst doo.",
        tip: "Woher asks from where.",
        tipExample: "Woher kommst du?",
        tipMeaning: "Where do you come from?",
        checkPrompt: "Which question asks origin?",
        checkAnswer: "Woher kommst du?",
        choices: ["Woher kommst du?", "Wie heißt du?", "Wann beginnt es?"],
        gapPrompt: "Complete: Woher ___ du?",
        gapAnswer: "kommst",
        gapChoices: ["kommst", "komme", "heißt"],
        builderPrompt: "Build: Where do you come from?",
        builderAnswer: ["Woher", "kommst", "du?"],
        replyPrompt: "Ask where they are from.",
        replyAnswer: "Woher kommst du?",
        replyChoices: ["Woher kommst du?", "Wie heißt du?", "Was kostet das?"],
        localObjective: "Find out where the local comes from.",
        localPersona: "You are Jonas from Berlin.",
        localTarget: "Woher kommst du?",
      }),
      s({
        title: "Speak a little German",
        canDo: "You can say you speak a little German.",
        skillId: "speak-little",
        concept: "conversation survival",
        scene: "Small talk: language ability",
        phrase: "Ich spreche ein bisschen Deutsch.",
        meaning: "I speak a little German.",
        pronunciation: "ikh SHPREKH-uh ine BIS-khen doytsh.",
        tip: "Deutsch is the language. Deutschland is the country.",
        tipExample: "Sprichst du Englisch?",
        tipMeaning: "Do you speak English?",
        checkPrompt: "Which word is the language German?",
        checkAnswer: "Deutsch",
        choices: ["Deutsch", "Deutschland", "Danke"],
        gapPrompt: "Complete: Ich spreche ein bisschen ___.",
        gapAnswer: "Deutsch",
        gapChoices: ["Deutsch", "Deutschland", "danke"],
        builderPrompt: "Build: I speak German.",
        builderAnswer: ["Ich", "spreche", "Deutsch."],
        replyPrompt: "Sprichst du Deutsch?",
        replyAnswer: "Ein bisschen.",
        replyChoices: ["Ein bisschen.", "Aus Berlin.", "Guten Morgen."],
        localObjective: "Tell the local you speak a little German.",
        localPersona: "You ask whether the learner speaks German.",
        localTarget: "Ich spreche ein bisschen Deutsch.",
      }),
      s({
        title: "Ask about English",
        canDo: "You can ask if someone speaks English.",
        skillId: "ask-english",
        concept: "questions",
        scene: "Small talk: language help",
        phrase: "Sprichst du Englisch?",
        meaning: "Do you speak English?",
        pronunciation: "shprikhst doo ENG-lish.",
        tip: "For yes/no questions, the verb comes first.",
        tipExample: "Sprichst du Deutsch?",
        tipMeaning: "Do you speak German?",
        checkPrompt: "Which question asks about English?",
        checkAnswer: "Sprichst du Englisch?",
        choices: ["Sprichst du Englisch?", "Ich spreche Englisch.", "Deutsch ist gut."],
        gapPrompt: "Complete: ___ du Englisch?",
        gapAnswer: "Sprichst",
        gapChoices: ["Sprichst", "Spreche", "Heißt"],
        builderPrompt: "Build: Do you speak English?",
        builderAnswer: ["Sprichst", "du", "Englisch?"],
        replyPrompt: "Ask if they speak English.",
        replyAnswer: "Sprichst du Englisch?",
        replyChoices: ["Sprichst du Englisch?", "Ich spreche Englisch.", "Woher kommst du?"],
        localObjective: "Ask whether the local speaks English.",
        localPersona: "You speak a little English.",
        localTarget: "Sprichst du Englisch?",
      }),
      s({
        title: "Keep it going",
        canDo: "You can keep a first conversation going.",
        skillId: "keep-going",
        concept: "conversation survival",
        scene: "Small talk: follow-up",
        phrase: "Und du?",
        meaning: "And you?",
        pronunciation: "oont doo.",
        tip: "Und du? is short and useful after answering a question.",
        tipExample: "Ich heiße Sam. Und du?",
        tipMeaning: "My name is Sam. And you?",
        checkPrompt: "Which phrase keeps the question going?",
        checkAnswer: "Und du?",
        choices: ["Und du?", "Danke.", "Um acht Uhr."],
        gapPrompt: "Complete: Ich heiße Sam. ___ du?",
        gapAnswer: "Und",
        gapChoices: ["Und", "Aus", "Mit"],
        builderPrompt: "Build: My name is Sam. And you?",
        builderAnswer: ["Ich", "heiße", "Sam.", "Und", "du?"],
        replyPrompt: "Someone says: Ich heiße Lena.",
        replyAnswer: "Ich heiße Sam. Und du?",
        replyChoices: ["Ich heiße Sam. Und du?", "Um acht Uhr.", "Ich möchte Kaffee."],
        localObjective: "Answer and ask back.",
        localPersona: "You ask the learner's name.",
        localTarget: "Ich heiße Sam. Und du?",
      }),
    ],
  },
  {
    id: "a1-politeness",
    level: "A1",
    unitPrefix: "A1.2",
    theme: "Politeness",
    track: "core",
    focus: ["conversation survival", "politeness"],
    lessons: [
      makeSkill("Morning greeting", "You can greet someone in the morning.", "greet-morning", "conversation survival", "Small talk: morning", "Guten Morgen.", "Good morning.", "GOO-ten MOR-gen.", "Use Guten Morgen in the morning.", "Guten Morgen, Lena.", "Good morning, Lena.", "Which phrase means good morning?", "Guten Morgen.", ["Guten Morgen.", "Guten Abend.", "Gute Nacht."], "Complete: Guten ___.", "Morgen", ["Morgen", "Abend", "Tag"], "Build: Good morning.", ["Guten", "Morgen."], "It is morning.", "Guten Morgen.", ["Guten Morgen.", "Gute Nacht.", "Tschüss."], "Greet the local in the morning.", "You are a neighbor in the morning.", "Guten Morgen."),
      makeSkill("Say thank you", "You can thank someone.", "say-thanks", "politeness", "Cafe: paying", "Danke schön.", "Thank you very much.", "DAHN-kuh shurn.", "Danke is the core word for thank you.", "Danke.", "Thanks.", "Which phrase thanks someone?", "Danke schön.", ["Danke schön.", "Bitte schön.", "Guten Morgen."], "Complete: Danke ___.", "schön", ["schön", "bitte", "morgen"], "Build: Thank you.", ["Danke", "schön."], "Someone helps you.", "Danke schön.", ["Danke schön.", "Guten Morgen.", "Ich heiße Sam."], "Thank the local.", "You helped the learner find a cafe.", "Danke schön."),
      makeSkill("Say please", "You can use bitte when asking.", "say-please", "politeness", "Cafe: ordering", "Einen Kaffee, bitte.", "A coffee, please.", "EYE-nen kah-FAY BIT-tuh.", "Bitte can mean please.", "Wasser, bitte.", "Water, please.", "Which word makes the order polite?", "bitte", ["bitte", "danke", "hallo"], "Complete: Einen Kaffee, ___.", "bitte", ["bitte", "danke", "morgen"], "Build: A coffee, please.", ["Einen", "Kaffee,", "bitte."], "Order politely.", "Einen Kaffee, bitte.", ["Einen Kaffee, bitte.", "Danke Kaffee.", "Guten Kaffee."], "Order politely from the local.", "You are a cafe worker.", "Einen Kaffee, bitte."),
      makeSkill("You're welcome", "You can answer thanks with bitte.", "youre-welcome", "politeness", "Cafe: thanks", "Bitte schön.", "You're welcome.", "BIT-tuh shurn.", "Bitte can also mean you're welcome.", "Danke. Bitte.", "Thanks. You're welcome.", "What can answer Danke?", "Bitte schön.", ["Bitte schön.", "Guten Tag.", "Ich komme."], "Complete: Bitte ___.", "schön", ["schön", "danke", "Uhr"], "Build: You're welcome.", ["Bitte", "schön."], "Someone says: Danke.", "Bitte schön.", ["Bitte schön.", "Guten Morgen.", "Ich heiße Sam."], "Answer thanks politely.", "You just helped the learner.", "Bitte schön."),
      makeSkill("Excuse me", "You can get attention politely.", "excuse-me", "politeness", "Street: asking help", "Entschuldigung.",
        "Excuse me / sorry.", "ent-SHOOL-dee-goong.", "Use Entschuldigung before asking a stranger.", "Entschuldigung, wo ist der Bahnhof?", "Excuse me, where is the station?", "Which word means excuse me?", "Entschuldigung.", ["Entschuldigung.", "Danke.", "Tschüss."], "Complete: ___, wo ist der Bahnhof?", "Entschuldigung", ["Entschuldigung", "Danke", "Morgen"], "Build: Excuse me.", ["Entschuldigung."], "Start a polite question.", "Entschuldigung.", ["Entschuldigung.", "Danke schön.", "Bitte."], "Get the local's attention politely.", "You are a person on the street.", "Entschuldigung."),
      makeSkill("Goodbye", "You can say goodbye naturally.", "say-goodbye", "conversation survival", "Small talk: leaving", "Tschüss, bis später.", "Bye, see you later.", "choos, bis SHPAY-ter.", "Tschüss is casual. Auf Wiedersehen is more formal.", "Auf Wiedersehen.", "Goodbye.", "Which phrase is casual goodbye?", "Tschüss.", ["Tschüss.", "Danke.", "Bitte."], "Complete: Bis ___.", "später", ["später", "bitte", "Deutsch"], "Build: Bye, see you later.", ["Tschüss,", "bis", "später."], "You are leaving.", "Tschüss, bis später.", ["Tschüss, bis später.", "Ich heiße Sam.", "Einen Kaffee."], "Say goodbye to the local.", "You are ending a short chat.", "Tschüss, bis später."),
      makeSkill("Formal hello", "You can greet someone politely.", "formal-hello", "politeness", "Hotel: reception", "Guten Tag.", "Good day / hello.", "GOO-ten tahk.", "Use Guten Tag in polite daytime situations.", "Guten Tag, mein Name ist Sam.", "Hello, my name is Sam.", "Which greeting is polite in the day?", "Guten Tag.", ["Guten Tag.", "Gute Nacht.", "Tschüss."], "Complete: Guten ___.", "Tag", ["Tag", "Nacht", "Bitte"], "Build: Good day.", ["Guten", "Tag."], "At reception, say hello.", "Guten Tag.", ["Guten Tag.", "Tschüss.", "Danke."], "Greet reception politely.", "You are hotel reception.", "Guten Tag."),
    ],
  },
  unit("a1-articles", "A1", "A1.3", "Articles and nouns", "core", ["articles", "noun gender"], [
    ["der Mann", "the man", "dair man", "articles", "der", "Mann", "der Mann", "Choose der for Mann.", true],
    ["die Frau", "the woman", "dee frow", "articles", "die", "Frau", "die Frau", "Choose die for Frau.", true],
    ["das Kind", "the child", "dahs kint", "articles", "das", "Kind", "das Kind", "Choose das for Kind.", true],
    ["der Hund", "the dog", "dair hoont", "articles", "der", "Hund", "der Hund", "Choose der for Hund.", true],
    ["die Katze", "the cat", "dee KAT-tsuh", "articles", "die", "Katze", "die Katze", "Choose die for Katze.", true],
    ["das Haus", "the house", "dahs hows", "articles", "das", "Haus", "das Haus", "Choose das for Haus.", true],
    ["Das ist ein Ball.", "That is a ball.", "dahs ist ine bahl", "noun gender", "ein", "Ball", "ein Ball", "Use ein for masculine/neuter nouns.", false],
  ]),
  unit("a1-family", "A1", "A1.4", "Family and people", "core", ["family", "people"], [
    ["Das ist meine Mutter.", "This is my mother.", "dahs ist MY-nuh MOO-ter", "possessives", "meine", "Mutter", "meine Mutter", "Use meine with feminine nouns.", false],
    ["Das ist mein Vater.", "This is my father.", "dahs ist mine FAH-ter", "possessives", "mein", "Vater", "mein Vater", "Use mein with masculine nouns.", false],
    ["Ich habe einen Bruder.", "I have a brother.", "ikh HAH-buh EYE-nen BROO-der", "accusative", "einen", "Bruder", "einen Bruder", "Use einen for a masculine direct object.", false],
    ["Ich habe eine Schwester.", "I have a sister.", "ikh HAH-buh EYE-nuh SHVES-ter", "accusative", "eine", "Schwester", "eine Schwester", "Use eine for feminine nouns.", false],
    ["Mein Freund ist hier.", "My friend is here.", "mine froynt ist heer", "people", "Freund", "Freund", "mein Freund", "Freund can mean friend or boyfriend.", false],
    ["Meine Freundin kommt.", "My friend is coming.", "MY-nuh FROYND-in komt", "people", "Freundin", "Freundin", "meine Freundin", "Freundin is feminine.", false],
    ["Wer ist das?", "Who is that?", "vair ist dahs", "questions", "Wer", "Wer", "Wer ist das?", "Wer means who.", false],
  ]),
  unit("a1-cafe", "A1", "A1.5", "Food and cafe", "core", ["food", "ordering"], [
    ["Ich möchte einen Kaffee.", "I would like a coffee.", "ikh MURKH-tuh EYE-nen kah-FAY", "ordering", "möchte", "möchte", "Ich möchte", "Ich möchte is polite and useful.", false],
    ["Ich möchte Wasser.", "I would like water.", "ikh MURKH-tuh VAH-ser", "ordering", "Wasser", "Wasser", "Ich möchte Wasser", "Water is usually just Wasser.", false],
    ["Was möchten Sie?", "What would you like?", "vas MURKH-ten zee", "politeness", "möchten", "möchten", "Was möchten Sie?", "Sie is polite you.", false],
    ["Die Rechnung, bitte.", "The bill, please.", "dee REKH-noong BIT-tuh", "restaurant", "Rechnung", "Rechnung", "die Rechnung", "Rechnung is feminine.", false],
    ["Das schmeckt gut.", "That tastes good.", "dahs shmekht goot", "food", "gut", "gut", "schmeckt gut", "Schmeckt gut means tastes good.", false],
    ["Ich bin satt.", "I am full.", "ikh bin zaht", "food", "satt", "satt", "Ich bin satt", "Use satt for full after eating.", false],
    ["Haben Sie Tee?", "Do you have tea?", "HAH-ben zee tay", "questions", "Tee", "Tee", "Haben Sie Tee?", "Haben Sie...? asks politely.", false],
  ]),
  unit("a1-city", "A1", "A1.6", "City and directions", "travel", ["places", "directions"], [
    ["Wo ist der Bahnhof?", "Where is the train station?", "voh ist dair BAHN-hof", "questions", "Bahnhof", "Bahnhof", "der Bahnhof", "Bahnhof is masculine.", false],
    ["Wo ist die Toilette?", "Where is the restroom?", "voh ist dee toy-LET-tuh", "questions", "Toilette", "Toilette", "die Toilette", "Toilette is feminine.", false],
    ["Gehen Sie geradeaus.", "Go straight ahead.", "GAY-en zee guh-RAH-duh-ows", "directions", "geradeaus", "geradeaus", "geradeaus", "Geradeaus means straight ahead.", false],
    ["Links ist das Hotel.", "The hotel is on the left.", "links ist dahs hoh-TEL", "directions", "links", "links", "links", "Links means left.", false],
    ["Rechts ist der Park.", "The park is on the right.", "rekhts ist dair park", "directions", "rechts", "rechts", "rechts", "Rechts means right.", false],
    ["Ich suche die Straße.", "I am looking for the street.", "ikh ZOO-khuh dee SHTRAH-suh", "places", "suche", "suche", "Ich suche", "Ich suche means I am looking for.", false],
    ["Ist es weit?", "Is it far?", "ist es vite", "questions", "weit", "weit", "Ist es weit?", "Weit means far.", false],
  ]),
  unit("a1-time", "A1", "A1.7", "Time and plans", "soccer", ["time", "plans", "football"], [
    ["Es ist acht Uhr.", "It is eight o'clock.", "es ist akht oor", "time", "acht", "acht", "acht Uhr", "Use Uhr for clock time.", false],
    ["Das Spiel beginnt um acht.", "The game starts at eight.", "dahs shpeel buh-GINT oom akht", "time", "um", "um", "um acht", "Use um for exact time.", false],
    ["Heute habe ich Zeit.", "Today I have time.", "HOY-tuh HAH-buh ikh tsyte", "plans", "heute", "heute", "heute", "Heute means today.", false],
    ["Morgen komme ich.", "Tomorrow I am coming.", "MOR-gen KOM-uh ikh", "word order", "morgen", "morgen", "Morgen komme ich", "Time first often puts the verb second.", false],
    ["Wann kommst du?", "When are you coming?", "van komst doo", "questions", "Wann", "Wann", "Wann kommst du?", "Wann means when.", false],
    ["Hast du heute Zeit?", "Do you have time today?", "hahst doo HOY-tuh tsyte", "questions", "Hast", "Hast", "Hast du Zeit?", "In yes/no questions, the verb comes first.", false],
    ["Ich kann heute nicht.", "I can't today.", "ikh kahn HOY-tuh nikht", "modal verbs", "nicht", "nicht", "kann nicht", "Nicht negates verbs and ideas.", false],
  ]),
  unit("a1-conversations", "A1", "A1.8", "A1 conversations", "checkpoint", ["checkpoint", "conversation"], [
    ["Ich brauche Hilfe.", "I need help.", "ikh BROW-khuh HIL-fuh", "conversation survival", "Hilfe", "Hilfe", "brauche Hilfe", "Ich brauche means I need.", false],
    ["Wie bitte?", "Pardon? / What?", "vee BIT-tuh", "listening", "Wie bitte", "Wie bitte", "Wie bitte?", "Use Wie bitte? when you need repetition.", false],
    ["Langsam, bitte.", "Slowly, please.", "LANG-zam BIT-tuh", "listening", "Langsam", "Langsam", "Langsam, bitte", "Langsam means slowly.", false],
    ["Ich verstehe nicht.", "I don't understand.", "ikh fair-SHTAY-uh nikht", "conversation survival", "verstehe", "verstehe", "verstehe nicht", "Use this when you are lost.", false],
    ["Können Sie das wiederholen?", "Can you repeat that?", "KUR-nen zee dahs VEE-der-hoh-len", "politeness", "wiederholen", "wiederholen", "das wiederholen", "A polite survival phrase.", false],
    ["Ich lerne Deutsch.", "I am learning German.", "ikh LER-nuh doytsh", "present verbs", "lerne", "lerne", "Ich lerne", "With ich, many verbs end in -e.", false],
    ["Deutsch ist schwer, aber schön.", "German is hard but beautiful.", "doytsh ist shvair AH-ber shurn", "conversation", "aber", "aber", "aber schön", "Aber means but.", false],
  ]),
  unit("a2-cases", "A2", "A2.1", "Cases in real sentences", "core", ["accusative", "dative", "case"], [
    ["Ich sehe den Mann.", "I see the man.", "ikh ZAY-uh dain man", "accusative", "den", "Mann", "den Mann", "Masculine der becomes den as a direct object.", false],
    ["Ich kaufe einen Ball.", "I buy a ball.", "ikh KOW-fuh EYE-nen bahl", "accusative", "einen", "Ball", "einen Ball", "Ein becomes einen for masculine direct objects.", false],
    ["Ich habe eine Karte.", "I have a ticket.", "ikh HAH-buh EYE-nuh KAR-tuh", "accusative", "eine", "Karte", "eine Karte", "Feminine eine stays eine.", false],
    ["Ich helfe meinem Freund.", "I help my friend.", "ikh HEL-fuh MY-nem froynt", "dative", "meinem", "Freund", "meinem Freund", "Helfen often takes dative.", false],
    ["Ich danke der Frau.", "I thank the woman.", "ikh DAHN-kuh dair frow", "dative", "der", "Frau", "der Frau", "Feminine dative uses der.", false],
    ["Ich gehe mit meiner Schwester.", "I go with my sister.", "ikh GAY-uh mit MY-ner SHVES-ter", "dative", "meiner", "Schwester", "mit meiner Schwester", "Mit always takes dative.", false],
    ["Der Ball gehört dem Kind.", "The ball belongs to the child.", "dair bahl guh-HURT dame kint", "dative", "dem", "Kind", "dem Kind", "Neuter dative uses dem.", false],
  ]),
  unit("a2-modals", "A2", "A2.2", "Modal verbs", "core", ["modal verbs", "word order"], [
    ["Ich kann Deutsch sprechen.", "I can speak German.", "ikh kahn doytsh SHPREKH-en", "modal verbs", "kann", "kann", "kann sprechen", "With modal verbs, the second verb goes to the end.", false],
    ["Ich will ins Stadion gehen.", "I want to go to the stadium.", "ikh vil ins SHTA-dee-on GAY-en", "modal verbs", "will", "will", "will gehen", "Will means want to.", false],
    ["Ich muss heute arbeiten.", "I have to work today.", "ikh moos HOY-tuh AR-byte-en", "modal verbs", "muss", "muss", "muss arbeiten", "Muss means have to.", false],
    ["Wir können morgen kommen.", "We can come tomorrow.", "veer KUR-nen MOR-gen KOM-en", "modal verbs", "können", "können", "können kommen", "Wir uses können.", false],
    ["Kannst du mir helfen?", "Can you help me?", "kanst doo meer HEL-fen", "questions", "Kannst", "Kannst", "Kannst du", "Modal questions put the modal first.", false],
    ["Ich darf hier nicht parken.", "I am not allowed to park here.", "ikh darf heer nikht PAR-ken", "modal verbs", "darf", "darf", "darf nicht", "Darf means may/am allowed to.", false],
    ["Möchtest du Kaffee trinken?", "Would you like to drink coffee?", "MURKH-test doo kah-FAY TRINK-en", "modal verbs", "Möchtest", "Möchtest", "Möchtest du", "Möchtest is polite and friendly.", false],
  ]),
  unit("a2-past", "A2", "A2.3", "Past tense", "core", ["Perfekt", "past tense"], [
    ["Ich habe Deutsch gelernt.", "I learned German.", "ikh HAH-buh doytsh guh-LERNT", "Perfekt", "gelernt", "gelernt", "habe gelernt", "Use haben + past participle for many actions.", false],
    ["Ich habe Kaffee getrunken.", "I drank coffee.", "ikh HAH-buh kah-FAY guh-TROON-ken", "Perfekt", "getrunken", "getrunken", "habe getrunken", "Trinken becomes getrunken.", false],
    ["Ich habe Fußball gespielt.", "I played soccer.", "ikh HAH-buh FOOS-bahl guh-SHPEELT", "Perfekt", "gespielt", "gespielt", "habe gespielt", "Regular participles often use ge-...-t.", false],
    ["Ich bin nach Berlin gefahren.", "I went to Berlin.", "ikh bin nahkh bair-LEEN guh-FAH-ren", "Perfekt", "bin", "bin", "bin gefahren", "Movement often uses sein.", false],
    ["Ich bin nach Hause gegangen.", "I went home.", "ikh bin nahkh HOW-zuh guh-GANG-en", "Perfekt", "gegangen", "gegangen", "bin gegangen", "Gehen uses sein in the past.", false],
    ["Was hast du gemacht?", "What did you do?", "vas hahst doo guh-MAHKHT", "questions", "gemacht", "gemacht", "hast gemacht", "Hast du...? asks about past actions.", false],
    ["Gestern war ich müde.", "Yesterday I was tired.", "GES-tern var ikh MUE-duh", "past tense", "war", "war", "war müde", "War means was.", false],
  ]),
  unit("a2-routine-home", "A2", "A2.4", "Routine and home", "core", ["separable verbs", "home", "routine"], [
    ["Ich stehe um sieben Uhr auf.", "I get up at seven.", "ikh SHTAY-uh oom ZEE-ben oor owf", "separable verbs", "auf", "auf", "stehe auf", "The separable prefix often goes to the end.", false],
    ["Ich rufe dich später an.", "I will call you later.", "ikh ROO-fuh dikh SHPAY-ter an", "separable verbs", "an", "an", "rufe an", "Anrufen splits: ich rufe ... an.", false],
    ["Nach der Arbeit koche ich.", "After work I cook.", "nahkh dair AR-byte KOKH-uh ikh", "word order", "Nach", "Nach", "Nach der Arbeit", "After a time phrase, the verb stays second.", false],
    ["Die Küche ist neben dem Wohnzimmer.", "The kitchen is next to the living room.", "dee KUE-khuh ist NAY-ben dame VOHN-tsim-er", "dative", "dem", "Wohnzimmer", "dem Wohnzimmer", "Location with neben can take dative.", false],
    ["Das Bad ist links.", "The bathroom is on the left.", "dahs baht ist links", "home", "links", "links", "ist links", "Links means on the left.", false],
    ["Ich räume das Zimmer auf.", "I tidy the room.", "ikh ROY-muh dahs TSIM-er owf", "separable verbs", "auf", "auf", "räume auf", "Aufräumen splits.", false],
    ["Ich wohne in einer Wohnung.", "I live in an apartment.", "ikh VOH-nuh in EYE-ner VOH-noong", "dative", "einer", "Wohnung", "in einer Wohnung", "Location uses dative after in.", false],
  ]),
  unit("a2-travel", "A2", "A2.5", "Travel and hotel", "travel", ["travel", "hotel", "transport"], [
    ["Wann fährt der Zug?", "When does the train leave?", "van fairt dair tsoog", "questions", "fährt", "fährt", "der Zug fährt", "Fährt is used with der Zug.", false],
    ["Ich brauche ein Ticket.", "I need a ticket.", "ikh BROW-khuh ine TIK-et", "travel", "Ticket", "Ticket", "ein Ticket", "Ticket is neuter: das Ticket.", false],
    ["Der Zug hat Verspätung.", "The train is delayed.", "dair tsoog hat fair-SHPAY-toong", "travel", "Verspätung", "Verspätung", "hat Verspätung", "Verspätung means delay.", false],
    ["Ich habe ein Zimmer reserviert.", "I reserved a room.", "ikh HAH-buh ine TSIM-er reh-zer-VEERT", "hotel", "reserviert", "reserviert", "habe reserviert", "Reserviert is useful at reception.", false],
    ["Mein Name ist Sam Carter.", "My name is Sam Carter.", "mine NAH-muh ist Sam Carter", "hotel", "Name", "Name", "Mein Name", "Mein Name ist... is formal.", false],
    ["Wo ist der Aufzug?", "Where is the elevator?", "voh ist dair OWF-tsoog", "hotel", "Aufzug", "Aufzug", "der Aufzug", "Aufzug is masculine.", false],
    ["Ich möchte auschecken.", "I would like to check out.", "ikh MURKH-tuh OWS-chek-en", "hotel", "auschecken", "auschecken", "möchte auschecken", "The second verb goes to the end.", false],
  ]),
  unit("a2-health-shopping", "A2", "A2.6", "Health and shopping", "core", ["health", "shopping", "money"], [
    ["Ich habe Kopfschmerzen.", "I have a headache.", "ikh HAH-buh KOPF-shmer-tsen", "health", "Kopfschmerzen", "Kopfschmerzen", "habe Kopfschmerzen", "Use Ich habe for many symptoms.", false],
    ["Mein Bauch tut weh.", "My stomach hurts.", "mine bowkh toot vay", "health", "weh", "weh", "tut weh", "Tut weh means hurts.", false],
    ["Ich brauche eine Apotheke.", "I need a pharmacy.", "ikh BROW-khuh EYE-nuh ah-poh-TAY-kuh", "health", "Apotheke", "Apotheke", "eine Apotheke", "Apotheke is feminine.", false],
    ["Wie viel kostet der Schal?", "How much does the scarf cost?", "vee feel KOS-tet dair shahl", "shopping", "kostet", "kostet", "Wie viel kostet", "Wie viel kostet...? asks price.", false],
    ["Das ist zu teuer.", "That is too expensive.", "dahs ist tsoo TOY-er", "shopping", "teuer", "teuer", "zu teuer", "Zu before an adjective means too.", false],
    ["Haben Sie das in Blau?", "Do you have that in blue?", "HAH-ben zee dahs in blow", "shopping", "Blau", "Blau", "in Blau", "Colors are useful shopping words.", false],
    ["Ich nehme das.", "I'll take that.", "ikh NAY-muh dahs", "shopping", "nehme", "nehme", "Ich nehme das", "Ich nehme das is natural when buying.", false],
  ]),
  unit("a2-opinions", "A2", "A2.7", "Opinions and reasons", "core", ["opinions", "weil", "reasons"], [
    ["Ich finde das Spiel spannend.", "I think the match is exciting.", "ikh FIN-duh dahs shpeel SHPAN-ent", "opinions", "finde", "finde", "Ich finde", "Ich finde... gives an opinion.", false],
    ["Ich mag Fußball.", "I like soccer.", "ikh mahk FOOS-bahl", "opinions", "mag", "mag", "Ich mag", "Mag means like.", false],
    ["Das gefällt mir.", "I like that.", "dahs guh-FELT meer", "dative", "mir", "mir", "gefällt mir", "Gefallen uses dative: mir.", false],
    ["Ich lerne Deutsch, weil ich reisen will.", "I learn German because I want to travel.", "ikh LER-nuh doytsh vile ikh RY-zen vil", "weil", "weil", "weil", "weil ich reisen will", "With weil, the verb goes to the end.", false],
    ["Ich bin müde, weil ich gearbeitet habe.", "I am tired because I worked.", "ikh bin MUE-duh vile ikh guh-AR-byte-et HAH-buh", "weil", "habe", "habe", "gearbeitet habe", "In weil clauses, the conjugated verb goes last.", false],
    ["Ich komme, aber ich habe wenig Zeit.", "I am coming, but I have little time.", "ikh KOM-uh AH-ber ikh HAH-buh VAY-nikh tsyte", "connectors", "aber", "aber", "aber ich", "Aber means but.", false],
    ["Meiner Meinung nach ist das gut.", "In my opinion, that is good.", "MY-ner MY-noong nahkh ist dahs goot", "opinions", "Meinung", "Meinung", "Meiner Meinung nach", "A2 opinion phrase.", false],
  ]),
  unit("a2-soccer-review", "A2", "A2.8", "Soccer and A2 conversations", "soccer", ["football", "world cup", "checkpoint"], [
    ["Die Fußball-Weltmeisterschaft heißt kurz die WM.", "The Soccer World Cup is called die WM for short.", "dee FOOS-bahl VELT-my-ster-shaft hyst koorts dee vay-EM", "football", "WM", "WM", "die WM", "WM is feminine: die WM.", false],
    ["Deutschland gewinnt zwei zu eins.", "Germany wins two to one.", "DOYTCH-lant guh-VINT tsvy tsoo ines", "scores", "zu", "zu", "zwei zu eins", "Scores use zu.", false],
    ["Wie steht das Spiel?", "What is the score?", "vee shtayt dahs shpeel", "football", "steht", "steht", "Wie steht", "This asks the score.", false],
    ["Mein Team hat verloren.", "My team lost.", "mine teem hat fair-LOH-ren", "Perfekt", "verloren", "verloren", "hat verloren", "Verlieren becomes verloren.", false],
    ["Wir haben gewonnen.", "We won.", "veer HAH-ben guh-VON-en", "Perfekt", "gewonnen", "gewonnen", "haben gewonnen", "Gewinnen becomes gewonnen.", false],
    ["Ich war gestern im Stadion.", "I was at the stadium yesterday.", "ikh var GES-tern im SHTA-dee-on", "past tense", "war", "war", "war im Stadion", "War means was.", false],
    ["Ich war im Stadion, weil ich Fußball mag.", "I was at the stadium because I like soccer.", "ikh var im SHTA-dee-on vile ikh FOOS-bahl mahk", "weil", "weil", "weil", "weil ich Fußball mag", "Use weil to give a reason.", false],
  ]),
];

function makeSkill(
  title: string,
  canDo: string,
  skillId: string,
  concept: string,
  scene: string,
  phrase: string,
  meaning: string,
  pronunciation: string,
  tip: string,
  tipExample: string,
  tipMeaning: string,
  checkPrompt: string,
  checkAnswer: string,
  choices: string[],
  gapPrompt: string,
  gapAnswer: string,
  gapChoices: string[],
  builderPrompt: string,
  builderAnswer: string[],
  replyPrompt: string,
  replyAnswer: string,
  replyChoices: string[],
  localObjective: string,
  localPersona: string,
  localTarget: string,
): MicroSkill {
  return {
    title,
    canDo,
    skillId,
    concept,
    scene,
    phrase,
    meaning,
    pronunciation,
    tip,
    tipExample,
    tipMeaning,
    checkPrompt,
    checkAnswer,
    choices,
    gapPrompt,
    gapAnswer,
    gapChoices,
    builderPrompt,
    builderAnswer,
    replyPrompt,
    replyAnswer,
    replyChoices,
    localObjective,
    localPersona,
    localTarget,
  };
}

function unit(
  id: string,
  level: "A1" | "A2",
  unitPrefix: string,
  theme: string,
  track: Track,
  focus: string[],
  entries: Array<[string, string, string, string, string, string, string, string, boolean]>,
): UnitDefinition {
  return {
    id,
    level,
    unitPrefix,
    theme,
    track,
    focus,
    lessons: entries.map(([phrase, meaning, pronunciation, concept, answer, noun, articlePhrase, tip, articleLike], index) => {
      const baseTitle = phrase.replace(/[.?]$/, "");
      const isQuestion = phrase.endsWith("?");
      const choices = articleLike ? ["der", "die", "das"] : [phrase, entries[(index + 1) % entries.length][0], entries[(index + 2) % entries.length][0]];
      const gapChoices = articleLike ? ["der", "die", "das"] : [answer, entries[(index + 1) % entries.length][4], entries[(index + 2) % entries.length][4]];
      const replyChoices = [phrase, entries[(index + 1) % entries.length][0], entries[(index + 2) % entries.length][0]];
      return {
        title: baseTitle,
        canDo: `You can use: ${articlePhrase}.`,
        skillId: `${id}-${index + 1}`,
        concept,
        scene: `${theme}: ${baseTitle}`,
        phrase,
        meaning,
        pronunciation,
        tip,
        tipExample: articlePhrase,
        tipMeaning: meaning,
        checkPrompt: articleLike ? `Choose the article for ${noun}.` : `Choose: ${meaning}`,
        checkAnswer: articleLike ? answer : phrase,
        choices,
        gapPrompt: articleLike ? `Complete: ___ ${noun}.` : `Complete the key word: ${phrase.replace(answer, "___")}`,
        gapAnswer: answer,
        gapChoices,
        builderPrompt: `Build: ${meaning}`,
        builderAnswer: phrase.split(" "),
        replyPrompt: isQuestion ? "Ask this naturally." : `Use this in a ${theme.toLowerCase()} situation.`,
        replyAnswer: phrase,
        replyChoices,
        localObjective: isQuestion ? "Ask the local this question." : `Send the local this idea: ${meaning}`,
        localPersona: `You are a friendly local in a ${theme.toLowerCase()} situation. Keep replies short.`,
        localTarget: phrase,
        articleLike,
      };
    }),
  };
}

export const lessons: Lesson[] = makeLessons();

export const allExercises = lessons.flatMap((item) => item.exercises);

export const exerciseById = new Map(allExercises.map((item) => [item.id, item]));

export const getLessonById = (lessonId: string) => lessons.find((item) => item.id === lessonId);

export const canDoStatements = [...new Map(lessons.map((lesson) => [lesson.canDo, lesson])).entries()].map(([text, lesson]) => ({
  id: lesson.exercises[0]?.skillId ?? lesson.id,
  text,
  lessonId: lesson.id,
  level: lesson.level,
}));

export const localObjectives = allExercises.filter((item) => item.type === "localText");

export const unitCount = lessons.length;
