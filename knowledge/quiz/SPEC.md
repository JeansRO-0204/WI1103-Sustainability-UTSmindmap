# Quiz / flashcard / proficiency spec (shared contract)

Files (all under `knowledge/quiz/`):
- `quiz2.md` original (never edit). `quiz2.raw.json` verbatim parse (from `build/quiz_import.py`; never edit stem/options/answerText).
- `quiz2.tags.json` per-question tags + verification (written by the tagging agent).
- `generated.<MODULE>.json` new questions + flashcards per module (written by generator agents, M1..M7).
- `quiz.json` FINAL merged file consumed by the app (written by `build/quiz_merge.py`).

## quiz.json
```jsonc
{
  "meta": { "generated": "2026-11-05", "quiz2Count": 45 },
  "questions": [{
    "id": "q2-06",                   // quiz2: q2-NN ; generated: g-<module lower>-NN e.g. g-m6-04
    "source": "quiz2" | "generated",
    "n": 6,                          // quiz2 only: original number
    "stem": "…", "options": ["…"],   // quiz2: VERBATIM (markdown inline like *italic* allowed)
    "answer": [3],                   // option indexes (0-based); single-answer in practice
    "answerText": "…",               // exactly options[answer[0]] (quiz2 verbatim)
    "keyStatus": "given" | "inferred" | "disputed",   // inferred = quiz had no key (Q2); disputed = slides disagree, see note
    "module": "M5",                  // primary week
    "nodeIds": ["m5.tfm"],           // 1-3 graph concept ids this tests (must exist in graph.json)
    "topic": "STI & TFM",            // short topic-area label, consistent across questions (see topics list in tags file)
    "explanation": "1-3 sentences why the answer is right (own words), cite [M5 s25]",
    "sources": [{"module":"M5","slides":[25]}],
    "dupOf": "q2-10",                // optional: duplicate of another question, excluded from proficiency weighting
    "note": "optional flag, e.g. quiz key vs slide mismatch"
  }],
  "flashcards": [{
    "id": "fc-m6.paris.cbdr", "nodeId": "m6.paris.cbdr", "module": "M6", "topic": "Paris Agreement",
    "front": "question/prompt (what, why, compare, define)",
    "back": "concise answer (markdown ok, ≤ 70 words), include key numbers",
    "sources": [{"module":"M6","slides":[16]}]
  }]
}
```

## Quiz 2 patterns (generated questions MUST imitate these)
- 4 options (≈55%) or 5 options (≈45%); exactly one correct; no "all of the above" except rarely.
- Stems: direct definition ("What is meant by X"), "Which of the following is/are …", "…, except", "Based on [document/framework], what is …", scenario-with-context-then-ask ("Although X, these still cause …"), "According to the sources …", "This characteristic is called:".
- Heavy on exact terms and numbers from slides (31.89% / 43.2%, 17 goals, 169 targets, 231 indicators, 2015–2030, Perpres 59/2017 → 111/2022, 6, 7, 11, 13, 14, 15).
- Distractors are plausible neighbours from the same topic or lookalike terms from other weeks; some options are absurd absolutes ("Only…", "Ignoring…"). Correct option is often the longest/most complete one — do NOT make that a reliable tell: vary it.
- Language: English, slightly translated-from-Indonesian phrasing is fine; keep terms exactly as on slides.
- Weighted to the concepts the lecturer emphasises (importance 3).

## Topic areas
Use `knowledge/quiz/topics.json` ({topic label: {module, nodeIds[]}}), created by the tagging agent; generators and the app reuse those labels (add new labels only if needed, then append to topics.json).

## Proficiency (app)
Per question/card Leitner boxes 1–5 in localStorage (`mm.quiz`); box moves up on correct, back to 1 on wrong; due intervals by box. Proficiency per topic/module/concept = weighted recent accuracy + box level (0–100%), untested = grey. Shown per week, per topic, and as a ring on mindmap cards. Duplicates (`dupOf`) don't count twice. Export/import JSON of all progress (reviewed ✓ + quiz).

## Quiz 1 additions (bilingual)
Quiz 1 PDF (`quiz1.txt` layout text, `quiz1.raw.txt` raw order): pages 1-6 Indonesian (35 Qs, "Jawab X" keys), pages 7-13 an English version (37 Qs). Items in `quiz1.raw.json` use `source:"quiz1"`, `id:"q1-NN"` (NN = English number when it exists), and carry BOTH languages: `stem`/`options` = English (verbatim from the PDF; translate yourself only for Indonesian-only items, mark `enTranslated:true`), `stemId`/`optionsId` = Indonesian verbatim (absent for English-only items). `answer` index refers to the English option order; map Indonesian options to the same order (store `optionsId` aligned index-by-index to `options`). Merge (`build/quiz_merge.py`): quiz1 raw+tags are merged like quiz2; English/Indonesian text, `calc` and `enTranslated` pass through verbatim (tags may not override them), `optionsId` must have the same length as `options`. The app shows an EN | ID toggle (localStorage `mm.lang`), an ⓘ when `enTranslated`, and `calc` as a 'Worked calculation' block. Bracketed "[Perhitungan: …]" / "(Calculation: …)" notes go in `calc` (verbatim) and feed `explanation`.

## Prediction paper "Latihan Soal UTS Sustainability" (source `latsol`)
Student-made practice paper (credit: Justin Christian @justin_christiannn and Vinca Anindya Aurora @vincaanindyaa, SAPPK 2025), 100 MCQs, Indonesian only, **answer key in a second PDF (`[JAWABAN] LATSOL UTS SUSTAIN.pdf`, same layout, the correct option is set in bold)**, 28 embedded figures (some questions say "Perhatikan gambar berikut!"). Items: `id:"lp-NN"`, `source:"latsol"`, `stemId`/`optionsId` = Indonesian verbatim, `stem`/`options` = AI English translation (`enTranslated:true`, options aligned index-by-index), `images: ["quiz/latsol/lp04-1.jpg", …]` (paths relative to app/public; stem figures in reading order; if an *option* is an image use `optionImages`), `answer`/`answerText`/`answerTextId` = key you worked out from the knowledge base, `keyStatus:"given"` (key = the bold option in the JAWABAN pdf, authors' key; their key is peer-made, so check it against the slides: if the slides clearly contradict it keep their key as `answer` but set `keyStatus:"disputed"` with a `note`; if the bold marking is missing/ambiguous for a question set `keyStatus:"inferred"` with your own key and say why), `confidence:"high|medium|low"` for how sure you are that the key is right, and `note` where relevant. Letters a/b/c/d may repeat or typo (e.g. 'a' twice in Q7): keep the Indonesian verbatim, align by position. Extracted figures: scratchpad `latsol_img/` (pdfimages, named img-<page>-<idx>.png) and page renders `latsol_pages/p-NN.jpg` (60 dpi, use for locating figures; render higher with pdftoppm -r 110 when you need to read one).

**Dependent questions (`after`).** Some prediction-paper items refer to an earlier number ("Masih merujuk pada nomor sebelumnya", a shared table/graph: lp-11←10, 14←13, 28←27, 29←28, 35←34, 52←51, 59←58, 71←70, 72←71). The tag file sets `after: "<predecessor id>"` (validated by `quiz_merge.py`). The app (`pickQueue` in `app/src/quizlib.ts`) always pulls a whole chain into a round, keeps it consecutive and in source order (a round may therefore run a few over the chosen count), and a prediction-paper-only round is played in the paper's own number order. Quiz UI shows a "continues #N" tag.

