import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  listCourses: () => ipcRenderer.invoke('list-courses'),
  addCoursesFromFolder: (folderPath: string) => ipcRenderer.invoke('add-courses-from-folder', folderPath),
  listLessons: (coursePath: string) => ipcRenderer.invoke('list-lessons', coursePath),
  getProgress: (coursePath: string) => ipcRenderer.invoke('get-progress', coursePath),
  updateProgress: (coursePath: string, data: {
    completedLessonIds?: string[];
    lastAccessedLessonId?: string | null;
    lastWatchedPositions?: Record<string, number>;
  }) => ipcRenderer.invoke('update-progress', coursePath, data),
  getVideoUrl: (filePath: string) => ipcRenderer.invoke('get-video-url', filePath),
  renameCourse: (coursePath: string, newName: string) =>
    ipcRenderer.invoke('rename-course', coursePath, newName),
  deleteCourse: (coursePath: string) => ipcRenderer.invoke('delete-course', coursePath),
});
