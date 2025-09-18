import tl = require('azure-pipelines-task-lib/task');
import dns = require('dns');
import fs = require('fs');
import path = require('path');


function publishSummary(name: string, fileBase: string, markdown: string) {
  const dir = process.env['AGENT_TEMPDIRECTORY'] || process.cwd();
  const filePath = path.join(dir, fileBase);
  fs.writeFileSync(filePath, markdown, { encoding: 'utf8' });
  console.log(
    `##vso[task.addattachment type=Distributedtask.Core.Summary;name=${name}]${filePath}`
  );
}

async function run() {
  try {
    const names = tl.getDelimitedInput('targets', '\n', true).filter(Boolean);
    const type = (tl.getInput('recordType', true) || 'A').toUpperCase() as 'A'|'AAAA'|'CNAME'|'TXT'|'NS';
    const resolverAddr = tl.getInput('resolver', false);

    const resolver = new (dns.Resolver)();
    if (resolverAddr) resolver.setServers([resolverAddr]);

    const results: any[] = [];
    for (const name of names) {
      try {
        // @ts-ignore — dynamic resolve method by record type
        const answers = await (resolver as any).resolve[name ? type : 'A']?.(name);
        results.push({ name, type, answers, passed: Array.isArray(answers) && answers.length > 0 });
      } catch (e: any) {
        results.push({ name, type, error: e.message, passed: false });
      }
    }

    const lines = [`# Network Preflight — DNS`, `| Name | Type | Answers | OK |`, `|---|:--:|---|:--:|`];
    for (const r of results) {
      const val = r.answers ? JSON.stringify(r.answers) : r.error;
      lines.push(`| ${r.name} | ${r.type} | ${val} | ${r.passed ? '✅' : '❌'} |`);
    }
    publishSummary('Network Preflight — DNS', 'dns-summary.md', lines.join('\n'));

    const failed = results.filter(r => !r.passed).map(r => r.name);
    failed.length
      ? tl.setResult(tl.TaskResult.Failed, `Unresolved DNS: ${failed.join(', ')}`)
      : tl.setResult(tl.TaskResult.Succeeded, 'All DNS lookups resolved');
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err.message ?? String(err));
  }
}
run();
