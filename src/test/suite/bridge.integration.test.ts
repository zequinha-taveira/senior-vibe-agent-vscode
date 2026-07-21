import * as assert from "assert";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";

suite("Bridge Integration Tests", function () {
  this.timeout(30_000);

  let bridgeProcess: cp.ChildProcess | null = null;
  let bridgePath: string;

  suiteSetup(() => {
    const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    bridgePath = path.join(repoRoot, "engine", "bridge.py");

    if (!fs.existsSync(bridgePath)) {
      console.log(`Bridge not found at ${bridgePath}, skipping integration tests`);
      bridgePath = "";
    }
  });

  teardown(() => {
    if (bridgeProcess) {
      bridgeProcess.kill();
      bridgeProcess = null;
    }
  });

  function sendRequest(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!bridgeProcess || !bridgeProcess.stdin) {
        reject(new Error("Bridge not running"));
        return;
      }

      const request = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      });

      bridgeProcess.stdout!.once("data", (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString().trim());
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (e) {
          reject(e);
        }
      });

      bridgeProcess.stdin.write(request + "\n");
    });
  }

  test("should respond to health request", async function () {
    if (!bridgePath) this.skip();

    bridgeProcess = cp.spawn("python3", [bridgePath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = await sendRequest("health") as { status: string; version: string; engineReady: boolean };
    assert.strictEqual(result.status, "ok");
    assert.strictEqual(result.engineReady, true);
    assert.ok(result.version);
  });

  test("should return error for unknown method", async function () {
    if (!bridgePath) this.skip();

    if (!bridgeProcess) {
      bridgeProcess = cp.spawn("python3", [bridgePath], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    try {
      await sendRequest("unknown.method");
      assert.fail("Should have thrown");
    } catch (err: unknown) {
      const error = err as Error;
      assert.ok(error.message.includes("Method not found"));
    }
  });

  test("should review a single file", async function () {
    if (!bridgePath) this.skip();

    const fixturePath = path.resolve(__dirname, "..", "..", "..", "..", "tests", "fixtures", "bad_python_code.py");
    if (!fs.existsSync(fixturePath)) this.skip();

    if (!bridgeProcess) {
      bridgeProcess = cp.spawn("python3", [bridgePath], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const result = await sendRequest("review.file", { path: fixturePath }) as { overallScore: number; grade: string; totalFindings: number; categories: Record<string, unknown> };

    assert.ok(typeof result.overallScore === "number");
    assert.ok(typeof result.grade === "string");
    assert.ok(typeof result.totalFindings === "number");
    assert.ok(result.categories);
  });

  test("should shutdown gracefully", async function () {
    if (!bridgePath) this.skip();

    if (!bridgeProcess) {
      bridgeProcess = cp.spawn("python3", [bridgePath], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const result = await sendRequest("shutdown") as { status: string };
    assert.strictEqual(result.status, "ok");

    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.strictEqual(bridgeProcess.exitCode, 0);
    bridgeProcess = null;
  });
});
