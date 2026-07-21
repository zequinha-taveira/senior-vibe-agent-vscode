import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

suite("HistoryStore Tests", () => {
  const testDir = path.join(os.tmpdir(), `senior-vibe-test-${Date.now()}`);
  let HistoryStoreModule: typeof import("../../history");

  suiteSetup(async () => {
    fs.mkdirSync(testDir, { recursive: true });

    const originalHomedir = os.homedir;
    os.homedir = () => testDir;
    HistoryStoreModule = await import("../../history");
    os.homedir = originalHomedir;
  });

  suiteTeardown(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("should add and retrieve entries", () => {
    const store = new HistoryStoreModule.HistoryStore();
    store.addEntry({
      timestamp: 1000,
      workspaceName: "test-project",
      score: 85,
      grade: "B",
      totalFindings: 5,
    });

    const entries = store.getAll();
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].workspaceName, "test-project");
    assert.strictEqual(entries[0].score, 85);
  });

  test("should return recent entries", () => {
    const store = new HistoryStoreModule.HistoryStore();
    for (let i = 0; i < 10; i++) {
      store.addEntry({
        timestamp: 1000 + i,
        workspaceName: `project-${i}`,
        score: 80 + i,
        grade: "A",
        totalFindings: i,
      });
    }

    const recent = store.getRecent(3);
    assert.strictEqual(recent.length, 3);
  });

  test("should clear all entries", () => {
    const store = new HistoryStoreModule.HistoryStore();
    store.addEntry({
      timestamp: 1000,
      workspaceName: "test",
      score: 90,
      grade: "A",
      totalFindings: 0,
    });

    store.clear();
    assert.strictEqual(store.getAll().length, 0);
  });

  test("should evict oldest entries when over limit", () => {
    const store = new HistoryStoreModule.HistoryStore();
    const maxEntries = 100;

    for (let i = 0; i < maxEntries + 10; i++) {
      store.addEntry({
        timestamp: 1000 + i,
        workspaceName: `project-${i}`,
        score: 80,
        grade: "B",
        totalFindings: i,
      });
    }

    assert.strictEqual(store.getAll().length, maxEntries);
  });
});
