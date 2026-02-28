import { CourseRepository } from '../ports/course-repository';
import { Course } from '../domain/course';

export class ListCourses {
  constructor(private readonly courseRepo: CourseRepository) {}

  async execute(rootPath: string): Promise<Course[]> {
    if (!rootPath || rootPath.trim() === '') return [];
    return this.courseRepo.listCourses(rootPath);
  }
}
