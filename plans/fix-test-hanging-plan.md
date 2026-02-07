# Plan: Fix `npm test` Hanging

## Diagnosis

Running `npm test` hangs indefinitely. After investigation, there are **multiple compounding issues** in the test infrastructure. The root cause is not dbus errors (those are harmless Electron/container noise) — it's broken test runner wiring.

### Root Cause: `test/suite/runner.js` is fundamentally broken

The `@vscode/test-electron` framework requires the test runner module to **export a `run` function that returns a Promise**. The current `runner.js` does neither:

```javascript
// CURRENT (broken) — calls run() immediately, exports nothing, no Promise
function run() {
  const mocha = new Mocha({ ui: 'bdd', color: true });
  const testFiles = glob.sync(path.resolve(__dirname, '../**/*.test.{js,ts}'));
  for (const file of testFiles) { mocha.addFile(file); }
  mocha.run(failures => {
    process.exitCode = failures ? 1 : 0;  // sets exit code but never resolves
  });
}
run();  // executes on require — wrong!
```

**What happens:**
1. `npm test` compiles TypeScript, then runs `xvfb-run ... node ./test/suite/index.js`
2. `index.js` calls `@vscode/test-electron`'s `runTests()`, which downloads VS Code 1.109.0 and launches it
3. VS Code loads the extension and then `require()`s the test runner module (`runner.js`)
4. `runner.js` immediately calls `run()` on load (instead of exporting it)
5. Mocha's `run()` callback sets `process.exitCode` but **never signals completion** to VS Code
6. VS Code waits forever for a Promise that never comes → **extension host becomes unresponsive** → **hangs**

### Additional Issues Found

| # | Issue | Impact |
|---|-------|--------|
| 1 | **`runner.js` doesn't export `run()`** | VS Code test host can't invoke tests — primary hang cause |
| 2 | **`runner.js` doesn't return a Promise** | Even if exported, VS Code can't know when tests finish |
| 3 | **Glob matches both `.ts` and `.js` files** | `**/*.test.{js,ts}` picks up TypeScript source AND compiled JS, causing duplicates and load failures (no ts-loader in VS Code host) |
| 4 | **Stale `.js` files in `test/` directory** | `test/extension.test.js` and `test/panel.test.js` are compiled output sitting alongside source `.ts` files. `tsconfig.json` has `"outDir": "out"` so these shouldn't be here. They confuse the glob. |
| 5 | **`panel.test.ts` requires `../src/panel.js`** | This test uses `require()` on a relative path to source JS — fragile, won't work from compiled output |
| 6 | **No `publisher` in `package.json`** | `extension.test.ts` calls `vscode.extensions.getExtension('vscode-mcp-extension')` but VS Code extension IDs are `publisher.name`. Without a publisher, the extension won't be found. |
| 7 | **`mocha.opts` has wrong format** | Contains `module.exports = {...}` (JavaScript) but `mocha.opts` expects `--key value` format. Modern Mocha v10 uses `.mocharc.js` or `.mocharc.yml` instead. |
| 8 | **Redundant `runTest.js` files** | Both `test/runTest.js` and `src/test/runTest.js` exist — neither is used by `npm test`. Dead code causing confusion. |
| 9 | **Mixed test frameworks with no clear boundaries** | Jest (UI tests), Mocha (unit/integration), `@vscode/test-electron` (VS Code integration), `ts-node`, `@babel/register` all configured but overlapping. |

---

## Fix Plan

### Phase 1: Fix the test runner (fixes the hang)

**Objective:** Make `runner.js` conform to the `@vscode/test-electron` contract so tests actually execute and report results.

**Files to modify:**
- `test/suite/runner.js` — rewrite to export `run()` returning a Promise

**Correct pattern:**
```javascript
const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

function run() {
  return new Promise((resolve, reject) => {
    const mocha = new Mocha({ ui: 'bdd', color: true });
    const testsRoot = path.resolve(__dirname, '..');

    // Only match .js files — TypeScript is already compiled to out/
    const testFiles = glob.sync('**/*.test.js', { cwd: testsRoot });

    for (const file of testFiles) {
      mocha.addFile(path.resolve(testsRoot, file));
    }

    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}

module.exports = { run };
```

**Verification:** `npm test` should no longer hang. It will either pass or fail with a clear error.

### Phase 2: Fix test file organization

**Objective:** Clean up stale files and ensure the glob finds the right test files.

**Steps:**
1. Delete stale compiled `.js` and `.js.map` files from `test/`:
   - `test/extension.test.js` (compiled output — belongs in `out/`)
   - `test/panel.test.js` (compiled output — belongs in `out/`)
   - `test/panel.test.js` (if it has a `.map`)
2. Ensure `tsconfig.json` compiles test files to `out/test/` (it already does via `"outDir": "out"`)
3. Update `test/suite/index.js` to point `extensionTestsPath` to the compiled runner if needed, OR keep it pointing to the source `.js` file (which is fine since `runner.js` is plain JS, not TypeScript)

**Verification:** `find test/ -name '*.test.js'` should return nothing. `find out/test/ -name '*.test.js'` should show compiled tests.

### Phase 3: Fix the integration tests themselves

**Objective:** Make the tests pass once they can actually run.

**Steps:**
1. Add a `publisher` field to `package.json` (e.g., `"publisher": "mcp-dashboard"`)
2. Update `extension.test.ts` to use the correct extension ID: `mcp-dashboard.vscode-mcp-extension`
3. Fix `panel.test.ts` to use proper module resolution (import from compiled output or restructure)
4. Exclude `panel.ui.test.tsx` from the Mocha/VS Code test runner (it uses Jest + jsdom, not VS Code)

**Verification:** `npm test` passes with green test results.

### Phase 4: Clean up test configuration

**Objective:** Remove dead code and conflicting configs to prevent future confusion.

**Steps:**
1. Delete `test/runTest.js` (unused, duplicates `test/suite/index.js`)
2. Delete `src/test/runTest.js` (unused duplicate)
3. Replace `mocha.opts` with `.mocharc.js` using proper Mocha v10 config format
4. Ensure `npm run unit-test` works for non-VS-Code unit tests
5. Ensure `npx jest` works for React UI tests (`panel.ui.test.tsx`)
6. Document the test strategy clearly in the README:
   - `npm test` → VS Code integration tests (requires display/xvfb)
   - `npm run unit-test` → Pure logic unit tests (no VS Code needed)
   - `npx jest` → React component UI tests (jsdom, no VS Code needed)

**Verification:** All three test commands work independently.

---

## Recommended Implementation Order

Phases 1 and 2 should be done together as they are the minimum fix to unblock `npm test`. Phase 3 makes the tests actually pass. Phase 4 is cleanup.

## Notes

- The dbus errors in stderr (`Failed to connect to the bus: Could not parse server address`) are **harmless** — they're Electron/Chromium trying to talk to system D-Bus in a container that doesn't have one. They don't cause the hang and can be ignored.
- The "Extension host is unresponsive" message in stdout is a **symptom**, not the cause — it happens because VS Code is stuck waiting for the test runner Promise that never resolves.
- The GPU process errors (`Exiting GPU process due to errors during initialization`) are also expected in a container with xvfb and no real GPU. They don't affect test execution.
