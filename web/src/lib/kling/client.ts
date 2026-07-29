import { randomUUID } from 'node:crypto';
import type { CreateJobInput, CreateJobResult, KlingMode } from './types';

/**
 * Kling adapter boundary.
 * - mock (default): simulates async success for local/demo deploys
 * - live: requires KLING_API_KEY + implemented vendor HTTP calls
 *
 * Real vendor endpoints change often — keep all HTTP here only.
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
  const jobId = `job_${randomUUID().slice(0, 8)}`;

  if (mode === 'live') {
    const key = process.env.KLING_API_KEY;
    if (!key) {
      return {
        jobId,
        mode: 'live',
        status: 'failed',
        note: 'KLING_MODE=live but KLING_API_KEY is missing',
      };
    }
    // Placeholder: wire official Kling API here when credentials/docs are ready.
    // Until then fail clearly rather than fake success in live mode.
    return {
      jobId,
      mode: 'live',
      status: 'failed',
      note:
        'Live Kling HTTP client not configured yet. Set KLING_MODE=mock for demo, or implement client.ts against vendor docs.',
    };
  }

  // mock: immediate "queued" — route will flip to succeeded with placeholder note
  return {
    jobId,
    mode: 'mock',
    status: 'queued',
    note: `Mock job for ${input.shotId}. Prompt length=${input.prompt.length}. No real GPU call.`,
  };
}
