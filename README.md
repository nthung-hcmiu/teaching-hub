# Edusoft

A teaching management hub for instructors and students, by Hung Nguyen.

## Live demo
Once deployed on GitHub Pages, it will be available at:
`https://nthung-hcmiu.github.io/teaching-hub/`

## Features

**Teacher view**
- Dashboard — overview stats, class capacity, recent activity
- Courses — CRUD with status (Active / Archived / Draft)
- Classes — card view with enrollment progress
- Students — searchable table with GPA & attendance badges
- Assignments — CRUD + inline grading workflow
- Attendance — QR check-in: the QR code changes every 10 seconds, students scan it and type their MSSV (see below)
- ACBSP Matrix — Standards × Courses heatmap + assessment records
- Settings — export / import JSON, reset demo data

**Student view** (toggle in sidebar, pick a student from the demo roster)
- My Home — personal dashboard with upcoming work and recent grades
- My Schedule — weekly timetable + deadlines
- My Grades — gradebook with weighted course average
- My Assignments — Upcoming / Past tabs, submit workflow

## QR attendance

1. Teacher: **Attendance** → pick a class → **Start attendance**. A separate window (`present.html`) opens with only the QR code: drag it to the projector and click **Toàn màn hình**. The main window keeps the live check-in list. If the browser blocked the popup, click **Open QR window**.
2. Students scan the QR with their phone camera. It opens `checkin.html`, where they enter their MSSV.
3. The teacher's screen validates each check-in live and the student's phone shows the result.
4. **End session** saves the result to History; download it as CSV (opens fine in Excel).

Anti-cheating rules (checked on the teacher's screen; the signing secret never leaves it):
- The QR token changes every 10 s. A scan is accepted only within ~30 s of that QR appearing, so a photo sent to a friend outside class expires quickly.
- The MSSV must be submitted within 5 minutes of the scan.
- One phone can check in only one MSSV per session.
- MSSVs not on the class roster are marked **Needs review**. The teacher can approve, reject, or mark absent students present by hand.

## Modes
Edusoft runs in one of two modes, chosen by `firebase-config.js`:

| | Demo mode (`EDUSOFT_FIREBASE_CONFIG = null`) | Accounts mode (config filled in) |
|---|---|---|
| Sign-in | None | Google or email + password |
| Teachers | One, in one browser | Many; the admin adds them by email |
| Students | Demo "Student" switch only | Real portal: own grades, assignments, attendance |
| Data | This browser's `localStorage` | Firebase Realtime Database, synced across devices |
| QR attendance | Same browser only, or a Database URL in Settings | Works on any phone |

### Turn on accounts mode
1. **Create the database** (skip if you already have one): <https://console.firebase.google.com> → your project → **Build → Realtime Database → Create database** (region e.g. `asia-southeast1`).
2. **Publish the rules**: Realtime Database → **Rules** → replace everything with the contents of [`database.rules.json`](database.rules.json) → **Publish**.
3. **Enable sign-in**: **Build → Authentication → Get started → Sign-in method** → enable **Google** and **Email/Password**.
4. **Allow your site**: Authentication → **Settings → Authorized domains → Add domain** → `nthung-hcmiu.github.io`.
5. **Get the web config**: **Project settings** (gear icon) → **Your apps** → **Web** (`</>`) → register an app (no hosting needed) → copy the `firebaseConfig` object.
6. **Paste it** into `firebase-config.js` as `window.EDUSOFT_FIREBASE_CONFIG = { ... }`, make sure `databaseURL` is included, commit and push. These values are public by design; the rules protect the data.
7. **Become admin**: open the site, sign in, and click **Trở thành quản trị viên**. The first account to do this is the admin, so do it right after deploying.
8. **Bring your data**: on the next screen choose **Tải dữ liệu từ trình duyệt này lên** to upload what this browser has stored (classes, students, attendance history). Do this in the browser you used before.

Then add teachers under **Teachers**, and give each class a roster with student emails (**Students → Import list**, paste MSSV / Name / Email columns from Excel). A student signs in with that exact email and sees only their own records. Email + password accounts must verify their email before they get any access.

Tip for students: if a link is opened inside Zalo or Facebook, Google sign-in may be blocked by the in-app browser. Open the link in Chrome or Safari, or use email + password.

### Who can do what (enforced by `database.rules.json`)
- **Admin**: everything a teacher can, plus add/remove teachers. Cannot read other teachers' data.
- **Teacher**: reads and writes only their own workspace; runs attendance sessions they own.
- **Student**: reads only the records a teacher published for their email; can mark their own assignments as submitted.
- **Anyone with the QR**: can check in to an open session; cannot read other check-ins or change verdicts.

### Attendance only, without accounts
If you only want QR attendance and keep `firebase-config.js` as `null`, publish these simpler rules instead and paste the Database URL into **Settings → Attendance backend**:
```json
{
  "rules": {
    "att": {
      "$sid": {
        ".read": true,
        "meta": { ".write": true },
        "verdicts": { ".write": true },
        "scans":    { "$id": { ".write": "!data.exists()", ".validate": "newData.child('at').val() === now" } },
        "checkins": { "$id": { ".write": "!data.exists()", ".validate": "newData.child('at').val() === now" } }
      }
    }
  }
}
```

## Stack
- `index.html`: React 18 + Tailwind CSS + Lucide icons (all via CDN), compiled in the browser
- `checkin.html` (student check-in) and `present.html` (QR window): plain JS, fast on phones and projectors
- `attendance-backend.js`: shared Firebase / localStorage layer, rotating QR tokens
- `firebase-config.js` + `database.rules.json`: accounts mode
- Firebase Authentication + Realtime Database (free Spark plan is enough for a few teachers)

## How to deploy on GitHub Pages
1. Create a new public GitHub repo named `teaching-hub`
2. Upload the contents of this folder (or `git push`)
3. Repo → Settings → Pages → Source = `main` branch, folder = `/ (root)`
4. Wait ~1 minute, then visit `https://<your-username>.github.io/teaching-hub/`
