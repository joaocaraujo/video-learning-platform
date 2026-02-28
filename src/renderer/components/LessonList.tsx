import React, { useRef, useEffect } from 'react';
import type { Lesson, Progress } from '../global.d';

type LessonStatus = 'not-started' | 'in-progress' | 'completed';

interface LessonListProps {
  lessons: Lesson[];
  progress: Progress | null;
  currentLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson) => void;
  onMarkCompleted: (lessonId: string) => void;
  getLessonStatus: (lessonId: string) => LessonStatus;
  progressPercent: number;
}

const statusLabels: Record<LessonStatus, string> = {
  'not-started': 'Não iniciada',
  'in-progress': 'Em andamento',
  completed: 'Concluída',
};

const statusColors: Record<LessonStatus, string> = {
  'not-started': 'var(--text-muted)',
  'in-progress': 'var(--progress)',
  completed: 'var(--success)',
};

export function LessonList({
  lessons,
  currentLesson,
  onSelectLesson,
  onMarkCompleted,
  getLessonStatus,
  progressPercent,
}: LessonListProps) {
  const currentLessonRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (currentLesson && currentLessonRef.current) {
      currentLessonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [currentLesson?.id]);

  if (lessons.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Nenhuma aula (vídeo) encontrada neste curso.
      </div>
    );
  }
  return (
    <div>
      <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Aulas</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {progressPercent}% concluído
        </span>
      </div>
      <div style={{ marginBottom: '0.5rem', height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--progress)',
            borderRadius: 3,
            transition: 'width 0.2s ease',
          }}
        />
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {lessons.map((lesson) => {
          const status = getLessonStatus(lesson.id);
          const isCurrent = currentLesson?.id === lesson.id;
          return (
            <li
              key={lesson.id}
              ref={isCurrent ? currentLessonRef : undefined}
              style={{
                marginBottom: '0.25rem',
                border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                background: isCurrent ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface)',
              }}
            >
              <button
                type="button"
                onClick={() => onSelectLesson(lesson)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: isCurrent ? 600 : 400 }}>
                  {lesson.order + 1}. {lesson.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: statusColors[status] }}>
                  {statusLabels[status]}
                </span>
              </button>
              <div style={{ padding: '0.25rem 0.75rem', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkCompleted(lesson.id);
                  }}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.25rem 0.5rem',
                    background: status === 'completed' ? 'var(--success)' : 'var(--surface)',
                    color: status === 'completed' ? 'white' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {status === 'completed' ? 'Desmarcar concluída' : 'Marcar como concluída'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
