import { CourseRepository } from '../ports/course-repository';
import { Lesson } from '../domain/lesson';

export class ListLessons {
  constructor(private readonly courseRepo: CourseRepository) {}

  async execute(coursePath: string): Promise<Lesson[]> {
    if (!coursePath || coursePath.trim() === '') return [];
    return this.courseRepo.listLessons(coursePath);
  }
}
