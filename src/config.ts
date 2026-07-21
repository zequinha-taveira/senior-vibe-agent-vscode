import * as vscode from "vscode";

export type MinSeverity = "critical" | "high" | "medium" | "low" | "info";
export type LlmProvider = "auto" | "anthropic" | "openai";

const SECTION = "seniorVibe";

export class Config {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange: vscode.Event<void> = this._onDidChange.event;

  private _disposable: vscode.Disposable;

  constructor() {
    this._disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(SECTION)) {
        this._onDidChange.fire();
      }
    });
  }

  get pythonPath(): string {
    return vscode.workspace.getConfiguration(SECTION).get<string>("pythonPath", "python3");
  }

  get reviewOnSave(): boolean {
    return vscode.workspace.getConfiguration(SECTION).get<boolean>("reviewOnSave", false);
  }

  get minSeverity(): MinSeverity {
    return vscode.workspace.getConfiguration(SECTION).get<MinSeverity>("minSeverity", "info");
  }

  get showPanelOnReview(): boolean {
    return vscode.workspace.getConfiguration(SECTION).get<boolean>("showPanelOnReview", true);
  }

  get excludePatterns(): string[] {
    return vscode.workspace.getConfiguration(SECTION).get<string[]>("excludePatterns", []);
  }

  get enableAiFixes(): boolean {
    return vscode.workspace.getConfiguration(SECTION).get<boolean>("enableAiFixes", false);
  }

  get llmProvider(): LlmProvider {
    return vscode.workspace.getConfiguration(SECTION).get<LlmProvider>("llmProvider", "auto");
  }

  async setReviewOnSave(value: boolean): Promise<void> {
    await vscode.workspace.getConfiguration(SECTION).update("reviewOnSave", value, vscode.ConfigurationTarget.Global);
  }

  dispose(): void {
    this._disposable.dispose();
    this._onDidChange.dispose();
  }
}
