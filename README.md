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

Then go to <http://localhost:4180>. You land on the sign-in screen, the
calligraphy loop running behind the brand panel. Sign in with
`admin@erachinese.mn` / `era2026pw` for the teacher's side, or **create an
account** to come in as a new student. **Read [Where the data actually
lives](#where-the-data-actually-lives) before putting anything real into it.** The links under the form open the rest of
the school site — the noticeboard and the contact page.

**To try a live lesson with both roles at once**, open the app in **two browser
tabs**: sign in as `admin@erachinese.mn` in one and a student account you
created in the other. Each tab keeps
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
| Students | Roster with attendance, homework average and skill score; **create a student** (with the password they will sign in with) and **add a teacher** — the only place staff accounts are made; open a card for the skill radar and to record a new assessment |
| Payments 学费 | Tuition control: collected / outstanding / overdue for a month or across all of them, **Bill {month}** to raise the missing invoices in one press, record a payment with its date, amount and method (cash, bank, card, mobile) — part payments stay on the invoice as an **advance** (урьдчилгаа) with the balance still showing — reverse a payment, add a one-off invoice, and set the monthly fee per class |
| News 公告 | The school noticeboard — write a notice, publish it or keep it a draft, pin it to the top, edit or delete it. Published notices are what visitors read on the sign-in page and what students see on their dashboard |

### Student 学生
| Page | What it does |
| --- | --- |
| Dashboard | Attendance, words studied, homework due, average grade, next lesson — a red banner with **Join the lesson** the moment the teacher opens the room, and the pinned school notice |
| My timetable | Every lesson with its number, attendance mark and homework state |
| Lesson detail | Topic, full vocabulary with audio, hand in homework, read the grade and feedback |
| Vocabulary | Flashcard practice on any lesson's word set — flip, shuffle, mark known, ← → and space |
| Homework | To do / submitted / all |
| My progress | Attendance ring, grades over time, skill radar per class |
| My tuition 学费 | What they still owe, what they have paid, the next due date, and every invoice with its status — read-only, their own only |
| News 公告 | The school noticeboard, same notices the sign-in page shows |

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

## The public site

Everything before an account exists lives at `#/p/...`. **Signing in is what
launches**, on the original split screen — the calligraphy loop and the wordmark
on the left, the form on the right. The noticeboard and the contact page
are wrapped in a header and a footer, and the links under the sign-in form
lead to them:

| Page | What a visitor gets |
| --- | --- |
| **Sign in** `#/p/login` | The landing page. Email and password, on the split screen |
| **News** `#/p/news` | The noticeboard. Published notices only; drafts never leave the teacher's screen |
| **Contact** `#/p/contact` | Phone, email, address |
| **Create an account** `#/p/join` | Opens a **student** account, same screen |

The footer repeats the sales and support numbers, both email addresses, the
address, and links to Facebook and Instagram. All of it comes from
`data.school` in [store.js](store.js) — phone numbers, address and social links
are the only invented values in the project, so change them there and they
change everywhere.

## Accounts

Two doors, deliberately different:

- **Students open their own account.** Name, email, password, confirmation.
  Registration can only ever produce a student.
- **Staff cannot self-register.** A teacher account reads every register, grade
  and invoice in the school, so those are created from inside: *Students →
  **Add a teacher***, by someone already signed in as one.

A teacher can also create a student at the desk (*Students → **New student***),
and that form sets a password too — otherwise the account it made could never be
signed into. Everyone can change their own password from the sidebar.

Sign-in gives the same message for an unknown email and a wrong password, so a
stranger cannot use the form to discover who has an account.

### The starting password

The one account that ships, `admin@erachinese.mn`, starts on **`era2026pw`**.
Change it on first sign-in — the password is in this README, so until you do,
anyone who finds the site can sign in as the school office.

### What the passwords are worth

**There is no server.** The school lives in this browser's localStorage, so a
password can only be checked on the client, and anyone with the developer tools
open can read the store. [auth.js](auth.js) does not pretend otherwise. What it
does do is refuse to keep passwords in plain text: every account carries a random
16-byte salt, and what is stored is SHA-256 iterated 600 times over salt+password.
So the saved school never contains a readable password, and one leaked hash does
not unlock a reused one.

That is the honest limit of client-side auth — it keeps passwords out of the
stored data and keeps students out of each other's records, but it is not a
substitute for server-side authentication. Putting real tuition records in front
of the public needs a backend, and this is the piece to replace first.

The SHA-256 implementation is checked byte-for-byte against Node's
`crypto.createHash('sha256')`, including multi-byte UTF-8 and surrogate pairs.

## The noticeboard

The teacher writes it from **News 公告**. Each notice is a headline, an optional
Chinese headline, a date and a body, and carries two switches:

- **Published** — a draft is written but not out. Publishing is what puts it on
  the public site and on every student's dashboard; unpublishing takes it
  straight back down.
- **Pinned** — pinned notices lead the board however old they are, and the pinned
  one is the notice that shows on student dashboards.

Students get the same board under **News**, with the pinned notice repeated as a
strip on their dashboard so school-wide news reaches the people already signed
in, not only visitors.

## My tuition

The school bills the student, so the student can see the bill. **My tuition 学费** shows what
they still owe, what they have paid, when the next invoice falls due, and every invoice on
file with its status — *paid · overdue · part paid · waiting*. It is strictly read-only and
strictly their own: payments are recorded by the teacher in *Payments*, and this page is the
same data read from the other side.

## Getting a student into a class

Registering does not enrol anyone. A student who signs up on the public site,
or who a teacher creates without picking a class, is **in the school but in no
class** — and the school decides where they go.

So they need somewhere to be seen while they wait, and that is what the
**Needs a class** tab on *Students* is. It leads the tabs, carries an amber
count, and the page opens on it whenever anyone is waiting. The dashboard's
*Needs attention* list says the same thing, and each row has **Put in a class**,
pre-picking whatever course they asked for when they signed up.

The join form asks *Which course interests you?* — recorded as a request, not
an enrolment, and cleared once they are placed. Until then the student's own
dashboard says they are waiting and names the class they asked for, instead of
showing an empty timetable.

> The *Students* page is built from the school's students, not from class
> rosters. It used to read the rosters, which meant anyone not yet in a class
> appeared nowhere — and so could never be enrolled either.

### Enrolling raises the invoice

Tuition is billed per student, per class, per month. Enrolling somebody now
raises that invoice there and then, so a new student shows up in **Payments**
immediately instead of waiting for someone to remember *Bill {month}*.

Every enrolment goes through one function, `placeStudent()` in
[store.js](store.js) — the Students page, *New student*, and the class page's
bulk enrol all call it — so no route can enrol somebody and forget to bill
them. It never raises a second invoice for the same student, class and month,
and it never bills a graduate.

Each enrol form carries a **Bill {month} — {fee}** tick, on by default. Untick
it for someone joining at the end of a month; *Bill {month}* will still pick
them up later.

## Rooms

The school's teaching rooms are a list, not something retyped on every class —
which is what let *Room 201*, *room 201* and *201* all mean the same room. The
class form picks from that list, with a box underneath for one that is not on it
yet; whatever is typed there wins and joins the list for next time. A room a
class already used counts as one, so nothing typed before this existed is lost.

Saving a class into a room that already has one at that time — same room, same
start time, a shared weekday — says so and names the other class. It warns and
saves; double-booking is the school's call, not the app's.

## Graduating a student

Finishing a course is not the same as leaving one, so it is not the same as *Remove from the
class*. **Graduate** (from *Students*) keeps the student on the roster of every class they sat
in — that is exactly what keeps their registers, marks, grades and invoices reachable — and
only flips their status:

|  | Studying | Graduated |
|---|---|---|
| On new lesson registers | yes | **no** |
| On registers they were already marked on | yes | **yes** — history stays whole |
| Billed when a month is raised | yes | **no** |
| Unpaid invoices already on the books | owed | **still owed** |
| Counted in class and dashboard totals | yes | no |
| Can sign in | yes | **yes, read-only** |
| Can join a live room or hand in homework | yes | no |

*Students* splits into **Studying · Graduated · All**, so the whole record stays one click
away, and **Bring back** returns someone to studying if they come back. A graduate signing in
gets their history — attendance, words, grades, progress — behind a banner saying the course
is finished, with the live room and the hand-in buttons gone.

Everything reads the status through three helpers in `store.js`: `activeStudents()` for
lists, `rosterOf(classId)` for a class as it stands today, and `registerOf(lesson)` for one
lesson's register. A missing status counts as active, so a school saved before any of this
existed needs no migration.

## Tuition

Each class carries a **monthly fee** (set when the class is created, edited from the class
card or from *Payments*). Billing raises **one invoice per enrolled student per calendar
month**, due on the 5th; it skips anyone already billed for that month, so pressing it twice
changes nothing, and it skips graduates entirely — though what they already owe stays on the
books. An invoice is *paid* once it carries a payment date, *overdue* once its due
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
├── index.html    loads the eight scripts and the stylesheet
├── app.css       design system — brand violet, gold 金, ink 墨, rice paper 宣纸
├── i18n.js       English / Монгол / 中文 dictionaries, calendars and T()
├── auth.js       salted SHA-256 passwords and what they are worth without a server
├── store.js      data model, seed school, lookups, localStorage persistence
├── ui.js         icons, formatting, avatars, tags, modal, toast, charts, speech
├── live.js       shared room state + the online classroom and its tools
├── teacher.js    teacher pages and actions
├── student.js    student pages and actions
├── app.js        session, hash router, the public site, the shell, event delegation
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
different accounts. **There is no reset button.** One sat in the top bar next to the date, and on a
school that is actually being used, a click that erases every student, register,
grade and invoice does not belong next to ordinary navigation. Nothing in the
running app can wipe the school.

To reset deliberately, open the browser console and run `Store.reset()`, or
clear the site's storage. Both are destructive and neither asks twice.

## What ships in the box

**No demo people.** The school starts with:

- **one account** — `admin@erachinese.mn` / `era2026pw`, named *School office*.
  It exists so somebody can get in and set the school up.
- **three empty classes** — HSK 1, HSK 3, Business Chinese, with their fees and
  timetables, and their lessons. Rosters are empty.
- **an empty noticeboard**, no students, no registers, no grades, no invoices.

**Upgrading an existing deploy clears the demo out too.** The old seed shipped
two teachers and eight students, and a school already saved in a browser kept
them — including `sarangerel@erachinese.mn`, whose password used to be printed
here. `migrate()` now removes those ten accounts by their exact seeded email,
along with their registers, grades and invoices, and re-points any class whose
teacher went. Accounts you created yourself are never touched, and if the purge
would leave no staff at all it puts the *School office* account back so the
school is not locked.

First thing to do on a fresh deploy: sign in as that account, change its
password, add the real teachers under *Students → Add a teacher*, and put the
school's real phone, email and address into `defaultSchool()` in
[store.js](store.js).

> **The classes and lessons are still placeholders.** They are there so the app
> is not empty on first sight. Delete them and make your own.

## Where the data actually lives

**In the browser, and nowhere else.** Everything — accounts, students,
registers, grades, invoices, notices — is one JSON blob in `localStorage`
under `era-chinese-lite/v1`, in whichever browser it was typed into.

Deploying to Vercel does not change this. Vercel serves the HTML, CSS and JS as
static files; there is no database and no server-side code, so:

| | |
| --- | --- |
| A student registers on their phone | That account exists **only on their phone**. The teacher never sees it |
| The teacher marks a register | It is saved **only in the teacher's browser** |
| The teacher opens the site on a second computer | An empty school — nothing carries across |
| Someone clears their browser data | **Everything is gone. There is no backup** |
| Two teachers both use it | Two separate schools that never meet |

The cross-tab sync in `live.js` works between **tabs of the same browser on the
same machine** — that is `BroadcastChannel` and a shared `localStorage` key, not
a network.

So this is complete and usable as a **single-machine** record book. It is not
yet a system a school can run on. Making it one means adding a backend and
moving three things to it: the accounts and passwords, the school data, and the
live-lesson state. Supabase or Firebase both drop into a static Vercel site
without a build step, which is the shortest path from here.

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
