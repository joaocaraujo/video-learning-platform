import React, { useState } from 'react';
import type { Course } from '../global.d';

interface CourseListProps {
  courses: Course[];
  openCourseIds: string[];
  selectedCourse: Course | null;
  onSelectCourse: (course: Course) => void;
  onRenameCourse: (course: Course, newName: string) => Promise<void>;
  onDeleteCourse: (course: Course) => Promise<void>;
  loading: boolean;
}

export function CourseList({
  courses,
  openCourseIds,
  selectedCourse,
  onSelectCourse,
  onRenameCourse,
  onDeleteCourse,
  loading,
}: CourseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditName(course.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) {
      cancelEdit();
      return;
    }
    const course = courses.find((c) => c.id === editingId);
    if (!course || course.name === editName.trim()) {
      cancelEdit();
      return;
    }
    setActionLoading(editingId);
    try {
      await onRenameCourse(course, editName.trim());
      cancelEdit();
    } catch {
      // manter em edição em caso de erro
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (course: Course) => {
    const msg = `Remover o curso "${course.name}" da lista?\n\nA pasta no seu computador não será apagada. Para ver o curso de novo, use "Adicionar curso(s)".`;
    if (!window.confirm(msg)) return;
    setActionLoading(course.id);
    try {
      await onDeleteCourse(course);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Carregando cursos…</div>;
  }
  return (
    <div>
      <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: 600 }}>
        Cursos
      </h2>
      {courses.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Nenhum curso na lista. Adicione curso(s) para começar.
        </div>
      ) : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {courses.map((course) => {
          const isOpen = openCourseIds.includes(course.id);
          return (
          <li key={course.id} style={{ marginBottom: '0.25rem' }}>
            {editingId === course.id ? (
              <div
                style={{
                  display: 'flex',
                  gap: '0.25rem',
                  alignItems: 'center',
                  padding: '0.25rem 0',
                }}
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onBlur={saveEdit}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={actionLoading === course.id}
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  border: selectedCourse?.id === course.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 8,
                  background: selectedCourse?.id === course.id ? 'var(--accent)' : 'var(--surface)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectCourse(course)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    padding: '0.6rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    color: selectedCourse?.id === course.id ? 'white' : 'var(--text)',
                    cursor: 'pointer',
                    fontWeight: isOpen ? 600 : 400,
                  }}
                  title={isOpen ? 'Clique para colapsar/expandir' : 'Clique para abrir'}
                >
                  {isOpen ? '▼ ' : ''}{course.name}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(course);
                  }}
                  disabled={!!actionLoading}
                  title="Editar nome"
                  style={{
                    padding: '0.4rem',
                    background: 'transparent',
                    border: 'none',
                    color: selectedCourse?.id === course.id ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(course);
                  }}
                  disabled={!!actionLoading}
                  title="Excluir curso"
                  style={{
                    padding: '0.4rem',
                    background: 'transparent',
                    border: 'none',
                    color: selectedCourse?.id === course.id ? 'rgba(255,255,255,0.9)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  🗑
                </button>
              </div>
            )}
          </li>
          );
        })}
      </ul>
    </div>
  );
}
