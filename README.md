## Azure DevOps CSS - Network Preflight

An Azure DevOps Pipelines extension that validates network connectivity from the build/release agent before critical deployments. This helps you catch DNS, HTTP, or TCP connectivity issues early in your pipeline.

https://marketplace.visualstudio.com/items?itemName=AzureDevOpsCSS-Sagar.AzureDevOpsCSS-Sagar

## ✅ Why use Network Preflight?

- Detect firewall or DNS issues before production releases.
- Validate critical endpoints (APIs, databases, identity providers) from the actual agent environment.(Self-hosted or Mircosoft-hosted).
- Reduce deployment failures caused by network misconfigurations.

## 🚀 Features

- HTTP(S) Check : Validate URLs for reachability, status codes, latency, and optional header checks.
- DNS Lookup : Resolve A/AAAA/CNAME/TXT/NS records with optional custom DNS resolver.
- TCP Probe : Test raw TCP connectivity to host:port with optional TLS and SNI support.


## 📦 Tasks Overview

All tasks run on Node 20 (current Azure Pipelines guidance).

| Task Name | Purpose | Key Inputs |
| HttpCheck@1 | Validate HTTP(S) endpoints | targets, method, expectStatus |
| DnsLookup@1 | Resolve DNS records | targets, recordType, resolver |
| TcpProbe@1 | Test TCP connectivity (TLS optional) | targets, useTls, serverName |

## 🛠 Inputs (Common)

- targets: Multi-line list of endpoints (URLs or host:port).
- timeoutSeconds: Timeout per check (default: 10).
- failOn (future enhancement): Control failure behavior.

## YAML example
```yaml
pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: HttpCheck@1
    inputs:
      targets: |
        https://contoso.com/health
        https://learn.microsoft.com
      method: HEAD
      timeoutSeconds: 10
      expectStatus: 200-399

  - task: DnsLookup@1
    inputs:
      targets: |
        contoso.com
      recordType: A

  - task: TcpProbe@1
    inputs:
      targets: |
        contoso.com:443
      useTls: true