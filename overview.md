# Azure DevOps – Network Preflight (HTTP/DNS/TCP)

[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/AzureDevOpsCSS-Sagar.AzureDevOpsCSS-Sagar?label=Marketplacearketplace.visualstudio.com/items?itemName=AzureDevOpsCSS-Sagar.AzureDevOpsCSS-Sagar)
[ttps://img.shields.io/visual-studio-marketplace/i/AzureDevOpsCSS-Sagar.AzureDevOpsCSS-Sagar?color=blue](https://marketplace.visualstudio.com/items?itemName=AzureDevOpsCSS-Sagar.AzureDevOpsCSS-Sagar)
[![Rating](https://img.shields.io/visual-studio-marketplace/rsCSS-Sagar.AzureDevOpsCSS-Sagar?color=ffb300](https://marketplace.visualstudio.com/items?itemName=AzureDevOpsCSS-Sagar.AzureDevOpsCSS-Sagar)

Validate **HTTP**, **DNS**, and **TCP** connectivity from your build/release agents **before critical deployments**. Catch network issues early, fail fast, and ship with confidence.

---

## ✅ Why use Network Preflight?
- Detect **firewall or DNS issues** before production releases.
- Validate **critical endpoints** (APIs, databases, identity providers) from the actual agent environment.
- Reduce deployment failures caused by **network misconfigurations**.

---

## 🚀 Features
- **HTTP(S) Check**  
  Validate URLs for reachability, status codes, latency, and optional headers.
- **DNS Lookup**  
  Resolve A/AAAA/CNAME records with optional expected target validation.
- **TCP Probe**  
  Test raw TCP connectivity to `host:port` with configurable retries and timeouts.

---

## 📦 Tasks Overview
| Task Name       | Purpose                                  | Key Inputs                                  |
|-----------------|------------------------------------------|---------------------------------------------|
| `HttpCheckV1`   | Validate HTTP(S) endpoints              | `url`, `method`, `expectedStatus`          |
| `DnsLookupV1`   | Resolve DNS records                     | `hostname`, `expectedRecordType`           |
| `TcpProbeV1`    | Test TCP connectivity                   | `host`, `port`, `timeoutSeconds`           |

All tasks run on **Node 20** (current Azure Pipelines guidance).

---

## ✅ YAML Example
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