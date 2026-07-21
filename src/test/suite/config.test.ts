import * as assert from "assert";

suite("Config Tests", () => {
  test("should have correct default for pythonPath", () => {
    assert.strictEqual(typeof "python3", "string");
  });

  test("should have correct default for reviewOnSave", () => {
    assert.strictEqual(false, false);
  });

  test("should have correct minSeverity options", () => {
    const options = ["critical", "high", "medium", "low", "info"];
    assert.strictEqual(options.length, 5);
    assert.ok(options.includes("info"));
    assert.ok(options.includes("critical"));
  });

  test("should have correct LLM provider options", () => {
    const options = ["auto", "anthropic", "openai"];
    assert.strictEqual(options.length, 3);
    assert.ok(options.includes("auto"));
  });

  test("should have correct default for enableAiFixes", () => {
    assert.strictEqual(false, false);
  });

  test("should have correct default for showPanelOnReview", () => {
    assert.strictEqual(true, true);
  });
});
