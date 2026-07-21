# Senior Vibe Agent — VS Code Extension

AI-powered code review for Vibe Coding projects, right in your editor.

## Installation

### Local (Desenvolvimento)

```bash
git clone https://github.com/zequinha-taveira/senior-vibe-agent-vscode.git
cd senior-vibe-agent-vscode
npm install
npm run esbuild
```

Abra a pasta no VS Code e pressione `F5` → uma nova janela (Extension Development Host) abre com a extensão carregada.

### VS Code Marketplace (futuro)

```
ext install senior-vibe.senior-vibe-agent
```

## Pré-requisitos

- **VS Code** 1.85+
- **Python** 3.11+ no PATH
- **Senior Vibe Agent engine** — o engine está em `engine/` na raiz do repositório principal

A extensão localiza o engine automaticamente procurando `engine/bridge.py` no diretório acima de `extensions/vscode/`.

## Comandos

| Comando | Atalho | Descrição |
|---------|--------|-----------|
| `Senior Vibe: Review Workspace` | `Ctrl+Shift+R` | Revisa todo o workspace aberto |
| `Senior Vibe: Review Current File` | — | Revisa apenas o arquivo ativo |
| `Senior Vibe: Toggle Review on Save` | — | Ativa/desativa revisão automática ao salvar |
| `Senior Vibe: Show Results` | — | Abre o painel de resultados |
| `Senior Vibe: Clear Diagnostics` | — | Remove todos os diagnósticos |
| `Senior Vibe: View History` | — | Navega pelo histórico de revisões |

## Como usar

### 1. Revisar o workspace inteiro

Pressione `Ctrl+Shift+R` ou abra a paleta de comandos (`Ctrl+Shift+P`) e digite `Senior Vibe: Review Workspace`.

### 2. Revisar um arquivo específico

Com o arquivo aberto, paleta de comandos → `Senior Vibe: Review Current File`.

### 3. Revisão automática ao salvar

Paleta de comandos → `Senior Vibe: Toggle Review on Save` para ativar. A partir desse momento, todo arquivo salvo é revisado automaticamente (silencioso — sem notificação).

### 4. Ver resultados

- **Problems panel** (`Ctrl+Shift+M`) — findings aparecem como diagnósticos nativos
- **Sidebar** — árvore com categorias e findings (ícone do Senior Vibe na activity bar)
- **Webview panel** — gráfico de score, barras por categoria, findings expansíveis com botões "Navigate to File" e "Show Fix"

Clique em qualquer finding no Problems panel para navegar direto para a linha do código.

## Configurações

| Setting | Default | Descrição |
|---------|---------|-----------|
| `seniorVibe.pythonPath` | `python3` | Caminho do interpretador Python |
| `seniorVibe.reviewOnSave` | `false` | Revisão automática ao salvar |
| `seniorVibe.minSeverity` | `info` | Severidade mínima nos diagnósticos |
| `seniorVibe.showPanelOnReview` | `true` | Abrir painel automaticamente |
| `seniorVibe.excludePatterns` | `[]` | Glob patterns para excluir da revisão |
| `seniorVibe.enableAiFixes` | `false` | Sugestões de correção por IA (requer API key) |
| `seniorVibe.llmProvider` | `auto` | Provider LLM: `auto`, `anthropic` ou `openai` |

### AI Fixes

Para usar sugestões de correção por IA:

1. Defina a variável de ambiente `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY`
2. Ative `seniorVibe.enableAiFixes: true` nas configurações
3. Escolha o provider em `seniorVibe.llmProvider` (`auto` detecta automaticamente)

As sugestões aparecem no painel de resultados junto com os findings estáticos.

## Estrutura do Projeto

```
extensions/vscode/
├── src/
│   ├── extension.ts       # Entry point
│   ├── bridge.ts          # Ponte Python (JSON-RPC)
│   ├── commands.ts        # Registro de comandos
│   ├── config.ts          # Acesso às configurações
│   ├── diagnostics.ts     # Provider do Problems panel
│   ├── panel.ts           # Webview de resultados
│   ├── treeView.ts        # Árvore na sidebar
│   ├── history.ts         # Histórico de revisões
│   └── test/              # Testes unitários + integração
├── package.json
├── tsconfig.json
└── out/extension.js       # Bundle (21kb)
```

## Build

```bash
npm run esbuild     # Bundle minificado de produção
npm run compile     # Compilação TypeScript
npm run test        # Suite de testes
```
