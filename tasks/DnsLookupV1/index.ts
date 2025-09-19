import tl = require('azure-pipelines-task-lib/task');
import dns = require('dns');
import fs = require('fs');
import path = require('path');

type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'NS';

function publishSummary(name: string, fileBase: string, markdown: string) {
  const dir = process.env['AGENT_TEMPDIRECTORY'] || process.cwd();
  const filePath = path.join(dir, fileBase);
  fs.writeFileSync(filePath, markdown, { encoding: 'utf8' });
  console.log(`##vso[task.addattachment type=Distributedtask.Core.Summary;name=${name}]${filePath}`);
}

async function run() {
  try {
    const names = tl.getDelimitedInput('targets', '\n', true).filter(Boolean);
    const typeInput = ((tl.getInput('recordType', true) || 'A').toUpperCase() as DnsRecordType);
    const resolverAddr = tl.getInput('resolver', false);

    const resolver = new dns.Resolver();
    if (resolverAddr) resolver.setServers([resolverAddr]);

    const results: Array<{ name: string; type: string; answers?: any; passed: boolean; error?: string }> = [];

    for (const raw of names) {
      const name = raw.trim().replace(/\.$/, ''); // strip trailing dot if provided
      try {
        // Use the canonical API: resolver.resolve(name, rrtype)
        const answers = await resolver.resolve(name, typeInput as any);
        results.push({ name, type: typeInput, answers, passed: Array.isArray(answers) && answers.length > 0 });
      } catch (e: any) {
        const code = e?.code ? ` (${e.code})` : '';
        results.push({ name, type: typeInput, passed: false, error: (e?.message || 'resolve error') + code });
      }
    }

    // Markdown summary
    const lines = [
      `# Network Preflight — DNS`,
      `| Name | Type | Answers | OK |`,
      `|---|:--:|---|:--:|`
    ];
    for (const r of results) {
      const val = r.answers ? JSON.stringify(r.answers) : (r.error || '-');
      lines.push(`| ${r.name} | ${r.type} | ${val} | ${r.passed ? '✅' : '❌'} |`);
    }
    publishSummary('Network Preflight — DNS', 'dns-summary.md', lines.join('\n'));

    const failed = results.filter(r => !r.passed).map(r => r.name);
    failed.length
      ? tl.setResult(tl.TaskResult.Failed, `Unresolved DNS: ${failed.join(', ')}`)
      : tl.setResult(tl.TaskResult.Succeeded, 'All DNS lookups resolved');
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err?.message ?? String(err));
  }
}
run();
