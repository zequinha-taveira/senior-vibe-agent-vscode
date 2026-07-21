import * as vscode from "vscode";
import { ReviewResult, Finding } from "./bridge";

export class ResultItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly finding?: Finding,
    public readonly score?: number,
  ) {
    super(label, collapsibleState);

    if (finding) {
      this.description = `${finding.filePath}${finding.lineNumber ? `:${finding.lineNumber}` : ""}`;
      this.tooltip = `${finding.title}\n\n${finding.description}`;
      this.command = {
        command: "vscode.open",
        title: "Navigate to File",
        arguments: [
          vscode.Uri.file(finding.filePath),
          { selection: new vscode.Range((finding.lineNumber ?? 1) - 1, 0, (finding.lineNumber ?? 1) - 1, 0) },
        ],
      };
      this.contextValue = "finding";

      this.iconPath = undefined;
    } else {
      this.description = score != null ? `${score}/100` : "";
      this.tooltip = `${label} — ${score ?? "N/A"}/100`;
      this.contextValue = "category";
    }
  }
}

export class ResultsTreeDataProvider implements vscode.TreeDataProvider<ResultItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ResultItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<ResultItem | undefined> = this._onDidChangeTreeData.event;

  private _result: ReviewResult | null = null;

  update(result: ReviewResult): void {
    this._result = result;
    this._onDidChangeTreeData.fire(undefined);
  }

  clear(): void {
    this._result = null;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ResultItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ResultItem): Thenable<ResultItem[]> {
    if (!this._result) {
      return Promise.resolve([new ResultItem("No review results", vscode.TreeItemCollapsibleState.None)]);
    }

    if (!element) {
      return Promise.resolve(this._getCategoryItems());
    }

    if (element.finding) {
      return Promise.resolve([]);
    }

    return Promise.resolve(this._getFindingItems(element.label));
  }

  private _getCategoryItems(): ResultItem[] {
    if (!this._result) return [];

    return Object.entries(this._result.categories).map(([key, cat]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const collapsible = cat.findings.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;
      return new ResultItem(label, collapsible, undefined, cat.score);
    });
  }

  private _getFindingItems(categoryLabel: string): ResultItem[] {
    if (!this._result) return [];

    const categoryKey = categoryLabel.toLowerCase().replace(/\s+/g, "_");
    const catResult = this._result.categories[categoryKey];
    if (!catResult) return [];

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const sorted = [...catResult.findings].sort(
      (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4),
    );

    return sorted.map(
      (f) => new ResultItem(f.title, vscode.TreeItemCollapsibleState.None, f),
    );
  }
}
