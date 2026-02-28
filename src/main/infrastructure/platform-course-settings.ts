import * as fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import type { Course } from '../domain/course';

/** Configuração por pasta raiz: nomes personalizados e cursos ocultos (apenas na plataforma, disco intacto). */
export interface RootCourseSettings {
  /** Nome de exibição personalizado por path do curso */
  displayNames: Record<string, string>;
  /** Paths dos cursos ocultos na plataforma (não apaga a pasta) */
  hidden: string[];
}

const SETTINGS_FILENAME = 'platform-courses.json';

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILENAME);
}

async function loadAll(): Promise<Record<string, RootCourseSettings>> {
  try {
    const p = getSettingsPath();
    const data = await fs.readFile(p, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveAll(data: Record<string, RootCourseSettings>): Promise<void> {
  const p = getSettingsPath();
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getRootSettings(rootPath: string): Promise<RootCourseSettings> {
  const all = await loadAll();
  return (
    all[rootPath] ?? {
      displayNames: {},
      hidden: [],
    }
  );
}

/** Aplica configuração da plataforma à lista de cursos (filtra ocultos e aplica nomes). */
export function applySettingsToCourses(
  courses: Course[],
  settings: RootCourseSettings
): Course[] {
  const hiddenSet = new Set(settings.hidden);
  return courses
    .filter((c) => !hiddenSet.has(c.path))
    .map((c) => ({
      ...c,
      name: settings.displayNames[c.path] ?? c.name,
    }));
}

/** Define o nome de exibição do curso na plataforma (não renomeia a pasta). */
export async function setCourseDisplayName(
  rootPath: string,
  coursePath: string,
  displayName: string
): Promise<void> {
  const all = await loadAll();
  if (!all[rootPath]) all[rootPath] = { displayNames: {}, hidden: [] };
  all[rootPath].displayNames[coursePath] = displayName.trim();
  await saveAll(all);
}

/** Oculta o curso da lista na plataforma (não apaga a pasta no disco). */
export async function hideCourseInPlatform(rootPath: string, coursePath: string): Promise<void> {
  const all = await loadAll();
  if (!all[rootPath]) all[rootPath] = { displayNames: {}, hidden: [] };
  if (!all[rootPath].hidden.includes(coursePath)) {
    all[rootPath].hidden.push(coursePath);
    await saveAll(all);
  }
}

/** Restaura curso na lista (remove dos ocultos). */
export async function unhideCourseInPlatform(rootPath: string, coursePath: string): Promise<void> {
  const all = await loadAll();
  if (!all[rootPath]) return;
  all[rootPath].hidden = all[rootPath].hidden.filter((p) => p !== coursePath);
  await saveAll(all);
}

/** Lista cursos que estão ocultos na plataforma (para mostrar opção de restaurar). */
export async function getHiddenCourses(rootPath: string): Promise<Course[]> {
  const settings = await getRootSettings(rootPath);
  return settings.hidden.map((coursePath) => ({
    id: coursePath,
    path: coursePath,
    name: settings.displayNames[coursePath] ?? path.basename(coursePath),
  }));
}
