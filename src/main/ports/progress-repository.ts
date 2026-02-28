import { Progress } from '../domain/progress';

/**
 * Porta para leitura e escrita do progresso de um curso.
 */
export interface ProgressRepository {
  get(coursePath: string): Promise<Progress | null>;
  save(coursePath: string, progress: Progress): Promise<void>;
}
