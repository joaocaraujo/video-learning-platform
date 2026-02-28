/**
 * Estado persistido do progresso de um curso.
 */
export interface Progress {
  completedLessonIds: string[];
  lastAccessedLessonId: string | null;
  /** Posição em segundos por aula (para retomar onde parou) */
  lastWatchedPositions: Record<string, number>;
  lastUpdatedAt: string; // ISO 8601
}

export function progressPercent(progress: Progress, totalLessons: number): number {
  if (totalLessons === 0) return 0;
  return Math.round((progress.completedLessonIds.length / totalLessons) * 100);
}
