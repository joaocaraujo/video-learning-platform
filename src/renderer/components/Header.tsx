import React from 'react';

interface HeaderProps {
  onAddCourses: () => void;
  onRefresh: () => void;
  courseCount: number;
}

export function Header({ onAddCourses, onRefresh, courseCount }: HeaderProps) {
  return (
    <header
      style={{
        padding: '0.875rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        flexWrap: 'wrap',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
        StudyHub
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 200 }}>
        <button type="button" className="primary" onClick={onAddCourses}>
          Adicionar curso(s)
        </button>
        <button type="button" onClick={onRefresh} title="Atualizar lista">
          Atualizar
        </button>
      </div>
      {courseCount > 0 && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {courseCount} curso{courseCount !== 1 ? 's' : ''}
        </span>
      )}
    </header>
  );
}
