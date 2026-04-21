<div align="center">

# SCC - Switch Claude Code

### The multi-provider profile and runtime manager for Claude Code and compatible CLIs

Run Claude, Codex, Droid-routed profiles, GLM, local models, and
Anthropic-compatible APIs without config thrash.

[![License](https://img.shields.io/badge/license-MIT-C15F3C?style=for-the-badge)](LICENSE)
[![npm](https://img.shields.io/npm/v/scc-ai-proxy?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/scc-ai-proxy)

> **Fork of [kaitranntt/ccs](https://github.com/kaitranntt/ccs)** — same core features, published as `scc-ai-proxy` with `scc` as the primary CLI command.

</div>

## Why SCC

SCC gives you one stable command surface while letting you switch between:

- multiple runtimes such as Claude Code, Factory Droid, and Codex CLI
- multiple Claude subscriptions and isolated account contexts
- OAuth providers like Codex, Copilot, Kiro, Claude, Qwen, Kimi, and more
- API and local-model profiles like GLM, Kimi, OpenRouter, Ollama, llama.cpp,
  Novita, and Alibaba Coding Plan

The goal is simple: stop rewriting config files, stop breaking active sessions,
and move between providers in seconds.

## Quick Start

```bash
npm install -g scc-ai-proxy
scc config
```

Both `scc` and `ccs` commands are available after installation.

Then launch whatever runtime fits the task:

```bash
scc
scc codex
scc --target droid glm
scc glm
scc ollama
```

## OpenAI-Compatible Routing

SCC can bridge Claude Code into OpenAI-compatible providers through a local
Anthropic-compatible proxy instead of requiring a native Anthropic upstream.

```bash
scc api create --preset hf
scc hf
```

Need to manage the proxy manually?

```bash
scc proxy start hf
eval "$(scc proxy activate)"
```

The proxy also supports request-time `profile:model` selectors, scenario-based
model routing through `proxy.routing`, and explicit activation helpers such as
`scc proxy activate --fish`.

Guide: [OpenAI-Compatible Provider Routing](./docs/openai-compatible-providers.md)

### Related Project: claude-code-router

[claude-code-router](https://github.com/musistudio/claude-code-router) is an
excellent standalone tool for routing Claude Code requests to OpenAI-compatible
providers. SCC's local proxy and SSE transformation work was directly informed
by CCR's transformer architecture.

Use CCR when you want a standalone router without SCC profile management.
Use SCC when you want the routing flow integrated with SCC profiles, runtime
bridges, and the existing `scc` command surface.

## See SCC In Action

### Usage Analytics

![Analytics Dashboard](assets/screenshots/analytics.webp)

Track usage, costs, and session patterns across profiles.

### Live Auth And Health Monitoring

![Live Auth Monitor](assets/screenshots/live-auth-monitor.webp)

See auth state, account health, and provider readiness without dropping into raw config.

### OAuth Provider Control Center

![CLIProxy API](assets/screenshots/cliproxyapi.webp)

Manage OAuth-backed providers, quota visibility, and proxy-wide routing from one place.

### Managed Tooling And Fallbacks

![WebSearch Fallback](assets/screenshots/websearch.webp)

SCC can provision first-class local tools like WebSearch and image analysis for
third-party launches. Browser automation has a first-class setup path as well.
Guide: [Browser Automation](./docs/browser-automation.md).

## Example Workflow

```bash
# Design with default Claude
scc "design the auth flow"

# Implement with a different provider
scc codex "implement the user service"

# Use a cheaper API profile for routine work
scc glm "clean up tests and docs"

# Run a local model when you need privacy or offline access
scc ollama "summarize these logs"
```

## Upstream Docs

This fork shares the same feature set as the upstream project. Detailed guides
and reference material are available at the upstream docs site:

| If you want to... | Read this |
| --- | --- |
| Install and verify | [Installation](https://docs.ccs.kaitran.ca/getting-started/installation) |
| Go from install to first run | [Your First Session](https://docs.ccs.kaitran.ca/getting-started/first-session) |
| Compare OAuth providers and API profiles | [Provider Overview](https://docs.ccs.kaitran.ca/providers/concepts/overview) |
| Configure profiles, paths, and env vars | [Configuration](https://docs.ccs.kaitran.ca/getting-started/configuration) |
| Browse every command and flag | [CLI Commands](https://docs.ccs.kaitran.ca/reference/cli-commands) |
| Troubleshoot install, auth, or provider failures | [Troubleshooting](https://docs.ccs.kaitran.ca/reference/troubleshooting) |

> Note: upstream docs use `ccs` as the command name — substitute `scc` when following examples.

## Contribute And Report

- Issues: [Sotatek-TrungHoang/scc](https://github.com/Sotatek-TrungHoang/scc/issues)
- Upstream project: [kaitranntt/ccs](https://github.com/kaitranntt/ccs)
- Security reports: [SECURITY.md](./SECURITY.md)
