import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface HistoryEntry {
  timestamp: number;
  workspaceName: string;
  score: number;
  grade: string;
  totalFindings: number;
}

const MAX_ENTRIES = 100;

export class HistoryStore {
  private _filePath: string;
  private _entries: HistoryEntry[] = [];

  constructor() {
    const dir = path.join(os.homedir(), ".senior-vibe-agent");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this._filePath = path.join(dir, "vscode-history.json");
    this._load();
  }

  private _load(): void {
    try {
      if (fs.existsSync(this._filePath)) {
        const data = fs.readFileSync(this._filePath, "utf-8");
        this._entries = JSON.parse(data);
      }
    } catch {
      this._entries = [];
    }
  }

  private _save(): void {
    try {
      fs.writeFileSync(this._filePath, JSON.stringify(this._entries, null, 2), "utf-8");
    } catch (err) {
      console.error("HistoryStore: failed to save", err);
    }
  }

  addEntry(entry: HistoryEntry): void {
    this._entries.unshift(entry);

    if (this._entries.length > MAX_ENTRIES) {
      this._entries = this._entries.slice(0, MAX_ENTRIES);
    }

    this._save();
  }

  getAll(): HistoryEntry[] {
    return [...this._entries];
  }

  getRecent(n: number): HistoryEntry[] {
    return this._entries.slice(0, n);
  }

  clear(): void {
    this._entries = [];
    this._save();
  }
}
