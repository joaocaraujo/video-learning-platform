import * as fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import type { Course } from '../domain/course';

export interface RootCourseSettings {
  displayNames: Record<string, string>;
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

export async function hideCourseInPlatform(rootPath: string, coursePath: string): Promise<void> {
  const all = await loadAll();
  if (!all[rootPath]) all[rootPath] = { displayNames: {}, hidden: [] };
  if (!all[rootPath].hidden.includes(coursePath)) {
    all[rootPath].hidden.push(coursePath);
    await saveAll(all);
  }
}

export async function unhideCourseInPlatform(rootPath: string, coursePath: string): Promise<void> {
  const all = await loadAll();
  if (!all[rootPath]) return;
  all[rootPath].hidden = all[rootPath].hidden.filter((p) => p !== coursePath);
  await saveAll(all);
}

export async function getHiddenCourses(rootPath: string): Promise<Course[]> {
  const settings = await getRootSettings(rootPath);
  return settings.hidden.map((coursePath) => ({
    id: coursePath,
    path: coursePath,
    name: settings.displayNames[coursePath] ?? path.basename(coursePath),
  }));
}
