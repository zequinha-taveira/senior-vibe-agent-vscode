import * as cp from "child_process";
import * as path from "path";
import * as vscode from "vscode";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface Finding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  filePath: string;
  lineNumber: number | null;
  codeSnippet: string | null;
  suggestion: string | null;
  fixExample: string | null;
  category: string;
}

export interface CategoryResult {
  score: number;
  findings: Finding[];
  filesAnalyzed: number;
}

export interface ReviewResult {
  overallScore: number;
  grade: string;
  totalFindings: number;
  categories: Record<string, CategoryResult>;
}

export interface HealthStatus {
  status: string;
  version: string;
  engineReady: boolean;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

export class BridgeError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

export class Bridge {
  private _process: cp.ChildProcess | null = null;
  private _requestId = 0;
  private _pending = new Map<number, PendingRequest>();
  private _buffer = "";
  private _retryCount = 0;
  private _maxRetries = 3;
  private _disposed = false;

  constructor() {}

  private _getBridgePath(): string {
    const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    return path.join(repoRoot, "engine", "bridge.py");
  }

  private _findPython(): string {
    const configured = vscode.workspace.getConfiguration("seniorVibe").get<string>("pythonPath");
    if (configured && configured !== "python3") return configured;
    const candidates = ["python3", "python", "py -3"];
    for (const cmd of candidates) {
      try {
        cp.execSync(`${cmd} --version`, { stdio: "ignore", timeout: 2000 });
        return cmd;
      } catch {
        continue;
      }
    }
    return "python3";
  }

  async start(): Promise<void> {
    if (this._process) return;

    const python = this._findPython();
    const bridgePath = this._getBridgePath();

    return new Promise<void>((resolve, reject) => {
      const proc = cp.spawn(python, [bridgePath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      });

      proc.on("error", (err) => {
        console.error("Bridge spawn error:", err);
        this._process = null;
        reject(err);
      });

      proc.on("exit", (code) => {
        console.log(`Bridge exited with code ${code}`);
        this._process = null;
        if (!this._disposed) {
          this._handleCrash();
        }
      });

      proc.stdout?.on("data", (data: Buffer) => {
        this._buffer += data.toString("utf-8");
        this._processBuffer();
      });

      proc.stderr?.on("data", (data: Buffer) => {
        console.error(`Bridge stderr: ${data.toString("utf-8").trim()}`);
      });

      this._process = proc;
      resolve();
    });
  }

  private _processBuffer(): void {
    const lines = this._buffer.split("\n");
    this._buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const response: JsonRpcResponse = JSON.parse(trimmed);

        if (response.id != null && this._pending.has(response.id)) {
          const pending = this._pending.get(response.id)!;
          clearTimeout(pending.timer);
          this._pending.delete(response.id);

          if (response.error) {
            pending.reject(new BridgeError(response.error.message, response.error.code));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch {
        console.warn("Bridge: failed to parse response:", trimmed);
      }
    }
  }

  private _handleCrash(): void {
    if (this._disposed) return;
    if (this._retryCount >= this._maxRetries) {
      this._rejectAll(new BridgeError("Bridge process crashed and max retries exceeded"));
      return;
    }

    this._retryCount++;
    const delay = Math.pow(2, this._retryCount - 1) * 1000;
    console.log(`Bridge: restarting in ${delay}ms (attempt ${this._retryCount}/${this._maxRetries})`);
    setTimeout(() => this.start(), delay);
  }

  private _rejectAll(error: Error): void {
    for (const [id, pending] of this._pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this._pending.clear();
  }

  private _call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this._process || !this._process.stdin) {
        reject(new BridgeError("Bridge not started"));
        return;
      }

      const id = ++this._requestId;
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(new BridgeError(`Request timed out: ${method} (60s)`));
      }, 60_000);

      this._pending.set(id, { resolve, reject, timer });

      const data = JSON.stringify(request) + "\n";
      this._process.stdin.write(data, "utf-8");
    });
  }

  async reviewFile(filePath: string): Promise<ReviewResult> {
    return (await this._call("review.file", { path: filePath })) as ReviewResult;
  }

  async reviewWorkspace(workspacePath: string): Promise<ReviewResult> {
    return (await this._call("review.workspace", { path: workspacePath })) as ReviewResult;
  }

  async reviewDiff(files: string[], workspace: string): Promise<ReviewResult> {
    return (await this._call("review.diff", { files, workspace })) as ReviewResult;
  }

  async health(): Promise<HealthStatus> {
    return (await this._call("health")) as HealthStatus;
  }

  dispose(): void {
    this._disposed = true;
    this._rejectAll(new BridgeError("Bridge disposed"));

    if (this._process) {
      try {
        this._call("shutdown").catch(() => {});
        setTimeout(() => {
          if (this._process) {
            this._process.kill();
            this._process = null;
          }
        }, 2000);
      } catch {
        this._process.kill();
        this._process = null;
      }
    }
  }
}
