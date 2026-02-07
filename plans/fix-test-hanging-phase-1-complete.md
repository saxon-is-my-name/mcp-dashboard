## Phase 1 Complete: Fix test runner

Rewrote the test runner to conform to @vscode/test-electron contract, resolving the indefinite hang issue. Tests now execute and report results properly in 46ms.

**Files created/changed:**
- test/suite/runner.js

**Functions created/changed:**
- run() - now exported and returns a Promise with proper resolve/reject pattern

**Tests created/changed:**
- N/A (infrastructure fix enabling test execution)

**Review Status:** APPROVED

**Git Commit Message:**
```
fix: Rewrite test runner to prevent npm test hanging

- Export run() function returning Promise for @vscode/test-electron
- Change glob pattern from **/*.test.{js,ts} to **/*.test.js
- Replace process.exitCode with Promise resolve/reject pattern
- Remove immediate run() call that prevented proper test framework control
```
