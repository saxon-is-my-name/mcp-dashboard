## Plan: Fix Panel Reload Loading Issue ✅ COMPLETE

**Problem:** When navigating away from the MCP Dashboard panel and then back to it, the panel displays "Loading MCP tools..." indefinitely. The root cause is that `resolveWebviewView` is only called once during initial view creation. When the webview DOM is disposed and recreated (during navigation), the React component remounts with `isLoading: true` but no new `toolsUpdate` message is sent.

**Solution:** Implement visibility change detection with tool caching.

**Status:** Complete - Phase 1 fully solves the issue. Phases 2 & 3 deemed unnecessary.

---

## Implementation Summary

### Phase 1: Add Visibility Change Detection ✅ IMPLEMENTED
- **Objective:** Implement visibility change handler to re-send tools when the panel becomes visible again
- **Status:** ✅ Complete and tested (43/43 tests passing)
- **Files Modified:**
  - [src/extension.ts](src/extension.ts) - Added `_cachedTools` field and `onDidChangeVisibility` listener
  - [test/extension.test.ts](test/extension.test.ts) - Added 6 visibility change tests
- **Implementation:**
  - Tools are cached in `_cachedTools` after successful load
  - When panel becomes visible: cached tools sent immediately, then refreshed in background
  - Provides instant feedback with stale data, then updates with fresh data
- **Result:** Original issue completely resolved
- **Decisions from open questions:**
  - Show smooth transition (cache + refresh) ✅
  - 10 second timeout not needed (skipped Phase 3)
  - Cache and send stale data first, then refresh ✅

### Phase 2: Webview Request Mechanism ❌ SKIPPED
- **Rationale:** Redundant with Phase 1. No scenario exists where webview would reload without triggering visibility change or `resolveWebviewView`.
- **Decision:** Removed for code simplicity

### Phase 3: Timeout and Error Recovery ❌ SKIPPED  
- **Rationale:** Phase 1's dual mechanism (visibility + initial load) is already resilient. If tools fail to load, it indicates a deeper issue (API unavailable) that wouldn't be fixed by timeout/retry.
- **Decision:** Keep it simple - users can close/reopen sidebar if needed. Follow YAGNI principle.

---

## Original Plan (for reference)

1. **Phase 1: Add Visibility Change Detection**
    - **Objective:** Implement visibility change handler to re-send tools when the panel becomes visible again
    - **Files/Functions to Modify/Create:**
        - [src/extension.ts](src/extension.ts) - `MCPViewProvider.resolveWebviewView` method (add visibility listener)
        - [src/extension.ts](src/extension.ts) - `MCPViewProvider._loadAndSendTools` method (ensure it can be called multiple times safely)
        - [test/extension.test.ts](test/extension.test.ts) - Add visibility change handler tests
    - **Tests to Write:**
        - Test: "should register onDidChangeVisibility listener during resolve"
        - Test: "should re-send tools when webview becomes visible after being hidden"
        - Test: "should not send tools when webview becomes invisible"
        - Test: "should handle visibility changes when view is disposed"
    - **Steps:**
        1. Write failing tests for visibility change detection and tool re-sending behavior
        2. Run tests to confirm they fail
        3. Implement `webviewView.onDidChangeVisibility` listener in `resolveWebviewView`
        4. Call `_loadAndSendTools()` when `webviewView.visible` becomes `true`
        5. Run tests to confirm they pass
        6. Run full test suite and verify no regressions

2. **Phase 2: Add Webview Request Mechanism (Fallback)**
    - **Objective:** Implement bidirectional messaging so webview can request tools from extension as a fallback mechanism
    - **Files/Functions to Modify/Create:**
        - [src/webview.tsx](src/webview.tsx) - `App` component (send `requestTools` message on mount)
        - [src/extension.ts](src/extension.ts) - `MCPViewProvider.resolveWebviewView` message handler (handle `requestTools` message)
        - [test/extension.test.ts](test/extension.test.ts) - Add request mechanism tests
        - [test/panel.ui.test.tsx](test/panel.ui.test.tsx) - Add UI tests for request behavior
    - **Tests to Write:**
        - Test: "should send requestTools message when webview mounts"
        - Test: "should handle requestTools message and respond with tools"
        - Test: "should not crash if requestTools arrives before tools are loaded"
        - Test: "should handle multiple requestTools messages gracefully"
    - **Steps:**
        1. Write failing tests for webview sending `requestTools` and extension responding
        2. Run tests to confirm they fail
        3. Add `requestTools` message sending in React `useEffect` hook on mount
        4. Add `requestTools` case in extension message handler to call `_loadAndSendTools()`
        5. Run tests to confirm they pass
        6. Test manual navigation away and back to verify both mechanisms work
        7. Run full test suite and verify no regressions

3. **Phase 3: Add Timeout and Error Recovery**
    - **Objective:** Add timeout to loading state and proper error handling to prevent infinite loading
    - **Files/Functions to Modify/Create:**
        - [src/webview.tsx](src/webview.tsx) - `App` component (add timeout logic and error state)
        - [src/extension.ts](src/extension.ts) - `MCPViewProvider._loadAndSendTools` (send error messages on failure)
        - [test/panel.ui.test.tsx](test/panel.ui.test.tsx) - Add timeout and error state tests
        - [test/extension.test.ts](test/extension.test.ts) - Add error handling tests
    - **Tests to Write:**
        - Test: "should display error message after 10 second timeout"
        - Test: "should provide retry button after timeout"
        - Test: "should send error message to webview when tool loading fails"
        - Test: "should display error message received from extension"
        - Test: "should clear error state when new tools load successfully"
    - **Steps:**
        1. Write failing tests for timeout behavior and error display
        2. Run tests to confirm they fail
        3. Add timeout logic in React using `setTimeout` (10 second timeout)
        4. Add error state to React component
        5. Modify `_loadAndSendTools()` to send error messages on failure
        6. Add retry button that sends new `requestTools` message
        7. Run tests to confirm they pass
        8. Test all error scenarios manually (network issues, slow loading, etc.)
        9. Run full test suite and verify no regressions

---

## Final Outcome

**Files Changed:**
- [src/extension.ts](src/extension.ts) - Added caching and visibility detection
- [test/extension.test.ts](test/extension.test.ts) - Added 6 new tests

**Additional Improvements Made:**
- Added type-safe message handling with discriminated unions ([src/types/webviewMessages.ts](src/types/webviewMessages.ts))
- Extracted HTML templates to separate files ([src/templates/](src/templates/))
- Removed dead code (`_simulateCommandExecution`)
- Extension reduced from ~520 lines to ~380 lines

**Test Results:**
- 43/43 tests passing
- All original functionality preserved
- Original issue resolved

**Commit:** See [fix-panel-reload-phase-1-complete.md](fix-panel-reload-phase-1-complete.md) for commit message.
