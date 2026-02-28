import { ProgressRepository } from '../ports/progress-repository';
import { Progress } from '../domain/progress';
import { GetProgress } from './get-progress';

export interface UpdateProgressInput {
  completedLessonIds?: string[];
  lastAccessedLessonId?: string | null;
  lastWatchedPositions?: Record<string, number>;
}

export class UpdateProgress {
  constructor(
    private readonly progressRepo: ProgressRepository,
    private readonly getProgress: GetProgress
  ) {}

  async execute(coursePath: string, input: UpdateProgressInput): Promise<Progress> {
    if (!coursePath || coursePath.trim() === '') {
      return {
        completedLessonIds: [],
        lastAccessedLessonId: null,
        lastWatchedPositions: {},
        lastUpdatedAt: new Date().toISOString(),
      };
    }
    const current = await this.getProgress.execute(coursePath);
    const updated: Progress = {
      completedLessonIds: input.completedLessonIds ?? current.completedLessonIds,
      lastAccessedLessonId: input.lastAccessedLessonId !== undefined ? input.lastAccessedLessonId : current.lastAccessedLessonId,
      lastWatchedPositions: input.lastWatchedPositions ?? current.lastWatchedPositions,
      lastUpdatedAt: new Date().toISOString(),
    };
    await this.progressRepo.save(coursePath, updated);
    return updated;
  }
}
