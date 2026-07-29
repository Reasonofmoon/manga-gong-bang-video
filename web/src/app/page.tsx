'use client';

import { useCallback, useState } from 'react';

type Shot = {
  shotId: string;
  purpose: string;
  durationSec: number;
  pageIndex: number;
};

type PipelineOk = {
  ok: true;
  sessionId: string;
  runId: string;
  slug: string;
  packagePath: string;
  shotCount: number;
  shots: Shot[];
  shotlistPreview?: string;
  klingMode?: string;
  note?: string;
};

type JobResult = {
  ok: boolean;
  job?: {
    id: string;
    shotId: string;
    status: string;
    mode: string;
    note?: string;
    error?: string;
  };
  handoff?: { promptPreview: string };
  error?: string;
};

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineOk | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [shotDetail, setShotDetail] = useState<{
    prompt: string;
    negative: string;
    guide: string;
  } | null>(null);
  const [jobLog, setJobLog] = useState<JobResult[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const runPipeline = useCallback(async (mode: 'fixture' | 'zip') => {
    setBusy(true);
    setError(null);
    setJobLog([]);
    setShotDetail(null);
    try {
      const fd = new FormData();
      if (mode === 'fixture') {
        fd.set('mode', 'fixture');
      } else {
        if (!file) throw new Error('ZIP 파일을 선택하세요');
        fd.set('file', file);
      }
      const res = await fetch('/api/pipeline', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setResult(data as PipelineOk);
      if (data.shots?.[0]) setSelected(data.shots[0].shotId);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [file]);

  const loadShot = useCallback(
    async (shotId: string) => {
      if (!result) return;
      setSelected(shotId);
      const res = await fetch(`/api/shots/${result.sessionId}/${shotId}`);
      const data = await res.json();
      if (data.ok) {
        setShotDetail({
          prompt: data.files.prompt,
          negative: data.files.negative,
          guide: data.files.guide,
        });
      }
    },
    [result]
  );

  const generate = useCallback(
    async (shotId: string) => {
      if (!result) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/kling/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: result.sessionId, shotId }),
        });
        const data = (await res.json()) as JobResult;
        setJobLog((prev) => [data, ...prev].slice(0, 20));
        if (!data.ok) setError(data.error || data.job?.error || 'generate failed');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [result]
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 border-b border-zinc-800 pb-6">
          <p className="text-xs uppercase tracking-widest text-cyan-400/80">
            manga-gong-bang-video · G9 deploy surface
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Clip package → Kling handoff
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            Upload a manga export ZIP (or run fixture) to build multi-shot Kling prompts.
            Default <code className="text-cyan-300">KLING_MODE=mock</code> — no GPU call;
            use path A guide for real clips. Upstream manga-gong-bang is never modified.
          </p>
        </header>

        <section className="mb-8 grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">1. Export input</h2>
            <input
              type="file"
              accept=".zip,application/zip"
              className="mt-3 block w-full text-sm text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-cyan-700 file:px-3 file:py-1.5 file:text-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => runPipeline('zip')}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium hover:bg-cyan-500 disabled:opacity-40"
              >
                Run pipeline (ZIP)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runPipeline('fixture')}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-40"
              >
                Run fixture demo
              </button>
            </div>
          </div>
          <div className="text-sm text-zinc-400">
            <h2 className="text-sm font-medium text-zinc-200">Deploy notes</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Needs Node server + monorepo <code className="text-zinc-300">scripts/</code></li>
              <li>Docker / Railway / VPS preferred over pure Vercel serverless</li>
              <li>See <code className="text-zinc-300">docs/guides/deployment.md</code></li>
            </ul>
            {busy && <p className="mt-4 text-amber-400">Running pipeline… (may take ~30s)</p>}
            {error && (
              <p className="mt-4 rounded border border-red-900 bg-red-950/50 p-3 text-red-300">
                {error}
              </p>
            )}
          </div>
        </section>

        {result && (
          <section className="space-y-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-lg font-medium">Session</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">sessionId</dt>
                  <dd className="font-mono text-cyan-300">{result.sessionId}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">runId</dt>
                  <dd className="font-mono">{result.runId}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">package</dt>
                  <dd className="font-mono text-xs">{result.packagePath}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">shots / kling</dt>
                  <dd>
                    {result.shotCount} · mode {result.klingMode || 'mock'}
                  </dd>
                </div>
              </dl>
              {result.note && (
                <p className="mt-3 text-xs text-zinc-500">{result.note}</p>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 p-4">
                <h3 className="mb-3 text-sm font-medium">Shots</h3>
                <ul className="max-h-96 space-y-2 overflow-y-auto">
                  {result.shots.map((s) => (
                    <li
                      key={s.shotId}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                        selected === s.shotId
                          ? 'border-cyan-700 bg-cyan-950/40'
                          : 'border-zinc-800'
                      }`}
                    >
                      <button
                        type="button"
                        className="text-left font-mono text-xs hover:text-cyan-300"
                        onClick={() => loadShot(s.shotId)}
                      >
                        {s.shotId}
                        <span className="ml-2 text-zinc-500">
                          {s.purpose} · {s.durationSec}s
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => generate(s.shotId)}
                        className="shrink-0 rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-40"
                      >
                        Generate
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-800 p-4">
                <h3 className="mb-3 text-sm font-medium">Shot detail / prompt</h3>
                {!shotDetail && (
                  <p className="text-sm text-zinc-500">Select a shotId to load prompt.txt</p>
                )}
                {shotDetail && (
                  <div className="space-y-3">
                    <pre className="max-h-48 overflow-auto rounded bg-black/50 p-3 text-xs text-zinc-300 whitespace-pre-wrap">
                      {shotDetail.prompt}
                    </pre>
                    <button
                      type="button"
                      className="text-xs text-cyan-400 hover:underline"
                      onClick={() => navigator.clipboard.writeText(shotDetail.prompt)}
                    >
                      Copy prompt
                    </button>
                    <details className="text-xs text-zinc-500">
                      <summary className="cursor-pointer">negative + guide</summary>
                      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap">
                        {shotDetail.negative}
                        {'\n\n'}
                        {shotDetail.guide}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>

            {result.shotlistPreview && (
              <div className="rounded-xl border border-zinc-800 p-4">
                <h3 className="mb-2 text-sm font-medium">shotlist.md preview</h3>
                <pre className="max-h-56 overflow-auto text-xs text-zinc-400 whitespace-pre-wrap">
                  {result.shotlistPreview}
                </pre>
              </div>
            )}

            {jobLog.length > 0 && (
              <div className="rounded-xl border border-zinc-800 p-4">
                <h3 className="mb-2 text-sm font-medium">Generate log</h3>
                <ul className="space-y-2 text-xs">
                  {jobLog.map((j, i) => (
                    <li key={i} className="rounded border border-zinc-800 bg-zinc-900/60 p-2 font-mono">
                      {j.job
                        ? `${j.job.id} · ${j.job.shotId} · ${j.job.status} · ${j.job.mode} — ${j.job.note || j.job.error || ''}`
                        : j.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <footer className="mt-12 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
          MVP core = clip package. G9 web = package + mock/live job API. Real mp4 still path A or
          live Kling when wired.
        </footer>
      </div>
    </main>
  );
}
