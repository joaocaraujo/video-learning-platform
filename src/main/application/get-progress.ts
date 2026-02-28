import { ProgressRepository } from '../ports/progress-repository';
import { Progress } from '../domain/progress';

const defaultProgress = (): Progress => ({
  completedLessonIds: [],
  lastAccessedLessonId: null,
  lastWatchedPositions: {},
  lastUpdatedAt: new Date().toISOString(),
});

export class GetProgress {
  constructor(private readonly progressRepo: ProgressRepository) {}

  async execute(coursePath: string): Promise<Progress> {
    if (!coursePath || coursePath.trim() === '') return defaultProgress();
    const progress = await this.progressRepo.get(coursePath);
    return progress ?? defaultProgress();
  }
}
