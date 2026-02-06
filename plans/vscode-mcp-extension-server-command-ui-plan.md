## Plan: VS Code MCP Extension - Server/Command Model & UI

This plan continues development of the VS Code MCP extension by implementing server and command models, enhancing the panel UI, and simulating command execution. Each phase follows strict TDD principles, starting with tests, then minimal code to pass those tests. Manual test steps will be documented in a Markdown file at the project root.

**Phases 4**
1. **Phase 1: Server and Command Model**
    - **Objective:** Implement data structures for MCP servers and commands, provide mock data, and write unit tests.
    - **Files/Functions to Modify/Create:**
        - src/panel.tsx (add model/data logic)
        - test/panel.test.ts (unit tests for model/data)
    - **Tests to Write:**
        - Should create MCP server objects
        - Should create MCP command objects
        - Should return mock data for servers/commands
    - **Steps:**
        1. Write unit tests for server/command model and mock data
        2. Implement data structures and mock data in panel.tsx
        3. Run tests to confirm passing

2. **Phase 2: Panel UI - Server/Command List**
    - **Objective:** Build React UI for server and command selection, connect to mock data, and write UI tests.
    - **Files/Functions to Modify/Create:**
        - src/panel.tsx (UI components)
        - test/panel.test.ts (UI tests)
    - **Tests to Write:**
        - Should render server list
        - Should render command list for selected server
        - Should handle server/command selection events
    - **Steps:**
        1. Write UI tests for server/command list
        2. Implement UI components and connect to mock data
        3. Run tests to confirm passing

3. **Phase 3: Command Execution and Output**
    - **Objective:** Simulate command execution, display output in the panel, and write tests for execution logic.
    - **Files/Functions to Modify/Create:**
        - src/panel.tsx (execution logic, output display)
        - test/panel.test.ts (execution tests)
    - **Tests to Write:**
        - Should simulate command execution
        - Should display command output
    - **Steps:**
        1. Write tests for command execution/output
        2. Implement simulation logic and output display
        3. Run tests to confirm passing

4. **Phase 4: Manual Test Documentation**
    - **Objective:** Document manual test steps for UI and integration features in a Markdown file at the project root.
    - **Files/Functions to Modify/Create:**
        - MCP-manual-test-steps.md (new file)
    - **Tests to Write:**
        - N/A (documentation only)
    - **Steps:**
        1. Write manual test steps for UI and integration
        2. Review and update as needed

**Open Questions**
1. All answered by user:
    - Panel will contain model/data logic
    - Command execution will be simulated for now
    - Minimal custom CSS, rely on VS Code styling
    - Manual test steps in a Markdown file at project root
