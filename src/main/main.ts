import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'path';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { FileSystemCourseRepository } from './infrastructure/file-system-course-repository';
import { ListCourses } from './application/list-courses';
import { ListLessons } from './application/list-lessons';
import { GetProgress } from './application/get-progress';
import { UpdateProgress } from './application/update-progress';
import { FileSystemProgressRepository } from './infrastructure/file-system-progress-repository';
import {
  getCourseList,
  addCoursesFromFolder,
  removeCourseFromList,
  setCourseDisplayName as setCourseDisplayNameInStorage,
} from './infrastructure/course-list-storage';

let mainWindow: BrowserWindow | null = null;

// Registo do protocolo "media" para vídeos (deve ser antes de app.ready)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
    },
  },
]);

const courseRepo = new FileSystemCourseRepository();
const progressRepo = new FileSystemProgressRepository();

const listCourses = new ListCourses(courseRepo);
const listLessons = new ListLessons(courseRepo);
const getProgress = new GetProgress(progressRepo);
const updateProgress = new UpdateProgress(progressRepo, getProgress);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// MIME types comuns para vídeo (permite seek no elemento <video>)
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.ogg': 'video/ogg',
  };
  return map[ext] ?? 'application/octet-stream';
}

app.whenReady().then(() => {
  // Servir ficheiros de vídeo com suporte a Range (206) para o seek funcionar
  protocol.handle('media', async (request) => {
    const url = new URL(request.url);
    const pathStr = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const filePath = pathStr.replace(/^file\/?/, '').replace(/\//g, path.sep);

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return new Response('File not found', { status: 404 });
    }

    const size = stat.size;
    const rangeHeader = request.headers.get('Range');

    if (rangeHeader?.startsWith('bytes=')) {
      const range = rangeHeader.slice(6).trim();
      const [startStr, endStr] = range.split('-');
      const start = startStr ? Math.max(0, parseInt(startStr, 10)) : 0;
      const end = endStr ? Math.min(size - 1, parseInt(endStr, 10)) : size - 1;
      const contentLength = end - start + 1;

      const stream = fs.createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(stream) as ReadableStream;

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(contentLength),
          'Accept-Ranges': 'bytes',
          'Content-Type': getContentType(filePath),
        },
      });
    }

    // Sem Range: enviar ficheiro completo (200)
    const stream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(stream) as ReadableStream;
    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes',
        'Content-Type': getContentType(filePath),
      },
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: selecionar pasta (para adicionar curso(s))
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Selecionar pasta do curso (ou pasta com várias pastas de cursos)',
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// IPC: listar cursos (lista de pastas adicionadas; nomes e ocultos na plataforma)
ipcMain.handle('list-courses', async () => {
  return getCourseList();
});

// IPC: adicionar curso(s) a partir de uma pasta (se tiver subpastas sem vídeos na raiz = cada subpasta é curso; senão a pasta é o curso)
ipcMain.handle('add-courses-from-folder', async (_event, folderPath: string) => {
  const detected = await listCourses.execute(folderPath);
  return addCoursesFromFolder(folderPath, detected);
});

// IPC: listar aulas de um curso
ipcMain.handle('list-lessons', async (_event, coursePath: string) => {
  return listLessons.execute(coursePath);
});

// IPC: obter progresso
ipcMain.handle('get-progress', async (_event, coursePath: string) => {
  return getProgress.execute(coursePath);
});

// IPC: atualizar progresso
ipcMain.handle('update-progress', async (
  _event,
  coursePath: string,
  data: { completedLessonIds?: string[]; lastAccessedLessonId?: string; lastWatchedPositions?: Record<string, number> }
) => {
  return updateProgress.execute(coursePath, data);
});

// IPC: obter URL do vídeo para o player (protocolo media: para funcionar no Electron)
ipcMain.handle('get-video-url', async (_event, filePath: string) => {
  const pathEnc = encodeURIComponent(filePath.replace(/\\/g, '/'));
  return 'media://file/' + pathEnc;
});

// IPC: renomear curso apenas na plataforma (não renomeia a pasta no disco)
ipcMain.handle('rename-course', async (_event, coursePath: string, newName: string) => {
  await setCourseDisplayNameInStorage(coursePath, newName);
  return { id: coursePath, path: coursePath, name: newName.trim() };
});

// IPC: remover curso da lista (fica oculto; pode restaurar; não apaga a pasta no disco)
ipcMain.handle('delete-course', async (_event, coursePath: string) => {
  await removeCourseFromList(coursePath);
});

