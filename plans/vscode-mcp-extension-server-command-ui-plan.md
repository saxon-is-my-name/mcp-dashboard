## Plan: VS Code MCP Extension - Server/Command Model & UI

This plan continues development of the VS Code MCP extension by implementing server and command models, enhancing the sidebar UI with React, and simulating command execution. Each phase follows strict TDD principles, starting with tests, then minimal code to pass those tests. Manual test steps will be documented in a Markdown file at the project root.

**Progress:** Phase 1 and 2 complete. Ready for Phase 3.

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

3. **Phase 3: Command Execution and Output**
    - **Objective:** Simulate command execution, display output in the panel, and write tests for execution logic.
    - **Files/Functions to Modify/Create:**
        - src/panel.tsx (execution logic, output display)
        - test/panel.ui.test.tsx (execution tests)
    - **Tests to Write:**
        - Should simulate command execution
        - Should display command output
        - Should show loading state during execution
    - **Steps:**
        1. Write tests for command execution/output
        2. Implement simulation logic and output display in React component
        3. Add message passing between extension and webview
        4. Run tests to confirm passing

**Open Questions**
1. All answered by user:
    - ✅ Panel will be a sidebar webview view (not editor panel)
    - ✅ Panel will contain model/data logic
    - ✅ Command execution will be simulated for now
    - ✅ Use React component (requires bundling)
    - ✅ Minimal custom CSS, rely on VS Code styling
    - ✅ Manual test steps in a Markdown file at project root

