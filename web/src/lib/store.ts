import fs from 'node:fs';
import path from 'node:path';
import { jobsPath, sessionsPath } from './paths';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface KlingJob {
  id: string;
  runId: string;
  shotId: string;
  status: JobStatus;
  mode: 'mock' | 'live';
  createdAt: string;
  updatedAt: string;
  url?: string;
  error?: string;
  note?: string;
}

export interface PipelineSession {
  id: string;
  runId: string;
  slug: string;
  packagePath: string;
  exportDir: string;
  shotCount: number;
  shots: Array<{
    shotId: string;
    purpose: string;
    durationSec: number;
    pageIndex: number;
  }>;
  createdAt: string;
  qa?: string;
  shotlistPreview?: string;
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function listJobs(): KlingJob[] {
  return readJson<KlingJob[]>(jobsPath(), []);
}

export function saveJob(job: KlingJob): void {
  const all = listJobs();
  const i = all.findIndex((j) => j.id === job.id);
  if (i >= 0) all[i] = job;
  else all.unshift(job);
  writeJson(jobsPath(), all.slice(0, 200));
}

export function getJob(id: string): KlingJob | undefined {
  return listJobs().find((j) => j.id === id);
}

export function listSessions(): PipelineSession[] {
  return readJson<PipelineSession[]>(sessionsPath(), []);
}

export function saveSession(session: PipelineSession): void {
  const all = listSessions();
  const i = all.findIndex((s) => s.id === session.id);
  if (i >= 0) all[i] = session;
  else all.unshift(session);
  writeJson(sessionsPath(), all.slice(0, 50));
}

export function getSession(id: string): PipelineSession | undefined {
  return listSessions().find((s) => s.id === id);
}
