import * as vscode from "vscode";
import { Bridge } from "./bridge";
import { Config } from "./config";
import { DiagnosticsProvider } from "./diagnostics";
import { ReviewPanel } from "./panel";
import { ResultsTreeDataProvider } from "./treeView";
import { HistoryStore } from "./history";
import { StatusBarIndicator } from "./statusBar";

export function registerCommands(
  context: vscode.ExtensionContext,
  bridge: Bridge,
  config: Config,
  diagnostics: DiagnosticsProvider,
  panel: ReviewPanel,
  treeProvider: ResultsTreeDataProvider,
  history: HistoryStore,
  statusBar: StatusBarIndicator,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("seniorVibe.reviewWorkspace", async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage("Open a workspace folder first to run a review.");
        return;
      }

      const rootPath = workspaceFolders[0].uri.fsPath;

      statusBar.setReviewing();

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Senior Vibe Agent",
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({ message: "Reviewing workspace..." });

          try {
            const result = await bridge.reviewWorkspace(rootPath, config.enableAiFixes, config.llmProvider);

            if (token.isCancellationRequested) return;

            diagnostics.update(result);
            treeProvider.update(result);
            statusBar.setResult(result.overallScore, result.grade, result.totalFindings);

            history.addEntry({
              timestamp: Date.now(),
              workspaceName: workspaceFolders[0].name,
              score: result.overallScore,
              grade: result.grade,
              totalFindings: result.totalFindings,
            });

            if (config.showPanelOnReview) {
              panel.show(result);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            statusBar.setError(msg);
            vscode.window.showErrorMessage(`Senior Vibe: Review failed — ${msg}`);
          }
        },
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("seniorVibe.reviewFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("Open a file first to run a review.");
        return;
      }

      const filePath = editor.document.uri.fsPath;

      statusBar.setReviewing();

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Senior Vibe Agent",
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({ message: "Reviewing file..." });

          try {
            const result = await bridge.reviewFile(filePath, config.enableAiFixes, config.llmProvider);

            if (token.isCancellationRequested) return;

            diagnostics.update(result);
            treeProvider.update(result);
            statusBar.setResult(result.overallScore, result.grade, result.totalFindings);

            history.addEntry({
              timestamp: Date.now(),
              workspaceName: vscode.workspace.workspaceFolders?.[0]?.name ?? "unknown",
              score: result.overallScore,
              grade: result.grade,
              totalFindings: result.totalFindings,
            });

            if (config.showPanelOnReview) {
              panel.show(result);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            statusBar.setError(msg);
            vscode.window.showErrorMessage(`Senior Vibe: Review failed — ${msg}`);
          }
        },
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("seniorVibe.reviewOnSave", async () => {
      const newValue = !config.reviewOnSave;
      await config.setReviewOnSave(newValue);
      vscode.window.showInformationMessage(
        `Senior Vibe: Review on Save ${newValue ? "enabled" : "disabled"}`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("seniorVibe.showPanel", () => {
      panel.show();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("seniorVibe.clearDiagnostics", () => {
      diagnostics.clear();
      treeProvider.clear();
      statusBar.setIdle();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("seniorVibe.viewHistory", async () => {
      const entries = history.getAll();
      if (entries.length === 0) {
        vscode.window.showInformationMessage("No review history yet.");
        return;
      }

      const items = entries.map((e) => ({
        label: `${e.grade} — ${e.score}/100`,
        description: `${e.totalFindings} findings`,
        detail: `${e.workspaceName} — ${new Date(e.timestamp).toLocaleString()}`,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a past review to view details",
      });

      if (selected) {
        vscode.window.showInformationMessage(
          `Review: ${selected.label} | ${selected.detail}`,
        );
      }
    }),
  );
}
