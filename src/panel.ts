import * as vscode from "vscode";
import { ReviewResult } from "./bridge";

export class ReviewPanel {
  private _panel: vscode.WebviewPanel | null = null;
  private _currentResult: ReviewResult | null = null;

  show(result?: ReviewResult): void {
    if (result) {
      this._currentResult = result;
    }

    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Beside);
    } else {
      this._panel = vscode.window.createWebviewPanel(
        "seniorVibe.results",
        "Senior Vibe Agent — Review Results",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [],
        },
      );

      this._panel.onDidDispose(() => {
        this._panel = null;
      });

      this._panel.webview.onDidReceiveMessage((message) => {
        switch (message.type) {
          case "navigate":
            this._navigateToFile(message.filePath, message.line);
            break;
          case "showFix":
            this._showFixSuggestion(message.finding);
            break;
        }
      });
    }

    this._render();
  }

  private _render(): void {
    if (!this._panel) return;

    if (!this._currentResult) {
      this._panel.webview.html = this._emptyHtml();
      return;
    }

    this._panel.webview.html = this._buildHtml(this._currentResult);
  }

  private _emptyHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: var(--vscode-font-family); padding: 2em; text-align: center; color: var(--vscode-descriptionForeground); }
  h1 { font-size: 1.5em; margin-bottom: 0.5em; }
  p { font-size: 1.1em; }
</style>
</head>
<body>
  <h1>Senior Vibe Agent</h1>
  <p>No review results yet.<br>Run a review to see results here.</p>
</body>
</html>`;
  }

  private _buildHtml(result: ReviewResult): string {
    const scoreColor = result.overallScore >= 90 ? "var(--vscode-testing-iconPassed)" : result.overallScore >= 75 ? "var(--vscode-testing-iconUnset)" : result.overallScore >= 60 ? "var(--vscode-notificationsWarningIcon-foreground)" : "var(--vscode-notificationsErrorIcon-foreground)";

    const categories = Object.entries(result.categories);

    const categoryRows = categories.map(([key, cat]) => {
      const catColor = cat.score >= 90 ? "#4ecdc4" : cat.score >= 75 ? "#ffe66d" : cat.score >= 60 ? "#ffa07a" : "#ff6b6b";
      return `<tr>
        <td style="text-transform:capitalize;padding:4px 8px">${key.replace("_", " ")}</td>
        <td style="padding:4px 8px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:10px;background:var(--vscode-editorWidget-border);border-radius:5px;overflow:hidden">
              <div style="width:${cat.score}%;height:100%;background:${catColor};border-radius:5px;transition:width 0.5s"></div>
            </div>
            <span style="min-width:3em;text-align:right">${cat.score}/100</span>
          </div>
        </td>
        <td style="padding:4px 8px;text-align:right">${cat.findings.length}</td>
      </tr>`;
    }).join("\n");

    const severityLabels: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info" };
    const severityColors: Record<string, string> = { critical: "#ff6b6b", high: "#ffa07a", medium: "#ffe66d", low: "#4ecdc4", info: "#a0a0a0" };
    const severityOrder = ["critical", "high", "medium", "low", "info"];

    const grouped: Record<string, { cat: string; finding: import("./bridge").Finding }[]> = {};
    for (const severity of severityOrder) {
      grouped[severity] = [];
    }
    for (const [catKey, catResult] of categories) {
      for (const f of catResult.findings) {
        const sev = f.severity;
        if (!grouped[sev]) grouped[sev] = [];
        grouped[sev].push({ cat: catKey, finding: f });
      }
    }

    const findingSections = severityOrder
      .filter((sev) => grouped[sev].length > 0)
      .map((sev) => {
        const items = grouped[sev].map((item, idx) => {
          const finding = item.finding;
          const escapedTitle = this._escapeHtml(finding.title);
          const escapedPath = this._escapeHtml(finding.filePath);
          const escapedDesc = this._escapeHtml(finding.description);
          const escapedSuggestion = finding.suggestion ? this._escapeHtml(finding.suggestion) : "";
          const escapedFixExample = finding.fixExample ? this._escapeHtml(finding.fixExample) : "";
          return `<details style="margin:8px 0;padding:8px;background:var(--vscode-editor-inactiveSelectionBackground);border-radius:4px">
            <summary style="cursor:pointer;font-weight:500">
              <span style="color:${severityColors[sev]}">&#9679;</span>
              ${escapedTitle}
              <span style="color:var(--vscode-descriptionForeground);font-size:0.85em">
                — ${escapedPath}${finding.lineNumber ? `:${finding.lineNumber}` : ""}
              </span>
            </summary>
            <div style="margin-top:8px;padding-left:16px">
              <p>${escapedDesc}</p>
              ${finding.codeSnippet ? `<pre style="background:var(--vscode-textCodeBlock-background);padding:8px;border-radius:4px;overflow-x:auto;font-size:0.9em"><code>${this._escapeHtml(finding.codeSnippet)}</code></pre>` : ""}
              ${escapedSuggestion ? `<p><strong>Suggestion:</strong> ${escapedSuggestion}</p>` : ""}
              <div style="display:flex;gap:8px;margin-top:8px">
                <button data-action="navigate" data-path="${escapedPath}" data-line="${finding.lineNumber ?? 1}" style="cursor:pointer;padding:4px 12px;border:1px solid var(--vscode-button-border);background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border-radius:3px">Navigate to File</button>
                <button data-action="showFix" data-finding='${this._escapeHtml(JSON.stringify(finding))}' style="cursor:pointer;padding:4px 12px;border:1px solid var(--vscode-button-border);background:var(--vscode-button-background);color:var(--vscode-button-foreground);border-radius:3px">Show Fix</button>
              </div>
            </div>
          </details>`;
        }).join("\n");

        return `<div style="margin-bottom:16px">
          <h3 style="color:${severityColors[sev]};margin-bottom:8px">${severityLabels[sev]} (${items.length})</h3>
          ${items}
        </div>`;
      }).join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-editor-foreground); }
  h2 { margin: 0 0 4px 0; }
  .score-ring { width: 120px; height: 120px; margin: 0 auto 16px; position: relative; }
  .score-ring svg { transform: rotate(-90deg); }
  .score-ring .bg { fill: none; stroke: var(--vscode-editorWidget-border); stroke-width: 8; }
  .score-ring .fg { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 0.8s; }
  .score-ring .center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  .score-ring .center .score { font-size: 28px; font-weight: bold; }
  .score-ring .center .grade { font-size: 14px; opacity: 0.7; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-editorWidget-border); font-weight: 600; }
  td { padding: 8px; border-bottom: 1px solid var(--vscode-editorWidget-border); }
  .summary-cards { display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap; }
  .summary-card { flex: 1; min-width: 100px; padding: 12px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 6px; text-align: center; }
  .summary-card .value { font-size: 24px; font-weight: bold; }
  .summary-card .label { font-size: 12px; opacity: 0.7; margin-top: 4px; }
  details { margin: 8px 0; }
  details summary { cursor: pointer; }
  pre { white-space: pre-wrap; word-break: break-word; }
  button:hover { opacity: 0.85; }
</style>
</head>
<body>
<script>
const api = acquireVsCodeApi();
document.addEventListener("click", function (e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "navigate") {
    api.postMessage({ type: "navigate", filePath: btn.dataset.path, line: parseInt(btn.dataset.line, 10) });
  } else if (action === "showFix") {
    api.postMessage({ type: "showFix", finding: JSON.parse(btn.dataset.finding) });
  }
});
<\/script>
  <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px;flex-wrap:wrap">
    <div class="score-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle class="bg" cx="60" cy="60" r="48"/>
        <circle class="fg" cx="60" cy="60" r="48" stroke="${scoreColor}" stroke-dasharray="301.6" stroke-dashoffset="${301.6 - (result.overallScore / 100) * 301.6}"/>
      </svg>
      <div class="center">
        <div class="score" style="color:${scoreColor}">${result.overallScore}</div>
        <div class="grade">Grade ${result.grade}</div>
      </div>
    </div>
    <div>
      <h2>Review Results</h2>
      <p style="color:var(--vscode-descriptionForeground);margin:0">
        ${result.totalFindings} total findings
      </p>
    </div>
  </div>

  <div class="summary-cards">
    <div class="summary-card">
      <div class="value" style="color:${scoreColor}">${result.overallScore}</div>
      <div class="label">Overall Score</div>
    </div>
    <div class="summary-card">
      <div class="value">${result.totalFindings}</div>
      <div class="label">Total Findings</div>
    </div>
    <div class="summary-card">
      <div class="value">${Object.keys(result.categories).length}</div>
      <div class="label">Categories</div>
    </div>
  </div>

  <h3>Category Breakdown</h3>
  <table>
    <tr><th>Category</th><th>Score</th><th style="text-align:right">Findings</th></tr>
    ${categoryRows}
  </table>

  <h3>Findings by Severity</h3>
  ${findingSections}
</body>
</html>`;
  }

  private _escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  private _navigateToFile(filePath: string, line: number): void {
    const uri = vscode.Uri.file(filePath);
    vscode.window.showTextDocument(uri, {
      selection: new vscode.Range(line - 1, 0, line - 1, 0),
    });
  }

  private _showFixSuggestion(findingJson: string): void {
    try {
      const finding = JSON.parse(findingJson);
      const suggestion = finding.suggestion || finding.fixExample || "No fix suggestion available.";
      vscode.window.showInformationMessage(suggestion, { modal: true, detail: `Fix for: ${finding.title}` });
    } catch {
      vscode.window.showInformationMessage("Could not parse finding data.");
    }
  }

  dispose(): void {
    this._panel?.dispose();
    this._panel = null;
  }
}
