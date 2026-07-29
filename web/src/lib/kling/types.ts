export type KlingMode = 'mock' | 'live';

export interface CreateJobInput {
  runId: string;
  shotId: string;
  prompt: string;
  negative: string;
  durationSec: number;
  refImagePath?: string;
}

export interface CreateJobResult {
  jobId: string;
  mode: KlingMode;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  url?: string;
  note?: string;
}
