import { Course } from '../domain/course';
import { Lesson } from '../domain/lesson';

/**
 * Porta para leitura de cursos e aulas a partir de uma fonte (sistema de arquivos, nuvem, etc.).
 */
export interface CourseRepository {
  listCourses(rootPath: string): Promise<Course[]>;
  listLessons(coursePath: string): Promise<Lesson[]>;
}
