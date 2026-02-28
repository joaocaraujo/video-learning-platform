# StudyHub

A lightweight local platform to organize and track your progress across downloaded video courses. It runs entirely on your machine and turns a folder of videos into a structured, navigable interface where you can see lessons, resume playback, and mark them as completed.

**The idea:** Many learners store courses in local folders but lose track of where they left off. StudyHub gives you a simple interface: add folder(s) as courses, see all lessons in order, play with a built-in player (seek, speed, resume), and mark lessons complete. No cloud, no accounts—just your files and your progress.

StudyHub is not a content platform. It doesn’t host or distribute courses. It’s a personal progress manager for content you already have on disk.

---

## Technologies

- **Electron** – desktop app (main + renderer)
- **React** + **Vite** – UI
- **TypeScript** – codebase
- **Media Chrome** – video player controls (seek, speed, fullscreen)
- **Local storage** – course list and progress (no external DB)

---

## Requirements

- **Node.js** 18+
- **npm**

---

## Install & run

```bash
git clone <repo-url>
cd video-learning-platform
npm install
```

**Development** (Vite dev server + Electron):

```bash
npm run dev
```

**Production build:**

```bash
npm run build
npm start
```

---

## How to use

1. **Add course(s)**  
   Click **Adicionar curso(s)** and choose one or more folders. Each folder is treated as a course; if a folder contains only subfolders (no videos at root), each subfolder is a course.

2. **Open a course**  
   Click a course in the sidebar to expand it and see the lesson list. Lessons are ordered by numbers in the filename (e.g. `01 - Intro.mp4`) or alphabetically.

3. **Play a lesson**  
   Click a lesson to play it in the built-in player. Use the bar for play/pause, −15 s / +15 s, speed, volume, and fullscreen. Your position is saved so you can resume later.

4. **Track progress**  
   Mark lessons as completed from the lesson list. Progress (completed lessons, last position per lesson) is stored locally (e.g. in app user data and per-course progress files).

5. **Search**  
   Use the search box to filter courses and lessons by name.

6. **Sidebar**  
   Drag the right edge of the sidebar to resize. You can have multiple courses expanded at once.

---

## Supported video formats

mp4, webm, mkv, avi, mov, m4v, ogv, wmv, flv.

---

## License

MIT.
