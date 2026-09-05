# ERA CHINESE · 时代汉语 — teacher & student web

A Chinese-school web app for two roles: **teacher** and **student**, in **English,
Mongolian or Chinese**. Lessons run online — a video call, a shared class board and
a set of teaching tools that every student's screen follows live.

No backend, no build step, no dependencies. Eight static files.

## Run it

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 4180 -d era-chinese-lite
```

Then go to <http://localhost:4180>. On the sign-in screen pick any teacher or
student account — there are no passwords, this is a demo school.

**To try a live lesson with both roles at once**, open the app in **two browser
tabs**: sign in as the teacher in one and as a student in the other. Each tab keeps
its own account (the session lives in `sessionStorage`) while both read and write the
same school.

## Language

The picker sits in the top bar and on the sign-in screen: **English · Монгол · 中文**.
It switches the whole interface, including day and month names and date order
(`Sat 5 Sep` · `9-р сарын 5, Бя` · `9月5日 周六`). The choice is remembered; on a first
visit the browser's own language decides. Chinese words, pinyin and student names are
data, so they never change.

## What each role gets

### Teacher 教师
| Page | What it does |
| --- | --- |
| Dashboard | Next (or in-progress) lesson, class list, attendance trend, and a "needs attention" list — ungraded homework, registers left open, students below 70% |
| My classes | **Create a class** — name, Chinese name, level (HSK 1–6, Business, Conversation), room, weekdays, time — then **enrol students**, either existing ones or a new account created on the spot. Edit or delete a class; remove a student from the roster |
| Lessons | Create, edit and delete lessons; every lesson shows its **position in the course** ("Lesson 5 of 12"), renumbered automatically by date |
| Lesson detail | Attendance register, lesson plan, vocabulary editor, handed-in work, **Complete lesson**, and **Start the online lesson** |
| Online classroom | See below |
| Homework | Every submission across all classes; grade 0–100 with written feedback |
| Students | Roster with attendance, homework average and skill score; create a student; open a card for the skill radar and to record a new assessment |
| Payments 学费 | Tuition control: collected / outstanding / overdue for a month or across all of them, **Bill {month}** to raise the missing invoices in one press, record a payment with its date, amount and method (cash, bank, card, mobile) — part payments stay on the invoice as an **advance** (урьдчилгаа) with the balance still showing — reverse a payment, add a one-off invoice, and set the monthly fee per class |

### Student 学生
| Page | What it does |
| --- | --- |
| Dashboard | Attendance, words studied, homework due, average grade, next lesson — and a red banner with **Join the lesson** the moment the teacher opens the room |
| My timetable | Every lesson with its number, attendance mark and homework state |
| Lesson detail | Topic, full vocabulary with audio, hand in homework, read the grade and feedback |
| Vocabulary | Flashcard practice on any lesson's word set — flip, shuffle, mark known, ← → and space |
| Homework | To do / submitted / all |
| My progress | Attendance ring, grades over time, skill radar per class |

Both roles can play a word aloud in Mandarin — the browser's built-in
`speechSynthesis` with a `zh-CN` voice, so nothing is downloaded.

## The online classroom

Press **Start the online lesson** and the room opens for the whole class.

**Video call.** By default the app builds a [Jitsi Meet](https://meet.jit.si) room and
embeds it in the page; **Join the call** is a separate click, so nobody's camera turns
on before they are ready. **Room settings** switches to your own Zoom / Google Meet /
Teams link instead, or turns video off entirely. **Test camera** opens a self-view with
a live microphone level meter (`getUserMedia`, nothing leaves the machine).

The iframe is created once and deliberately never re-rendered — switching tools or
receiving a chat message will not drop you out of the call.

**Teaching tools 教具** — whatever the teacher picks appears on every student's board:

| Tool | What it does |
| --- | --- |
| **Flashcards** | Steps through the lesson's vocabulary; reveal the pinyin and meaning when you choose, with audio |
| **Writing pad** | A 田字格 practice grid to draw characters on, in four inks, with undo and clear — strokes appear on the students' screens as you finish each one |
| **Quick quiz** | Builds multiple-choice questions from the lesson's words; students tap an answer, the teacher watches the tally fill in, then shows the answer |
| **Big text** | Type a sentence and it appears large on every screen as you type |
| **Pick a student** | Picks at random from whoever is actually in the room |
| **Timer** | A 1 / 3 / 5 / 10-minute countdown, shared by everyone |

Alongside: a **live roster** (who is really in the room, one-click attendance marking,
raised hands), and **chat** both ways.

**Students** get: join the call, follow the board, raise a hand, watch the timer, jump
to the lesson vocabulary.

### How the sync works, and its limit

Room state lives in its own `localStorage` key and is broadcast over a
`BroadcastChannel`, so everything above is live across **tabs and windows of the same
browser on the same machine**. That is what makes the demo work end to end with no
server.

The rest of the school — classes, lessons, attendance marks, homework, payments — syncs
the same way through `store.js`. A teacher marking someone absent or late, or creating a
new lesson, reaches every open student tab without a manual refresh; `Store.save()`
broadcasts the change and `Store.reload()` picks it up on the other end.

The **video call is the part that genuinely crosses the internet** — a Jitsi (or Zoom /
Meet) room works between real people on different machines. The board, chat, quiz and
whiteboard would need a small server or a WebRTC data channel to do the same; every
read goes through `Live.*` and every write ends in `Live.save()`, so that is the one
place to change.

Note that `meet.jit.si` sometimes asks the first participant to sign in as moderator,
and browsers only grant camera and microphone over `https://` or `localhost`.

## Lesson lifecycle

```
scheduled ──▶ in_progress ──▶ completed
     ▲         (room open)         │
     └──────────────────────────────┘   (Reopen puts it back)
```

**Complete lesson** asks for what was covered, the homework and private notes, then
records any student still unmarked as **absent** and closes the register.

## Tuition

Each class carries a **monthly fee** (set when the class is created, edited from the class
card or from *Payments*). Billing raises **one invoice per enrolled student per calendar
month**, due on the 5th; it skips anyone already billed for that month, so pressing it twice
changes nothing. An invoice is *paid* once it carries a payment date, *overdue* once its due
date has passed, *waiting* until then — no status is stored, the dates decide. Changing a fee
only affects invoices raised afterwards. Amounts are tugrik (180,000₮).

**Advances урьдчилгаа.** *Record a payment* asks how much came in; the field defaults to the
whole balance. Anything less is held on the invoice as an advance — the row shows it in its
own column beside the payment date, with what is still owed underneath, and the invoice reads
*Part paid* until the rest arrives. A later payment that covers the balance settles it and the
advance is absorbed. Advances count as **collected**, so only the balance sits in *Outstanding*;
reversing a payment clears both. An advance can never exceed the invoice, and shrinking an
invoice clamps it.

Nothing here talks to a payment provider: the teacher records what the school actually
received.

## Files

```
era-chinese-lite/
├── index.html    loads the six scripts and the stylesheet
├── app.css       design system — brand violet, gold 金, ink 墨, rice paper 宣纸
├── i18n.js       English / Монгол / 中文 dictionaries, calendars and T()
├── store.js      data model, seed school, lookups, localStorage persistence
├── ui.js         icons, formatting, avatars, tags, modal, toast, charts, speech
├── live.js       shared room state + the online classroom and its tools
├── teacher.js    teacher pages and actions
├── student.js    student pages and actions
├── app.js        session, hash router, shell, sign-in, event delegation
└── brand-loop.mp4  the calligraphy clip behind the sign-in panel (8 s, muted, 0.6 MB)
```

## The logo

The mark is the wordmark itself: **ERA CHINESE.** set in Inter Black with the line
**你。让世界更美** in gold, right-aligned so it ends flush with the full stop. It is one
`.logo` block (`.logo--lg` on the sign-in screen, small in the sidebar), so changing the
lockup is a change in one CSS rule. The brand violet `#5227E0` from the logo is the app's
action colour — buttons, active nav links, focus rings, chips, the reset link. Cinnabar
`#C8443C` stays as `--red`, but only where red means something: live lessons, absences,
overdue tuition, wrong quiz answers. The favicon is the wordmark on a violet tile.

The sign-in screen loops `brand-loop.mp4` behind the brand panel under a dark scrim, so the
headline and the "Сонирхогч бус Мэргэжлийн" line stay readable over any frame. Swap the file
to change it — keep it muted and short and it autoplays on its own.

State lives in three keys: `era-chinese-lite/v1` (the school),
`era-chinese-lite/live` (open classrooms) and `era-chinese-lite/lang`, plus
`era-chinese-lite/session` in **sessionStorage**, which is what lets two tabs hold two
different accounts. **Reset demo** in the top bar puts everything back.

## The seeded school

3 classes (HSK 1 Foundations, HSK 3 Intermediate, Business Chinese), 2 teachers,
8 students, 23 lessons spread three weeks either side of today, with attendance,
homework, grades and skill assessments already filled in. Ten vocabulary decks of
eight words each, with pinyin and meanings, carry the lessons. Tuition is billed for
the last three months (180,000₮ · 220,000₮ · 320,000₮ a month) — the older months are
nearly all settled, this month is not.

## Adding to it

- **New payment method** — append to `METHODS` in `store.js`; add the label to the
  dictionaries in `i18n.js` and it shows up in every method picker.
- **New vocabulary deck** — append to `DECKS` in `store.js`; it appears in the
  *New lesson* dialog straight away.
- **New language** — add a dictionary and a calendar to `i18n.js`. Keys are the English
  text, so anything you have not translated falls back to English rather than breaking.
- **New teaching tool** — add an entry to `TOOLS` in `live.js`, a branch in
  `boardHTML()` for what the students see, and one in `toolsHTML()` for the teacher's
  controls.
- **Real backend** — every school read goes through `Store.*` and every write ends in
  `Store.save()`; the same holds for `Live.*`. Those two files are the seam.
