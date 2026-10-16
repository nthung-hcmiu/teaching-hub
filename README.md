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

1. Teacher: **Attendance** → pick a class → **Start attendance**. Use **Projector mode** to show a big QR.
2. Students scan the QR with their phone camera. It opens `checkin.html`, where they enter their MSSV.
3. The teacher's screen validates each check-in live and the student's phone shows the result.
4. **End session** saves the result to History; download it as CSV (opens fine in Excel).

Anti-cheating rules (checked on the teacher's screen; the signing secret never leaves it):
- The QR token changes every 10 s. A scan is accepted only within ~30 s of that QR appearing, so a photo sent to a friend outside class expires quickly.
- The MSSV must be submitted within 5 minutes of the scan.
- One phone can check in only one MSSV per session.
- MSSVs not on the class roster are marked **Needs review**. The teacher can approve, reject, or mark absent students present by hand.

### Connect Firebase (required for real phones)
Without a backend, attendance runs in demo mode: it only works between tabs of the same browser (good for trying it out with **Open as student**).

1. Go to <https://console.firebase.google.com> → **Add project** (free Spark plan is enough).
2. **Build → Realtime Database → Create database** (pick a region, e.g. `asia-southeast1`), start in locked mode.
3. Open the **Rules** tab and paste:
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
   The `=== now` rules force server timestamps, so a phone cannot fake when it scanned.
4. Copy the database URL (e.g. `https://my-class-default-rtdb.asia-southeast1.firebasedatabase.app`) into **Settings → Attendance backend** and click **Save & test**.

The QR link carries the database URL, so students need nothing installed. The roster and history stay in the teacher's browser; only live check-in data goes to Firebase.

## Stack
- Single HTML file
- React 18 + Tailwind CSS + Lucide icons (all via CDN)
- `localStorage` as a demo database
- `checkin.html` + `attendance-backend.js`: lightweight student check-in page (plain JS, loads fast on phones), Firebase Realtime Database for live attendance

## Limitations
This is a **single-file static demo**. Data lives in the visitor's browser only — there is no multi-user backend. To deploy for a real class, port the storage layer to Supabase or Firebase.

## How to deploy on GitHub Pages
1. Create a new public GitHub repo named `teaching-hub`
2. Upload the contents of this folder (or `git push`)
3. Repo → Settings → Pages → Source = `main` branch, folder = `/ (root)`
4. Wait ~1 minute, then visit `https://<your-username>.github.io/teaching-hub/`
