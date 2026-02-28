import { Lesson } from './lesson';

/**
 * Extrai número do início do nome do arquivo para ordenação natural (ex: "01 - Aula" -> 1).
 * Se não houver número, retorna Infinity para ir ao final na ordenação numérica.
 */
function leadingNumber(name: string): number {
  const match = name.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : Infinity;
}

/**
 * Ordena aulas: prioriza ordem numérica no nome; em empate ou sem número, usa ordem alfabética.
 */
export function sortLessonsByOrder(lessons: Lesson[]): Lesson[] {
  const sorted = [...lessons].sort((a, b) => {
    const numA = leadingNumber(a.name);
    const numB = leadingNumber(b.name);
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  return sorted.map((l, i) => ({ ...l, order: i }));
}
