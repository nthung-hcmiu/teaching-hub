# Denny Teaching Hub

A vibe-coded clone of [study.dennynguyen.online](https://study.dennynguyen.online/) — a teaching management hub for instructors and students.

## Live demo
Once deployed on GitHub Pages, it will be available at:
`https://<your-github-username>.github.io/teaching-hub/`

## Features

**Teacher view**
- Dashboard — overview stats, class capacity, recent activity
- Courses — CRUD with status (Active / Archived / Draft)
- Classes — card view with enrollment progress
- Students — searchable table with GPA & attendance badges
- Assignments — CRUD + inline grading workflow
- ACBSP Matrix — Standards × Courses heatmap + assessment records
- Settings — export / import JSON, reset demo data

**Student view** (toggle in sidebar, pick a student from the demo roster)
- My Home — personal dashboard with upcoming work and recent grades
- My Schedule — weekly timetable + deadlines
- My Grades — gradebook with weighted course average
- My Assignments — Upcoming / Past tabs, submit workflow

## Stack
- Single HTML file
- React 18 + Tailwind CSS + Lucide icons (all via CDN)
- `localStorage` as a demo database

## Limitations
This is a **single-file static demo**. Data lives in the visitor's browser only — there is no multi-user backend. To deploy for a real class, port the storage layer to Supabase or Firebase.

## How to deploy on GitHub Pages
1. Create a new public GitHub repo named `teaching-hub`
2. Upload the contents of this folder (or `git push`)
3. Repo → Settings → Pages → Source = `main` branch, folder = `/ (root)`
4. Wait ~1 minute, then visit `https://<your-username>.github.io/teaching-hub/`
