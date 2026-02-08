## Phase 1 Complete: Add Visibility Change Detection

The panel now automatically re-sends tools when it becomes visible after being hidden. Tools are cached and sent immediately when visibility changes, then refreshed in the background to ensure data is current.

**Files created/changed:**
- src/extension.ts
- test/extension.test.ts

**Functions created/changed:**
- MCPViewProvider class - Added `_cachedTools` private field to cache tools
- MCPViewProvider.resolveWebviewView - Added `onDidChangeVisibility` listener
- MCPViewProvider._loadAndSendTools - Modified to cache tools after loading

**Tests created/changed:**
- Test: "should register onDidChangeVisibility listener during resolve"
- Test: "should re-send tools when webview becomes visible after being hidden"
- Test: "should not send tools when webview becomes invisible"
- Test: "should handle visibility changes when view is disposed"
- Test: "should send cached tools immediately when becoming visible"
- Test: "should refresh tools after sending cached data"
- Fixed 3 existing tests to include onDidChangeVisibility mock

**Review Status:** APPROVED

**Git Commit Message:**
```
feat: Add visibility change detection to prevent loading hang

- Register onDidChangeVisibility listener in webview view
- Cache tools and send immediately when panel becomes visible
- Refresh tools in background after sending cached data
- Add 6 new tests for visibility change behavior
- Fix 3 existing tests to include visibility listener mock
```
