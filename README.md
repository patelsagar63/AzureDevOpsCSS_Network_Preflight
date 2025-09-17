
# Network Preflight (HTTP/DNS/TCP)

An Azure DevOps Pipelines extension that verifies reachability of critical endpoints **from the agent** before your production releases.

## Tasks

- **HTTP(S) Check** — status/latency, header hints
- **DNS Lookup** — A/AAAA/CNAME/TXT/NS, optional custom resolver
- **TCP Probe** — connect to host:port, optional TLS/SNI

All tasks use the **Node 20** execution handler (current guidance for Azure Pipelines tasks).  
Docs: Add a custom pipelines task extension · Node 20 migration notes.  
[MS Learn](https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops) · (internal) Node20 migration wiki.  
<!-- Citations supplied in conversation -->

## YAML example


stages:
- stage: Preflight
  jobs:
  - job: NetworkChecks
    pool: { vmImage: 'ubuntu-latest' }
    steps:
    - task: NetworkPreflight.HttpCheck@1
      inputs:
        targets: |
          https://api.contoso.com/health
          https://login.microsoftonline.com/.well-known/openid-configuration
        method: HEAD
        timeoutSeconds: 10
        expectStatus: 200-399

    - task: NetworkPreflight.DnsLookup@1
      inputs:
        targets: |
          api.contoso.com
          contoso.database.windows.net
        recordType: A

    - task: NetworkPreflight.TcpProbe@1
      inputs:
        targets: |
          contoso.redis.cache.windows.net:6380
          onprem-gateway.contoso.local:1433
        useTls: true
