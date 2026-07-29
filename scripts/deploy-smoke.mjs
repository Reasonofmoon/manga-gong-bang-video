#!/usr/bin/env node
/**
 * Post-deploy smoke checks.
 * Usage:
 *   node scripts/deploy-smoke.mjs
 *   node scripts/deploy-smoke.mjs https://your-app.up.railway.app
 */
const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');

async function main() {
  const errors = [];
  const healthUrl = `${base}/api/health`;
  console.log(`GET ${healthUrl}`);
  const h = await fetch(healthUrl);
  const hj = await h.json();
  console.log(JSON.stringify(hj, null, 2));
  if (!h.ok || !hj.ok) errors.push('health failed');
  if (!hj.checks?.runPipelineScript) errors.push('run-pipeline.mjs missing in container');
  if (!hj.checks?.fixtureMeta) errors.push('fixture missing');

  console.log(`POST ${base}/api/pipeline mode=fixture`);
  const fd = new FormData();
  fd.set('mode', 'fixture');
  const p = await fetch(`${base}/api/pipeline`, { method: 'POST', body: fd });
  const pj = await p.json();
  console.log(
    JSON.stringify(
      {
        status: p.status,
        ok: pj.ok,
        shotCount: pj.shotCount,
        sessionId: pj.sessionId,
        error: pj.error,
      },
      null,
      2
    )
  );
  if (!p.ok || !pj.ok || !pj.shotCount) errors.push('fixture pipeline failed');

  if (pj.sessionId && pj.shots?.[0]?.shotId) {
    const gen = await fetch(`${base}/api/kling/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: pj.sessionId,
        shotId: pj.shots[0].shotId,
        poll: false,
      }),
    });
    const gj = await gen.json();
    console.log(
      JSON.stringify(
        {
          generateStatus: gen.status,
          ok: gj.ok,
          jobStatus: gj.job?.status,
          mode: gj.job?.mode,
          note: gj.job?.note?.slice?.(0, 120),
        },
        null,
        2
      )
    );
    if (!gen.ok && gj.job?.mode !== 'live') errors.push('mock generate failed');
  }

  if (errors.length) {
    console.error(JSON.stringify({ ok: false, errors }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, base }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
