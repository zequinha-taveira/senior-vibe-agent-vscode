import * as vscode from "vscode";

const STATUS_COLORS: Record<string, string> = {
  A: "#4ecdc4",
  B: "#4ecdc4",
  C: "#ffe66d",
  D: "#ffa07a",
  F: "#ff6b6b",
};

export class StatusBarIndicator {
  private _item: vscode.StatusBarItem;

  constructor() {
    this._item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this._item.command = "seniorVibe.showPanel";
    this._item.tooltip = "Senior Vibe Agent — Click to show results";
    this._item.text = "$(checklist) Senior Vibe";
    this._item.show();
  }

  setIdle(): void {
    this._item.text = "$(checklist) Senior Vibe";
    this._item.backgroundColor = undefined;
    this._item.tooltip = "Senior Vibe Agent — Click to review";
  }

  setReviewing(): void {
    this._item.text = "$(sync~spin) Senior Vibe: reviewing...";
    this._item.backgroundColor = undefined;
    this._item.tooltip = "Review in progress...";
  }

  setResult(score: number, grade: string, findings: number): void {
    const color = STATUS_COLORS[grade] ?? "#a0a0a0";
    const scoreLabel = score >= 90 ? "🟢" : score >= 75 ? "🟢" : score >= 60 ? "🟡" : score >= 40 ? "🟠" : "🔴";
    this._item.text = `$(checklist) Senior Vibe: ${scoreLabel} ${score}/100 (${grade}) — ${findings} issues`;
    this._item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    this._item.tooltip = `Score: ${score}/100 (Grade ${grade}) | ${findings} findings | Click to show results`;
  }

  setError(message: string): void {
    this._item.text = `$(error) Senior Vibe: error`;
    this._item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    this._item.tooltip = `Error: ${message} | Click for details`;
  }

  dispose(): void {
    this._item.dispose();
  }
}
