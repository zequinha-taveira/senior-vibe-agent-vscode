import * as vscode from "vscode";
import { ReviewResult, Finding } from "./bridge";
import { Config, MinSeverity } from "./config";

const SEVERITY_MAP: Record<string, vscode.DiagnosticSeverity> = {
  critical: vscode.DiagnosticSeverity.Error,
  high: vscode.DiagnosticSeverity.Error,
  medium: vscode.DiagnosticSeverity.Warning,
  low: vscode.DiagnosticSeverity.Information,
  info: vscode.DiagnosticSeverity.Information,
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function severityLevel(severity: MinSeverity): number {
  return SEVERITY_ORDER[severity] ?? 4;
}

export class DiagnosticsProvider {
  private _collection: vscode.DiagnosticCollection;
  private _config: Config;

  constructor(config: Config) {
    this._config = config;
    this._collection = vscode.languages.createDiagnosticCollection("seniorVibe");
  }

  update(result: ReviewResult): void {
    this._collection.clear();

    const minLevel = severityLevel(this._config.minSeverity);
    const filesMap = new Map<string, vscode.Diagnostic[]>();

    for (const [catKey, catResult] of Object.entries(result.categories)) {
      for (const finding of catResult.findings) {
        const findingLevel = SEVERITY_ORDER[finding.severity] ?? 4;
        if (findingLevel > minLevel) continue;

        const diagnostic = this._findingToDiagnostic(finding);
        if (!diagnostic) continue;

        const filePath = finding.filePath;
        if (!filesMap.has(filePath)) {
          filesMap.set(filePath, []);
        }
        filesMap.get(filePath)!.push(diagnostic);
      }
    }

    for (const [filePath, diagnostics] of filesMap) {
      const uri = vscode.Uri.file(filePath);
      this._collection.set(uri, diagnostics);
    }
  }

  private _findingToDiagnostic(finding: Finding): vscode.Diagnostic | null {
    if (finding.lineNumber == null) return null;

    const severity = SEVERITY_MAP[finding.severity] ?? vscode.DiagnosticSeverity.Hint;
    const range = new vscode.Range(
      finding.lineNumber - 1,
      0,
      finding.lineNumber - 1,
      1000,
    );

    const diagnostic = new vscode.Diagnostic(
      range,
      `[${finding.severity.toUpperCase()}] ${finding.title}`,
      severity,
    );

    diagnostic.source = "Senior Vibe Agent";
    diagnostic.code = finding.category;
    diagnostic.tags = this._severityTags(finding.severity);

    return diagnostic;
  }

  private _severityTags(severity: string): vscode.DiagnosticTag[] {
    if (severity === "critical" || severity === "high") {
      return [vscode.DiagnosticTag.Unnecessary];
    }
    return [];
  }

  clear(): void {
    this._collection.clear();
  }

  dispose(): void {
    this._collection.dispose();
  }
}
