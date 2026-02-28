import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Course, Lesson, Progress } from './global.d';
import { CourseList } from './components/CourseList';
import { LessonList } from './components/LessonList';
import { VideoPlayer } from './components/VideoPlayer';
import { Header } from './components/Header';

const SIDEBAR_WIDTH_KEY = 'video-learning-sidebar-width';
const SIDEBAR_MIN = 240;
const SIDEBAR_MAX = 560;
const SIDEBAR_DEFAULT = 320;

function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Próxima aula: primeira não concluída, ou a primeira se nenhuma estiver concluída. */
function getNextLessonToFocus(lessons: Lesson[], progress: Progress | null): Lesson | null {
  if (lessons.length === 0) return null;
  if (!progress || progress.completedLessonIds.length === 0) return lessons[0];
  const completedSet = new Set(progress.completedLessonIds);
  const firstNotCompleted = lessons.find((l) => !completedSet.has(l.id));
  return firstNotCompleted ?? lessons[0];
}

export type OpenCourse = {
  course: Course;
  lessons: Lesson[];
  progress: Progress | null;
  expanded: boolean;
};

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [openCourses, setOpenCourses] = useState<OpenCourse[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, width: 0 });

  const currentOpenCourse = useMemo(
    () => openCourses.find((oc) => oc.lessons.some((l) => l.id === currentLesson?.id)),
    [openCourses, currentLesson]
  );
  const selectedCourse = currentOpenCourse?.course ?? null;
  const lessons = currentOpenCourse?.lessons ?? [];
  const progress = currentOpenCourse?.progress ?? null;

  useEffect(() => {
    try {
      const w = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (w != null) {
        const n = parseInt(w, 10);
        if (Number.isFinite(n) && n >= SIDEBAR_MIN && n <= SIDEBAR_MAX) setSidebarWidth(n);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, width: sidebarWidth };
    setIsResizing(true);
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartRef.current.x;
      setSidebarWidth((w) => {
        const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w + delta));
        resizeStartRef.current = { x: e.clientX, width: next };
        return next;
      });
    };
    const onUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(resizeStartRef.current.width));
      } catch {
        // ignore
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  const loadCourses = useCallback(async () => {
    if (!window.api) return;
    setLoading(true);
    setError(null);
    try {
      const list = await window.api.listCourses();
      setCourses(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar cursos.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.api) loadCourses();
  }, [loadCourses]);

  const handleAddCourses = useCallback(async () => {
    if (!window.api) {
      setError('API não disponível (rode no Electron).');
      return;
    }
    setError(null);
    const folderPath = await window.api.selectFolder();
    if (!folderPath) return;
    setLoading(true);
    try {
      const added = await window.api.addCoursesFromFolder(folderPath);
      await loadCourses();
      if (added.length > 0) {
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar curso(s).');
    } finally {
      setLoading(false);
    }
  }, [loadCourses]);

  const updateOpenCourseProgress = useCallback((coursePath: string, newProgress: Progress) => {
    setOpenCourses((prev) =>
      prev.map((oc) =>
        oc.course.path === coursePath ? { ...oc, progress: newProgress } : oc
      )
    );
  }, []);

  const handleSelectCourse = useCallback(async (course: Course) => {
    if (!window.api) return;
    const existing = openCourses.find((oc) => oc.course.id === course.id);
    if (existing) {
      setOpenCourses((prev) =>
        prev.map((oc) =>
          oc.course.id === course.id ? { ...oc, expanded: !oc.expanded } : oc
        )
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [lessonList, progressData] = await Promise.all([
        window.api.listLessons(course.path),
        window.api.getProgress(course.path),
      ]);
      setOpenCourses((prev) => [
        ...prev,
        { course, lessons: lessonList, progress: progressData, expanded: true },
      ]);
      const nextLesson = getNextLessonToFocus(lessonList, progressData);
      if (nextLesson) {
        setCurrentLesson(nextLesson);
        window.api
          .updateProgress(course.path, { lastAccessedLessonId: nextLesson.id })
          .then((p) => updateOpenCourseProgress(course.path, p));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar curso.');
    } finally {
      setLoading(false);
    }
  }, [openCourses, updateOpenCourseProgress]);

  const handleToggleOpenCourse = useCallback((courseId: string) => {
    setOpenCourses((prev) =>
      prev.map((oc) =>
        oc.course.id === courseId ? { ...oc, expanded: !oc.expanded } : oc
      )
    );
  }, []);

  const handleCloseOpenCourse = useCallback((courseId: string) => {
    setOpenCourses((prev) => prev.filter((oc) => oc.course.id !== courseId));
    if (currentOpenCourse?.course.id === courseId) {
      setCurrentLesson(null);
    }
  }, [currentOpenCourse?.course.id]);

  const handleSelectLesson = useCallback((course: Course, lesson: Lesson) => {
    setCurrentLesson(lesson);
    if (window.api) {
      window.api
        .updateProgress(course.path, { lastAccessedLessonId: lesson.id })
        .then((p) => updateOpenCourseProgress(course.path, p));
    }
  }, [updateOpenCourseProgress]);

  const handleMarkCompleted = useCallback(async (coursePath: string, lessonId: string) => {
    if (!progress || !window.api) return;
    const completed = progress.completedLessonIds.includes(lessonId)
      ? progress.completedLessonIds.filter((id) => id !== lessonId)
      : [...progress.completedLessonIds, lessonId];
    const updated = await window.api.updateProgress(coursePath, {
      completedLessonIds: completed,
    });
    updateOpenCourseProgress(coursePath, updated);
  }, [progress, updateOpenCourseProgress]);

  const handleRenameCourse = useCallback(async (course: Course, newName: string) => {
    if (!window.api) return;
    const updated = await window.api.renameCourse(course.path, newName);
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? updated : c))
    );
    setOpenCourses((prev) =>
      prev.map((oc) => (oc.course.id === course.id ? { ...oc, course: updated } : oc))
    );
  }, []);

  const handleDeleteCourse = useCallback(async (course: Course) => {
    if (!window.api) return;
    await window.api.deleteCourse(course.path);
    setCourses((prev) => prev.filter((c) => c.id !== course.id));
    setOpenCourses((prev) => prev.filter((oc) => oc.course.id !== course.id));
    if (currentOpenCourse?.course.id === course.id) {
      setCurrentLesson(null);
    }
  }, [currentOpenCourse?.course.id]);

  const searchNorm = useMemo(() => normalize(searchQuery).trim(), [searchQuery]);
  const filteredCourses = useMemo(
    () =>
      searchNorm
        ? courses.filter((c) => normalize(c.name).includes(searchNorm))
        : courses,
    [courses, searchNorm]
  );
  const filterLessons = useCallback(
    (lessonList: Lesson[]) =>
      searchNorm ? lessonList.filter((l) => normalize(l.name).includes(searchNorm)) : lessonList,
    [searchNorm]
  );

  const completedCount =
    progress && lessons.length > 0
      ? progress.completedLessonIds.filter((id) => lessons.some((l) => l.id === id)).length
      : 0;
  const progressPercent =
    lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  const getLessonStatus = useCallback(
    (prog: Progress | null, lessonId: string): 'not-started' | 'in-progress' | 'completed' => {
      if (!prog) return 'not-started';
      if (prog.completedLessonIds.includes(lessonId)) return 'completed';
      if (prog.lastAccessedLessonId === lessonId) return 'in-progress';
      return 'not-started';
    },
    []
  );

  const currentIndex = currentLesson ? lessons.findIndex((l) => l.id === currentLesson.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < lessons.length - 1;
  const goPrev = useCallback(() => {
    if (hasPrev && currentOpenCourse && lessons[currentIndex - 1]) {
      handleSelectLesson(currentOpenCourse.course, lessons[currentIndex - 1]);
    }
  }, [hasPrev, currentOpenCourse, currentIndex, lessons, handleSelectLesson]);
  const goNext = useCallback(() => {
    if (hasNext && currentOpenCourse && lessons[currentIndex + 1]) {
      handleSelectLesson(currentOpenCourse.course, lessons[currentIndex + 1]);
    }
  }, [hasNext, currentOpenCourse, currentIndex, lessons, handleSelectLesson]);

  const handlePositionChange = useCallback(
    (lessonId: string, seconds: number) => {
      if (!selectedCourse || !window.api || !progress) return;
      const next = { ...progress.lastWatchedPositions, [lessonId]: seconds };
      window.api
        .updateProgress(selectedCourse.path, { lastWatchedPositions: next })
        .then((p) => updateOpenCourseProgress(selectedCourse.path, p));
    },
    [selectedCourse, progress, updateOpenCourseProgress]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        goPrev();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        goNext();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrev, goNext]);

  const lastPositions = progress?.lastWatchedPositions ?? {};
  const initialTime = currentLesson ? lastPositions[currentLesson.id] : undefined;
  const initialTimeSeconds = typeof initialTime === 'number' ? initialTime : 0;

  return (
    <>
      <Header
        onAddCourses={handleAddCourses}
        onRefresh={loadCourses}
        courseCount={courses.length}
      />
      <main style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside
          className="sidebar-scroll"
          style={{
            ...asideStyle,
            width: Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, sidebarWidth)),
            minWidth: SIDEBAR_MIN,
            maxWidth: SIDEBAR_MAX,
          }}
        >
          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(185, 28, 28, 0.2)', color: '#fecaca', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(185, 28, 28, 0.5)', marginBottom: '0.75rem' }}>
              {error}
            </div>
          )}
          {courses.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Adicione curso(s): escolha uma pasta que tenha vídeos (ou uma pasta com várias subpastas, cada uma com vídeos).
            </div>
          ) : (
            <>
              <div style={{ flexShrink: 0 }}>
                <input
                  type="text"
                  placeholder="Pesquisar cursos e aulas…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              {searchQuery.trim() && filteredCourses.length === 0 && courses.length > 0 ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Nenhum curso corresponde à pesquisa.
                </div>
              ) : null}
              <CourseList
                courses={filteredCourses}
                openCourseIds={openCourses.map((oc) => oc.course.id)}
                selectedCourse={selectedCourse}
                onSelectCourse={handleSelectCourse}
                onRenameCourse={handleRenameCourse}
                onDeleteCourse={handleDeleteCourse}
                loading={loading}
              />
              {openCourses.map((oc) => {
                const filtered = filterLessons(oc.lessons);
                const completedCount =
                  oc.progress && oc.lessons.length > 0
                    ? oc.progress.completedLessonIds.filter((id) =>
                        oc.lessons.some((l) => l.id === id)
                      ).length
                    : 0;
                const progressPercent =
                  oc.lessons.length > 0 ? Math.round((completedCount / oc.lessons.length) * 100) : 0;
                return (
                  <div
                    key={oc.course.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      overflow: 'hidden',
                      background: 'var(--surface)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleOpenCourse(oc.course.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '0.9rem',
                          fontWeight: selectedCourse?.id === oc.course.id ? 600 : 400,
                        }}
                      >
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {oc.course.name}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {oc.expanded ? '▼' : '▶'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCloseOpenCourse(oc.course.id)}
                        title="Fechar curso"
                        style={{
                          padding: '0.35rem 0.5rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    {oc.expanded && (
                      <div
                        className="course-lessons-scroll"
                        style={{
                          borderTop: '1px solid var(--border)',
                          padding: '0 0.5rem 0.5rem',
                          maxHeight: 480,
                          overflowY: 'auto',
                          overflowX: 'hidden',
                        }}
                      >
                        <LessonList
                          lessons={filtered}
                          progress={oc.progress}
                          currentLesson={currentLesson}
                          onSelectLesson={(lesson) => handleSelectLesson(oc.course, lesson)}
                          onMarkCompleted={(lessonId) => handleMarkCompleted(oc.course.path, lessonId)}
                          getLessonStatus={(lessonId) => getLessonStatus(oc.progress, lessonId)}
                          progressPercent={progressPercent}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </aside>
        <div
          role="separator"
          aria-label="Redimensionar sidebar"
          onMouseDown={handleResizeStart}
          style={{
            width: 6,
            minWidth: 6,
            cursor: 'col-resize',
            background: isResizing ? 'var(--accent)' : 'var(--border)',
            flexShrink: 0,
            alignSelf: 'stretch',
            userSelect: 'none',
          }}
        />
        <section style={playerSectionStyle}>
          {currentLesson && window.api && (
            <VideoPlayer
              lesson={currentLesson}
              getVideoUrl={() => window.api.getVideoUrl(currentLesson.path)}
              initialTimeSeconds={initialTimeSeconds}
              onPositionChange={handlePositionChange}
              onPrevLesson={goPrev}
              onNextLesson={goNext}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />
          )}
          {!currentLesson && openCourses.length > 0 && (
            <div style={placeholderStyle}>
              {searchQuery.trim() &&
              openCourses.some((oc) => oc.lessons.length > 0 && filterLessons(oc.lessons).length === 0)
                ? 'Nenhuma aula corresponde à pesquisa.'
                : 'Selecione uma aula na lista ao lado.'}
            </div>
          )}
          {!currentLesson && courses.length === 0 && (
            <div style={placeholderStyle}>
              Selecione um curso na lista.
            </div>
          )}
        </section>
      </main>
    </>
  );
}

const asideStyle: React.CSSProperties = {
  borderRight: '1px solid var(--border-subtle)',
  background: 'var(--surface)',
  padding: '1rem',
  overflowY: 'auto',
  overflowX: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  minHeight: 0,
};

const playerSectionStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  background: '#000',
};

const placeholderStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
  fontSize: '1rem',
};
