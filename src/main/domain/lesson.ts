/**
 * Representa uma aula: arquivo de vídeo com metadados para exibição e ordenação.
 */
export interface Lesson {
  id: string;
  path: string;
  name: string;
  extension: string;
  order: number;
  durationSeconds?: number;
}
