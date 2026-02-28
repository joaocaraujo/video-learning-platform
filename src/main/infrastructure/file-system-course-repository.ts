import * as fs from 'fs/promises';
import * as path from 'path';
import { CourseRepository } from '../ports/course-repository';
import { Course } from '../domain/course';
import { Lesson } from '../domain/lesson';
import { sortLessonsByOrder } from '../domain/lesson-order';

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.ogv', '.wmv', '.flv',
]);

function isVideoFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Detecta cursos: se a raiz contiver subpastas, cada subpasta é um curso;
 * caso contrário, a própria raiz é o único curso.
 */
async function detectCourses(rootPath: string): Promise<Course[]> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));
  const hasVideoInRoot = entries.some((e) => e.isFile() && isVideoFile(e.name));

  if (dirs.length > 0 && !hasVideoInRoot) {
    return dirs.map((d) => ({
      id: path.join(rootPath, d.name),
      path: path.join(rootPath, d.name),
      name: d.name,
    }));
  }

  return [{ id: rootPath, path: rootPath, name: path.basename(rootPath) || 'Curso' }];
}

/**
 * Lista arquivos de vídeo em um diretório e monta Lesson com ordenação inteligente.
 */
async function listVideoLessons(coursePath: string): Promise<Lesson[]> {
  const entries = await fs.readdir(coursePath, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && isVideoFile(e.name));
  const lessons: Lesson[] = files.map((f, index) => ({
    id: path.join(coursePath, f.name),
    path: path.join(coursePath, f.name),
    name: path.basename(f.name, path.extname(f.name)),
    extension: path.extname(f.name).toLowerCase(),
    order: index,
  }));
  return sortLessonsByOrder(lessons);
}

export class FileSystemCourseRepository implements CourseRepository {
  async listCourses(rootPath: string): Promise<Course[]> {
    const stat = await fs.stat(rootPath);
    if (!stat.isDirectory()) return [];
    return detectCourses(rootPath);
  }

  async listLessons(coursePath: string): Promise<Lesson[]> {
    const stat = await fs.stat(coursePath);
    if (!stat.isDirectory()) return [];
    return listVideoLessons(coursePath);
  }
}
