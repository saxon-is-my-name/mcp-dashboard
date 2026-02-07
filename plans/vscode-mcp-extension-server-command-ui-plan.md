## Plan: VS Code MCP Extension - Server/Command Model & UI

This plan continues development of the VS Code MCP extension by implementing server and command models, enhancing the sidebar UI with React, and simulating command execution. Each phase follows strict TDD principles, starting with tests, then minimal code to pass those tests. Manual test steps will be documented in a Markdown file at the project root.

**Progress:** All phases complete! ✅

**Phases 3**
1. **Phase 1: Server and Command Model** ✅ COMPLETE
    - **Objective:** Implement data structures for MCP servers and commands, provide mock data, and write unit tests.
    - **Files/Functions to Modify/Create:**
        - src/panel.tsx (add model/data logic)
        - test/panel.test.ts (unit tests for model/data)
    - **Tests to Write:**
        - Should create MCP server objects
        - Should create MCP command objects
        - Should return mock data for servers/commands
    - **Steps:**
        1. ✅ Write unit tests for server/command model and mock data
        2. ✅ Implement data structures and mock data in panel.tsx
        3. ✅ Run tests to confirm passing
    - **Status:** Complete. 3 data model tests passing. React component with full TypeScript interfaces implemented.

2. **Phase 2: Integrate React UI into Webview View** ✅ COMPLETE
    - **Objective:** Bundle the React component and integrate it into the VS Code sidebar webview view.
    - **Files/Functions to Modify/Create:**
        - webpack.config.js (create bundler config for React)
        - src/webview.tsx (webview entry point)
        - src/extension.ts (load bundled React in webview view)
        - package.json (add build scripts)
    - **Tests to Write:**
        - Integration tests for webview view React rendering
        - Verify server/command lists display in sidebar
        - Verify selection state persists
    - **Steps:**
        1. ✅ Set up webpack to bundle React component for webview
        2. ✅ Create webview entry point that renders MCPPanel component
        3. ✅ Update extension.ts to load bundled JavaScript
        4. ✅ Write integration tests for webview rendering
        5. ✅ Run tests to confirm passing
    - **Status:** Complete. Webpack bundling configured, React integrated into webview with CSP security, 10 integration tests passing.

3. **Phase 3: Command Execution and Output** ✅ COMPLETE
    - **Objective:** Simulate command execution, display output in a separate editor webview panel, and write tests for execution logic.
    - **Files/Functions to Modify/Create:**
        - src/panel.tsx (add execute button/logic)
        - src/extension.ts (message passing, create output webview panel)
        - src/outputPanel.tsx (React component for output display)
        - test/panel.ui.test.tsx (execution tests)
        - test/extension.test.ts (output panel tests)
    - **Tests to Write:**
        - Should trigger command execution from sidebar
        - Should send message from webview to extension
        - Should create output webview panel in editor
        - Should display simulated command output
        - Should show loading state during execution
    - **Steps:**
        1. ✅ Write tests for command execution triggering
        2. ✅ Add execute button and message passing in sidebar React component
        3. ✅ Create output panel React component with webpack bundle
        4. ✅ Update extension.ts to handle messages and create output webview panel
        5. ✅ Implement simulation logic with loading state
        6. ✅ Run tests to confirm passing
    - **Status:** Complete. Execute button added, message passing working, output panel displays in editor with 2-second simulation. 39 tests passing (14 extension + 25 UI).

**Open Questions**
1. All answered by user:
    - ✅ Panel will be a sidebar webview view (not editor panel)
    - ✅ Panel will contain model/data logic
    - ✅ Command execution will be simulated for now
    - ✅ Use React component (requires bundling)
    - ✅ Minimal custom CSS, rely on VS Code styling
    - ✅ Manual test steps in a Markdown file at project root

