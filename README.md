
# Azure DevOps CSS - Network Preflight

An Azure DevOps Pipelines extension that verifies reachability of critical endpoints **from the agent** before your production releases.
https://marketplace.visualstudio.com/items?itemName=AzureDevOpsCSS-Sagar.AzureDevOpsCSS-Sagar

## Tasks
- **HTTP(S) Check** — status/latency, header hints
- **DNS Lookup** — A/AAAA/CNAME/TXT/NS, optional custom resolver
- **TCP Probe** — connect to host:port, optional TLS/SNI

All tasks use the **Node 20** execution handler (current guidance for Azure Pipelines tasks).  

## YAML example

stages:
- stage: Preflight
  jobs:
  - job: NetworkChecks
    pool: { vmImage: 'ubuntu-latest' }
    steps:
    - task: HttpCheck@1
      inputs:
        targets: |
          https://api.contoso.com/health
          https://learn.microsoft.com/
        method: HEAD
        timeoutSeconds: 10
        expectStatus: 200-399

    - task: DnsLookup@1
      inputs:
        targets: |
          api.contoso.com
          contoso.database.windows.net
        recordType: A

    - task: TcpProbe@1
      inputs:
        targets: |
          contoso.redis.cache.windows.net:6380
          onprem-gateway.contoso.local:1433
        useTls: true
