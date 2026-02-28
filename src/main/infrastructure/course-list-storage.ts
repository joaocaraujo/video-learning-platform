import * as fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import type { Course } from '../domain/course';

/** Lista de pastas adicionadas como cursos + nomes (apenas na plataforma). */
export interface CourseListData {
  /** Paths das pastas que são cursos (cada pasta contém os vídeos) */
  coursePaths: string[];
  /** Nome de exibição por path do curso */
  displayNames: Record<string, string>;
  /** @deprecated Mantido para leitura de ficheiros antigos; não usado. */
  hidden?: string[];
}

const STORAGE_FILENAME = 'platform-courses.json';

function getStoragePath(): string {
  return path.join(app.getPath('userData'), STORAGE_FILENAME);
}

async function load(): Promise<CourseListData> {
  try {
    const p = getStoragePath();
    const data = await fs.readFile(p, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      coursePaths: Array.isArray(parsed.coursePaths) ? parsed.coursePaths : [],
      displayNames:
        parsed.displayNames && typeof parsed.displayNames === 'object' ? parsed.displayNames : {},
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
    };
  } catch {
    return { coursePaths: [], displayNames: {}, hidden: [] };
  }
}

async function save(data: CourseListData): Promise<void> {
  const p = getStoragePath();
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
}

/** Lista de cursos (com nomes aplicados). */
export async function getCourseList(): Promise<Course[]> {
  const data = await load();
  return data.coursePaths.map((p) => ({
    id: p,
    path: p,
    name: (data.displayNames[p] ?? path.basename(p)) || 'Curso',
  }));
}

/** Adiciona pastas como cursos: se a pasta tiver subpastas (e sem vídeos na raiz), adiciona cada subpasta; senão adiciona a própria pasta. Retorna os cursos adicionados. */
export async function addCoursesFromFolder(
  folderPath: string,
  detectedCourses: Course[]
): Promise<Course[]> {
  const data = await load();
  const existing = new Set(data.coursePaths);
  const toAdd = detectedCourses.filter((c) => !existing.has(c.path));
  if (toAdd.length === 0) return [];
  for (const c of toAdd) {
    data.coursePaths.push(c.path);
    if (!data.displayNames[c.path]) {
      data.displayNames[c.path] = c.name;
    }
  }
  await save(data);
  return toAdd.map((c) => ({
    ...c,
    name: data.displayNames[c.path] ?? c.name,
  }));
}

/** Remove curso da lista (apenas na plataforma; a pasta no disco não é alterada). */
export async function removeCourseFromList(coursePath: string): Promise<void> {
  const data = await load();
  data.coursePaths = data.coursePaths.filter((p) => p !== coursePath);
  await save(data);
}

/** Define nome de exibição do curso (só na plataforma). */
export async function setCourseDisplayName(
  coursePath: string,
  displayName: string
): Promise<void> {
  const data = await load();
  data.displayNames[coursePath] = displayName.trim();
  await save(data);
}

