# Senior Vibe Agent — VS Code Extension

AI-powered code review for Vibe Coding projects, right in your editor.

## Quick Start

```bash
# From the extensions/vscode directory:
npm install
npm run esbuild
```

Then open the `extensions/vscode/` folder in VS Code and press `F5` to launch the Extension Development Host.

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `Senior Vibe: Review Workspace` | `Ctrl+Shift+R` | Full review of the current workspace |
| `Senior Vibe: Review Current File` | — | Review only the active file |
| `Senior Vibe: Toggle Review on Save` | — | Enable/disable auto-review on save |
| `Senior Vibe: Show Results` | — | Open the review results panel |
| `Senior Vibe: Clear Diagnostics` | — | Remove all review diagnostics |
| `Senior Vibe: View History` | — | Browse past review results |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `seniorVibe.pythonPath` | `python3` | Python interpreter path |
| `seniorVibe.reviewOnSave` | `false` | Auto-review on file save |
| `seniorVibe.minSeverity` | `info` | Minimum severity in Problems panel |
| `seniorVibe.showPanelOnReview` | `true` | Auto-open results panel |
| `seniorVibe.enableAiFixes` | `false` | Enable AI fix suggestions |
| `seniorVibe.llmProvider` | `auto` | LLM provider (auto/anthropic/openai) |

## Requirements

- Python 3.11+
- Senior Vibe Agent engine (`engine/` at repo root)

## Build

```bash
npm run esbuild          # Production bundle (minified)
npm run compile          # TypeScript compilation
npm run test             # Run test suite
```

## Extension Development

```
extensions/vscode/
├── src/
│   ├── extension.ts      # Entry point
│   ├── bridge.ts         # Python process bridge (JSON-RPC)
│   ├── commands.ts       # Command registrations
│   ├── config.ts         # Settings accessor
│   ├── diagnostics.ts    # Problems panel provider
│   ├── panel.ts          # Webview results panel
│   ├── treeView.ts       # Sidebar tree view
│   ├── history.ts        # Review history store
│   └── test/             # Unit + integration tests
├── package.json
├── tsconfig.json
└── out/extension.js      # Bundled output
```
