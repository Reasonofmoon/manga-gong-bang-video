import { randomUUID } from 'node:crypto';
import type { CreateJobInput, CreateJobResult, KlingMode } from './types';
import { submitLiveImageToVideo } from './live';

/**
 * Kling adapter boundary.
 * - mock (default): simulates success for local/demo deploys
 * - live: HTTP to vendor (Bearer or AK/SK JWT) — see live.ts + deployment.md
 */
export function getKlingMode(): KlingMode {
  const m = (process.env.KLING_MODE || 'mock').toLowerCase();
  if (m === 'live') return 'live';
  return 'mock';
}

export async function createImageToVideoJob(
  input: CreateJobInput
): Promise<CreateJobResult> {
  const mode = getKlingMode();

  if (mode === 'live') {
    return submitLiveImageToVideo(input);
  }

  const jobId = `mock_${randomUUID().slice(0, 8)}`;
  return {
    jobId,
    mode: 'mock',
    status: 'queued',
    note: `Mock job for ${input.shotId}. Prompt length=${input.prompt.length}. No real GPU call.`,
  };
}

export { pollLiveTask, loadLiveConfig } from './live';
