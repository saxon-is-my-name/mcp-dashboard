## Plan: Fix Extension Activation and Webview Panel

Implement the missing extension.ts file to properly activate the VS Code extension, register the mcp.showPanel command, and create a functional webview panel that displays the React-based MCP dashboard. This fixes the current test failures caused by the placeholder code.

**Phases: 3**

1. **Phase 1: Implement Extension Activation and Command Registration**
    - **Objective:** Create the activate() and deactivate() functions to properly initialize the extension and register the mcp.showPanel command
    - **Files/Functions to Modify/Create:**
        - [src/extension.ts](src/extension.ts) - Implement activate() and deactivate() functions
        - [src/extension.ts](src/extension.ts) - Create registerCommand handler for mcp.showPanel
    - **Tests to Write:**
        - Verify existing tests pass: extension activation test
        - Verify existing tests pass: command registration test
        - Add test for multiple command invocations
    - **Steps:**
        1. Write tests to verify activate() exports and command registration (already exist - verify they fail)
        2. Implement activate(context: ExtensionContext) function that registers mcp.showPanel command
        3. Add command to context.subscriptions for proper cleanup
        4. Implement deactivate() function (can be empty initially)
        5. Run tests to verify they pass

2. **Phase 2: Create Webview Panel with React Loading**
    - **Objective:** Implement the webview panel creation logic that loads the React component using a CDN strategy (no bundler needed initially)
    - **Files/Functions to Modify/Create:**
        - [src/extension.ts](src/extension.ts) - Add createWebviewPanel() helper function
        - [src/extension.ts](src/extension.ts) - Add getWebviewContent() function to generate HTML
        - [src/extension.ts](src/extension.ts) - Update command handler to call createWebviewPanel()
    - **Tests to Write:**
        - Test that mcp.showPanel command creates a webview
        - Test that webview HTML contains expected structure (div#root)
        - Test that webview options have enableScripts: true
    - **Steps:**
        1. Write tests for webview panel creation and HTML structure (should fail)
        2. Implement createWebviewPanel() that uses vscode.window.createWebviewPanel()
        3. Configure webview with enableScripts: true and appropriate options
        4. Implement getWebviewContent() to return HTML with React CDN scripts
        5. Update command handler to call createWebviewPanel()
        6. Run tests to verify webview is created correctly

3. **Phase 3: Integrate Mock Data and Verify End-to-End**
    - **Objective:** Load mock server and command data from panel.js, inject it into the webview, and verify the React component renders properly
    - **Files/Functions to Modify/Create:**
        - [src/extension.ts](src/extension.ts) - Add data loading from panel.js getMockServers/getMockCommands
        - [src/extension.ts](src/extension.ts) - Update getWebviewContent() to inject serialized data
        - [src/extension.ts](src/extension.ts) - Add inline React initialization script
    - **Tests to Write:**
        - Test that mock data is loaded correctly
        - Test that webview HTML contains serialized server data
        - Test that webview HTML contains serialized command data
        - Integration test: command execution results in populated panel
    - **Steps:**
        1. Write tests for data injection into webview HTML (should fail)
        2. Import getMockServers and getMockCommands from panel.js
        3. Update getWebviewContent() to accept servers and commands parameters
        4. Serialize data as JSON and inject into HTML script tag
        5. Add inline script to render React component with data
        6. Run tests to verify data flows correctly end-to-end
        7. Manual verification: Run extension and verify panel displays servers and commands

**Open Questions:**
1. Should we use CDN loading for React or add webpack bundling? (Recommendation: CDN for quick fix, bundling in future phase)
2. Should the panel be a singleton or allow multiple instances? (Recommendation: Singleton for Phase 1, can enhance later)
3. What React CDN version should we use? (Recommendation: React 18 from unpkg.com for modern features)
