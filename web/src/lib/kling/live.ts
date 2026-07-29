import fs from 'node:fs';
import path from 'node:path';
import { signHs256Jwt } from './jwt';
import type { CreateJobInput, CreateJobResult } from './types';

export type LiveAuthMode = 'bearer' | 'aksk';

export interface LiveConfig {
  baseUrl: string;
  createPath: string;
  queryPathTemplate: string;
  model: string;
  authMode: LiveAuthMode;
  bearerToken?: string;
  accessKey?: string;
  secretKey?: string;
}

export function loadLiveConfig(): LiveConfig | { error: string } {
  const baseUrl = (process.env.KLING_BASE_URL || 'https://api.klingai.com').replace(
    /\/$/,
    ''
  );
  const createPath =
    process.env.KLING_I2V_PATH || '/v1/videos/image2video';
  const queryPathTemplate =
    process.env.KLING_QUERY_PATH || '/v1/videos/{task_id}';
  const model = process.env.KLING_MODEL || 'kling-v1';

  const accessKey = process.env.KLING_ACCESS_KEY || process.env.KLING_AK;
  const secretKey = process.env.KLING_SECRET_KEY || process.env.KLING_SK;
  const bearer =
    process.env.KLING_API_KEY ||
    process.env.KLING_BEARER_TOKEN ||
    process.env.KLING_TOKEN;

  if (accessKey && secretKey) {
    return {
      baseUrl,
      createPath,
      queryPathTemplate,
      model,
      authMode: 'aksk',
      accessKey,
      secretKey,
    };
  }
  if (bearer) {
    return {
      baseUrl,
      createPath,
      queryPathTemplate,
      model,
      authMode: 'bearer',
      bearerToken: bearer,
    };
  }
  return {
    error:
      'Live mode needs KLING_API_KEY (Bearer) or KLING_ACCESS_KEY+KLING_SECRET_KEY (JWT). See docs/guides/deployment.md',
  };
}

function authHeader(cfg: LiveConfig): string {
  if (cfg.authMode === 'aksk' && cfg.accessKey && cfg.secretKey) {
    return `Bearer ${signHs256Jwt(cfg.accessKey, cfg.secretKey)}`;
  }
  return `Bearer ${cfg.bearerToken || ''}`;
}

function durationEnum(sec: number): '5' | '10' {
  return sec >= 8 ? '10' : '5';
}

function imageToDataUri(refImagePath?: string): string | null {
  if (!refImagePath || !fs.existsSync(refImagePath)) return null;
  const buf = fs.readFileSync(refImagePath);
  const ext = path.extname(refImagePath).toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Submit image-to-video task to configured vendor HTTP API.
 * Request/response shapes follow common Kling Open Platform patterns;
 * override paths via env if your portal differs.
 */
export async function submitLiveImageToVideo(
  input: CreateJobInput
): Promise<CreateJobResult> {
  const loaded = loadLiveConfig();
  if ('error' in loaded) {
    return {
      jobId: `job_fail`,
      mode: 'live',
      status: 'failed',
      note: loaded.error,
    };
  }
  const cfg = loaded;
  const image = imageToDataUri(input.refImagePath);
  if (!image) {
    return {
      jobId: `job_fail`,
      mode: 'live',
      status: 'failed',
      note: `ref image missing: ${input.refImagePath || '(none)'}`,
    };
  }

  const url = `${cfg.baseUrl}${cfg.createPath.startsWith('/') ? '' : '/'}${cfg.createPath}`;
  const body = {
    model_name: cfg.model,
    image,
    prompt: input.prompt.slice(0, 2500),
    negative_prompt: input.negative?.slice(0, 2500) || undefined,
    duration: durationEnum(input.durationSec),
    mode: process.env.KLING_GEN_MODE || 'std',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(cfg),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* raw */
    }

    if (!res.ok) {
      return {
        jobId: `job_http_${res.status}`,
        mode: 'live',
        status: 'failed',
        note: `HTTP ${res.status} from ${url}: ${text.slice(0, 500)}`,
      };
    }

    // Common response envelopes: { data: { task_id } } | { task_id } | { data: { task: { id } } }
    const data = (json.data || json) as Record<string, unknown>;
    const task =
      (data.task as Record<string, unknown> | undefined) ||
      (data.task_result as Record<string, unknown> | undefined);
    const taskId = String(
      data.task_id ||
        data.id ||
        task?.id ||
        task?.task_id ||
        json.task_id ||
        json.id ||
        ''
    );
    if (!taskId) {
      return {
        jobId: `job_parse`,
        mode: 'live',
        status: 'failed',
        note: `Create OK but no task_id in response: ${text.slice(0, 400)}`,
      };
    }

    return {
      jobId: taskId,
      mode: 'live',
      status: 'queued',
      note: `Submitted to ${cfg.baseUrl}. Poll with query path template.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      jobId: `job_err`,
      mode: 'live',
      status: 'failed',
      note: `Network/error: ${msg}`,
    };
  }
}

export async function pollLiveTask(
  taskId: string
): Promise<{ status: 'queued' | 'running' | 'succeeded' | 'failed'; url?: string; note?: string }> {
  const loaded = loadLiveConfig();
  if ('error' in loaded) {
    return { status: 'failed', note: loaded.error };
  }
  const cfg = loaded;
  const qPath = cfg.queryPathTemplate.replace('{task_id}', encodeURIComponent(taskId));
  const url = `${cfg.baseUrl}${qPath.startsWith('/') ? '' : '/'}${qPath}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader(cfg) },
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { status: 'failed', note: `Bad JSON: ${text.slice(0, 300)}` };
    }
    if (!res.ok) {
      return { status: 'failed', note: `HTTP ${res.status}: ${text.slice(0, 300)}` };
    }

    const data = (json.data || json) as Record<string, unknown>;
    const taskStatus = String(
      data.task_status || data.status || data.state || ''
    ).toLowerCase();

    // Extract video url from various envelopes
    const videos =
      (data.task_result as { videos?: Array<{ url?: string }> } | undefined)?.videos ||
      (data.videos as Array<{ url?: string }> | undefined) ||
      [];
    const firstUrl =
      videos[0]?.url ||
      (data.video_url as string | undefined) ||
      (data.url as string | undefined);

    if (
      ['succeed', 'succeeded', 'success', 'completed', 'done'].includes(taskStatus)
    ) {
      return { status: 'succeeded', url: firstUrl, note: taskStatus };
    }
    if (['failed', 'error', 'canceled', 'cancelled'].includes(taskStatus)) {
      return {
        status: 'failed',
        note: String(data.task_status_msg || data.message || taskStatus),
      };
    }
    if (['processing', 'running', 'generating'].includes(taskStatus)) {
      return { status: 'running', note: taskStatus };
    }
    return { status: 'queued', note: taskStatus || 'pending' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 'failed', note: msg };
  }
}
