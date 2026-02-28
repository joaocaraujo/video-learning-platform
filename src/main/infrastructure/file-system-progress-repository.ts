import * as fs from 'fs/promises';
import * as path from 'path';
import { ProgressRepository } from '../ports/progress-repository';
import { Progress } from '../domain/progress';

const PROGRESS_FILENAME = 'course-progress.json';

function progressFilePath(coursePath: string): string {
  return path.join(coursePath, PROGRESS_FILENAME);
}

export class FileSystemProgressRepository implements ProgressRepository {
  async get(coursePath: string): Promise<Progress | null> {
    const filePath = progressFilePath(coursePath);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data) as Progress;
      return {
        completedLessonIds: Array.isArray(parsed.completedLessonIds) ? parsed.completedLessonIds : [],
        lastAccessedLessonId: parsed.lastAccessedLessonId ?? null,
        lastWatchedPositions: parsed.lastWatchedPositions && typeof parsed.lastWatchedPositions === 'object'
          ? parsed.lastWatchedPositions
          : {},
        lastUpdatedAt: parsed.lastUpdatedAt ?? new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async save(coursePath: string, progress: Progress): Promise<void> {
    const filePath = progressFilePath(coursePath);
    const data = JSON.stringify(
      {
        completedLessonIds: progress.completedLessonIds,
        lastAccessedLessonId: progress.lastAccessedLessonId,
        lastWatchedPositions: progress.lastWatchedPositions,
        lastUpdatedAt: progress.lastUpdatedAt,
      },
      null,
      2
    );
    await fs.writeFile(filePath, data, 'utf-8');
  }
}
