## Plan: VS Code Extension for MCP Server Commands

We will build a VS Code extension that provides a side panel for users to select from multiple MCP servers and view/click available commands (e.g., Atlassian MCP ticket details). The first iteration will focus on displaying servers and commands, with command execution and output shown in the panel. Parameter entry and advanced features will be added in later phases.

**Phases**
1. **Phase 1: Extension Scaffolding**
    - **Objective:** Set up the basic VS Code extension structure with activation events and a placeholder panel.
    - **Files/Functions to Modify/Create:** package.json, src/extension.ts, src/panel.tsx, .vscodeignore
    - **Tests to Write:** Extension activation test, panel visibility test
    - **Steps:**
        1. Scaffold extension using yo code or manually.
        2. Register activation events and commands.
        3. Add a basic webview panel.
        4. Write and run activation/panel tests.

2. **Phase 2: Server and Command Model**
    - **Objective:** Implement data structures for servers and commands, and mock data for initial UI.
    - **Files/Functions to Modify/Create:** src/model/Server.ts, src/model/Command.ts, src/data/mockServers.ts
    - **Tests to Write:** Model instantiation test, mock data test
    - **Steps:**
        1. Define Server and Command types/classes.
        2. Create mock data for servers and commands.
        3. Write and run model/data tests.

3. **Phase 3: Panel UI - Server/Command List**
    - **Objective:** Build the side panel UI to display servers and their commands using React and TypeScript.
    - **Files/Functions to Modify/Create:** src/panel.tsx, src/components/ServerList.tsx, src/components/CommandList.tsx
    - **Tests to Write:** UI rendering test, server/command selection test
    - **Steps:**
        1. Implement panel layout with server and command lists.
        2. Connect mock data to UI.
        3. Write and run UI tests.

4. **Phase 4: Command Execution and Output**
    - **Objective:** Enable clicking a command to simulate execution and display output in the panel.
    - **Files/Functions to Modify/Create:** src/panel.tsx, src/components/OutputPanel.tsx
    - **Tests to Write:** Command click test, output display test
    - **Steps:**
        1. Add click handlers for commands.
        2. Simulate command execution (mock output).
        3. Display output in the panel.
        4. Write and run execution/output tests.

5. **Phase 5: Multi-Server Support and Refactoring**
    - **Objective:** Ensure robust support for multiple servers and refactor for maintainability.
    - **Files/Functions to Modify/Create:** src/model, src/panel.tsx, src/components
    - **Tests to Write:** Multi-server selection test, code quality/linting
    - **Steps:**
        1. Test and refine multi-server logic.
        2. Refactor code for clarity and maintainability.
        3. Lint and format codebase.
        4. Write and run multi-server tests.

**Open Questions**
None (all answered)
