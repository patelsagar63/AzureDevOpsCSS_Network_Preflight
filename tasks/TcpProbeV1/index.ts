
import * as tl from 'azure-pipelines-task-lib/task';
import * as net from 'net';
import * as tls from 'tls';

function probe(host: string, port: number, timeoutMs: number, useTls: boolean, serverName?: string) {
  return new Promise<{latency:number, alpn?: string}>((resolve, reject) => {
    const started = Date.now();
    const onOk = (sock: net.Socket | tls.TLSSocket) => {
      const latency = Date.now() - started;
      const alpn = (sock as tls.TLSSocket).alpnProtocol;
      sock.destroy();
      resolve({ latency, alpn });
    };
    const onErr = (err: any) => reject(err);

    const options: tls.ConnectionOptions & net.NetConnectOpts = { host, port };
    let sock: net.Socket | tls.TLSSocket;
    if (useTls) {
      if (serverName) (options as tls.ConnectionOptions).servername = serverName;
      (options as tls.ConnectionOptions).rejectUnauthorized = true; // default secure
      sock = tls.connect(options, () => onOk(sock));
    } else {
      sock = net.connect(options, () => onOk(sock));
    }
    sock.setTimeout(timeoutMs, () => { sock.destroy(); onErr(new Error('timeout')); });
    sock.on('error', onErr);
  });
}

async function run() {
  try {
    const targets = tl.getDelimitedInput('targets', '\n', true).filter(Boolean);
    const timeoutMs = Number(tl.getInput('timeoutSeconds', false) || '10') * 1000;
    const useTls = tl.getBoolInput('useTls', false);
    const serverName = tl.getInput('serverName', false);

    const results: any[] = [];
    for (const entry of targets) {
      const [host, portStr] = entry.includes(':') ? entry.split(':') : [entry, '443'];
      const port = parseInt(portStr, 10);
      try {
        const r = await probe(host, port, timeoutMs, useTls, serverName);
        results.push({ target: entry, passed: true, ...r });
      } catch (e: any) {
        results.push({ target: entry, passed: false, error: e.message });
      }
    }

    const lines = [`# Network Preflight — TCP`, `| Target | Latency (ms) | ALPN | OK |`, `|---|---:|:--:|:--:|`];
    for (const r of results) {
      lines.push(`| ${r.target} | ${r.latency ?? '-'} | ${r.alpn ?? '-'} | ${r.passed ? '✅' : '❌'} |`);
    }
    await tl.summary.addAttachment('text/markdown', 'tcp-summary.md', Buffer.from(lines.join('\n')));

    const failed = results.filter(r => !r.passed).map(r => r.target);
    failed.length
      ? tl.setResult(tl.TaskResult.Failed, `TCP unreachable: ${failed.join(', ')}`)
      : tl.setResult(tl.TaskResult.Succeeded, 'All TCP targets reachable');
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err.message ?? String(err));
  }
}
