import * as vscode from "vscode";
import { Bridge } from "./bridge";
import { Config } from "./config";
import { DiagnosticsProvider } from "./diagnostics";
import { ReviewPanel } from "./panel";
import { ResultsTreeDataProvider } from "./treeView";
import { HistoryStore } from "./history";
import { registerCommands } from "./commands";

const SUPPORTED_LANGUAGES = new Set([
  "javascript", "typescript", "python", "java", "go", "rust", "cpp",
]);

let _bridge: Bridge | null = null;
let _config: Config | null = null;
let _diagnostics: DiagnosticsProvider | null = null;
let _panel: ReviewPanel | null = null;
let _treeProvider: ResultsTreeDataProvider | null = null;
let _history: HistoryStore | null = null;

export function activate(context: vscode.ExtensionContext): void {
  _config = new Config();
  context.subscriptions.push(_config);

  _diagnostics = new DiagnosticsProvider(_config);
  context.subscriptions.push(_diagnostics);

  _panel = new ReviewPanel();
  context.subscriptions.push(_panel);

  _treeProvider = new ResultsTreeDataProvider();
  const treeView = vscode.window.createTreeView("seniorVibe.results", {
    treeDataProvider: _treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  _history = new HistoryStore();

  _bridge = new Bridge();
  _bridge.start().catch((err) => {
    console.error("Bridge failed to start:", err);
    vscode.window.showErrorMessage(
      `Senior Vibe Agent: Failed to start review engine. Check that Python is installed.\nError: ${err.message}`,
    );
  });
  context.subscriptions.push(_bridge);

  registerCommands(context, _bridge, _config, _diagnostics, _panel, _treeProvider, _history);

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (!_config?.reviewOnSave) return;
      if (!SUPPORTED_LANGUAGES.has(document.languageId)) return;

      try {
        const result = await _bridge?.reviewFile(document.uri.fsPath);
        if (result) {
          _diagnostics?.update(result);
          _treeProvider?.update(result);
          vscode.window.setStatusBarMessage(
            `Senior Vibe: Review complete (${result.overallScore}/100)`,
            4000,
          );
        }
      } catch (err) {
        console.error("On-save review failed:", err);
      }
    }),
  );

  console.log("Senior Vibe Agent extension activated");
}

export async function deactivate(): Promise<void> {
  if (_bridge) {
    _bridge.dispose();
    _bridge = null;
  }
  _panel?.dispose();
  _diagnostics?.dispose();
  _config?.dispose();
  _panel = null;
  _diagnostics = null;
  _config = null;
  _treeProvider = null;
  _history = null;

  console.log("Senior Vibe Agent extension deactivated");
}
