import tl = require('azure-pipelines-task-lib/task');
import fs = require('fs');
import path = require('path');
import dns = require('dns');

// Use the promise-based DNS Resolver
const dnp = dns.promises;

function publishSummary(name: string, fileBase: string, markdown: string) {
  const dir = process.env['AGENT_TEMPDIRECTORY'] || process.cwd();
  const filePath = path.join(dir, fileBase);
  fs.writeFileSync(filePath, markdown, { encoding: 'utf8' });
  console.log(`##vso[task.addattachment type=Distributedtask.Core.Summary;name=${name}]${filePath}`);
}

function sanitizeName(raw: string) {
  // Trim whitespace and any trailing dot some DNS tools allow (e.g., "contoso.com.")
  return raw.trim().replace(/\.$/, '');
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string) {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const t = setTimeout(() => {
        clearTimeout(t);
        reject(new Error(`${label} timeout after ${ms}ms`));
      }, ms);
    })
  ]);
}

async function run() {
  try {
    // Inputs
    const names = tl.getDelimitedInput('targets', '\n', true).map(sanitizeName).filter(Boolean);
    const typeInput = (tl.getInput('recordType', true) || 'A').toUpperCase() as dns.RecordType;
    const resolverAddr = tl.getInput('resolver', false);
    const timeoutSeconds = Number(tl.getInput('timeoutSeconds', false) || '10');
    const timeoutMs = isFinite(timeoutSeconds) && timeoutSeconds > 0 ? timeoutSeconds * 1000 : 10000;

    // Resolver (promise API)
    const resolver = new dnp.Resolver();
    if (resolverAddr) {
      resolver.setServers([resolverAddr]);
    }
    const serversUsed = (resolver as any).getServers?.() ?? [];

    type Row = { name: string; type: string; answers?: any; passed: boolean; error?: string };
    const results: Row[] = [];

    for (const name of names) {
      // Try the requested record type first
      try {
        const answers = await withTimeout(resolver.resolve(name, typeInput), timeoutMs, `${name} ${typeInput}`);
        results.push({ name, type: typeInput, answers, passed: Array.isArray(answers) && answers.length > 0 });
      } catch (e: any) {
        // Optional graceful fallback to A when non-A lookup fails (uncomment to enable)
        // if (typeInput !== 'A') {
        //   try {
        //     const fallback = await withTimeout(resolver.resolve(name, 'A'), timeoutMs, `${name} A (fallback)`);
        //     results.push({ name, type: 'A (fallback)', answers: fallback, passed: Array.isArray(fallback) && fallback.length > 0 });
        //     continue;
        //   } catch (e2: any) {
        //     results.push({ name, type: typeInput, passed: false, error: (e?.message || 'resolve error') + (e?.code ? ` (${e.code})` : '') });
        //     continue;
        //   }
        // }
        results.push({ name, type: typeInput, passed: false, error: (e?.message || 'resolve error') + (e?.code ? ` (${e.code})` : '') });
      }
    }

    // Markdown summary
    const lines: string[] = [];
    lines.push(`# Network Preflight — DNS`);
    if (serversUsed.length) {
      lines.push(`**Resolver servers**: ${serversUsed.join(', ')}`);
      lines.push('');
    }
    lines.push(`| Name | Type | Answers | OK |`);
    lines.push(`|---|:--:|---|:--:|`);
    for (const r of results) {
      const val = r.answers ? JSON.stringify(r.answers) : (r.error || '-');
      lines.push(`| ${r.name} | ${r.type} | ${val} | ${r.passed ? '✅' : '❌'} |`);
    }
    publishSummary('Network Preflight — DNS', 'dns-summary.md', lines.join('\n'));

    // Set task result
    const failed = results.filter(r => !r.passed).map(r => r.name);
    failed.length
      ? tl.setResult(tl.TaskResult.Failed, `Unresolved DNS: ${failed.join(', ')}`)
      : tl.setResult(tl.TaskResult.Succeeded, 'All DNS lookups resolved');

  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err?.message ?? String(err));
  }
}

run();
