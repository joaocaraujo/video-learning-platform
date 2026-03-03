declare module '*.png' {
  const src: string;
  export default src;
}

export interface Course {
  id: string;
  path: string;
  name: string;
}

export interface Lesson {
  id: string;
  path: string;
  name: string;
  extension: string;
  order: number;
  durationSeconds?: number;
}

export interface Progress {
  completedLessonIds: string[];
  lastAccessedLessonId: string | null;
  lastWatchedPositions: Record<string, number>;
  lastUpdatedAt: string;
}

declare global {
  interface Window {
    api: {
      selectFolder: () => Promise<string | null>;
      listCourses: () => Promise<Course[]>;
      addCoursesFromFolder: (folderPath: string) => Promise<Course[]>;
      listLessons: (coursePath: string) => Promise<Lesson[]>;
      getProgress: (coursePath: string) => Promise<Progress>;
      updateProgress: (
        coursePath: string,
        data: {
          completedLessonIds?: string[];
          lastAccessedLessonId?: string | null;
          lastWatchedPositions?: Record<string, number>;
        }
      ) => Promise<Progress>;
      getVideoUrl: (filePath: string) => Promise<string>;
      renameCourse: (coursePath: string, newName: string) => Promise<Course>;
      deleteCourse: (coursePath: string) => Promise<void>;
    };
  }
}
