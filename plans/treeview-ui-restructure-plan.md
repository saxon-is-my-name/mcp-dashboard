## Plan: TreeView + Webview UI Restructure

Transform the single webview UI into a TreeView (tool list) + Webview (tool details) architecture. The TreeView will display servers and tools in a hierarchical structure in the primary sidebar. When a tool is selected in the tree, a dedicated webview underneath will show the tool's description, parameter inputs, and execute button. This improves discoverability and follows VS Code's standard UI patterns.

**Key Decisions:**
- All servers collapsed by default in tree
- Selected tool persisted across VS Code sessions
- Tool details fetched on-demand when selected
- Tree search added as Phase 7 (pause for input before implementation)

**Phases: 7 phases**

1. **Phase 1: Create Tool Tree Data Provider**
    - **Objective:** Implement a `TreeDataProvider` that displays servers and tools in a two-level hierarchy (Server → Tools), with all servers collapsed by default
    - **Files/Functions to Modify/Create:**
        - Create [src/providers/ToolTreeProvider.ts](src/providers/ToolTreeProvider.ts) - Main tree provider class
        - Create [src/types/treeItems.ts](src/types/treeItems.ts) - Tree item type definitions
        - Update [src/types/webviewMessages.ts](src/types/webviewMessages.ts) - Add tree-related message types
    - **Tests to Write:**
        - `ToolTreeProvider returns correct server nodes`
        - `ToolTreeProvider returns correct tool nodes for each server`
        - `ToolTreeProvider handles empty tools gracefully`
        - `ToolTreeProvider triggers onDidChangeTreeData on refresh`
        - `Server nodes are collapsible and start collapsed by default`
        - `Tool nodes are not collapsible and have proper icons`
        - `Tree items contain correct command for selection`
    - **Steps:**
        1. Write tests for tree provider in [test/providers/ToolTreeProvider.test.ts](test/providers/ToolTreeProvider.test.ts) - verify tree structure, node properties, refresh behavior (tests should fail)
        2. Create [src/types/treeItems.ts](src/types/treeItems.ts) with `ToolTreeItem` interface (server/tool node types)
        3. Implement [src/providers/ToolTreeProvider.ts](src/providers/ToolTreeProvider.ts) with `getTreeItem()`, `getChildren()`, `refresh()` methods
        4. Add selection command handling to tree items
        5. Run tests to verify tree provider works correctly (tests should pass)
        6. Run lint/format to ensure code quality

2. **Phase 2: Create Tool Detail Webview Provider**
    - **Objective:** Extract tool detail view (description, parameters, execute button) into a separate WebviewViewProvider that displays details for a selected tool, fetching full details on-demand
    - **Files/Functions to Modify/Create:**
        - Create [src/providers/ToolDetailProvider.ts](src/providers/ToolDetailProvider.ts) - Webview provider for tool details
        - Create [src/ui/components/ToolDetailView.tsx](src/ui/components/ToolDetailView.tsx) - Refactored detail-only component
        - Update [src/types/webviewMessages.ts](src/types/webviewMessages.ts) - Add `toolDetailUpdate` message type
        - Create [src/templates/toolDetailTemplate.ts](src/templates/toolDetailTemplate.ts) - HTML template for detail view
        - Update [src/extension.ts](src/extension.ts) - Add lazy loading of tool details
    - **Tests to Write:**
        - `ToolDetailProvider creates webview with correct options`
        - `ToolDetailProvider sends tool detail on selection`
        - `ToolDetailProvider handles empty selection state`
        - `ToolDetailProvider executes tool via vscode.lm.invokeTool`
        - `ToolDetailProvider fetches full tool details on-demand`
        - `ToolDetailView renders tool name and description`
        - `ToolDetailView renders parameter inputs based on schema`
        - `ToolDetailView shows execute button when tool selected`
        - `ToolDetailView shows "no tool selected" message when empty`
        - `ToolDetailView validates required parameters before execution`
        - `ToolDetailView shows loading state while fetching details`
    - **Steps:**
        1. Write integration tests in [test/providers/ToolDetailProvider.test.ts](test/providers/ToolDetailProvider.test.ts) - verify webview creation, message handling (tests should fail)
        2. Write UI tests in [test/ui/ToolDetailView.ui.test.tsx](test/ui/ToolDetailView.ui.test.tsx) - verify component rendering, validation (tests should fail)
        3. Create [src/ui/components/ToolDetailView.tsx](src/ui/components/ToolDetailView.tsx) extracted from current MCPPanel (parameters + execute only)
        4. Create [src/templates/toolDetailTemplate.ts](src/templates/toolDetailTemplate.ts) with HTML structure
        5. Implement [src/providers/ToolDetailProvider.ts](src/providers/ToolDetailProvider.ts) with message handling for tool selection and execution
        6. Run tests to verify detail provider and component work correctly (tests should pass)
        7. Run lint/format to ensure code quality

3. **Phase 3: Implement Coordination Service with Persistence**
    - **Objective:** Create a service that coordinates state between the TreeView (selection) and the detail WebviewProvider (display), ensuring they stay in sync. Persist selected tool across VS Code sessions.
    - **Files/Functions to Modify/Create:**
        - Create [src/services/ToolCoordinationService.ts](src/services/ToolCoordinationService.ts) - Manages tool selection state with workspace state persistence
        - Update [src/providers/ToolTreeProvider.ts](src/providers/ToolTreeProvider.ts) - Integrate with coordination service
        - Update [src/providers/ToolDetailProvider.ts](src/providers/ToolDetailProvider.ts) - Listen to coordination service
    - **Tests to Write:**
        - `ToolCoordinationService stores selected tool`
        - `ToolCoordinationService notifies listeners on selection change`
        - `ToolCoordinationService handles null selection`
        - `ToolCoordinationService persists selection to workspace state`
        - `ToolCoordinationService restores selection on activation`
        - `ToolTreeProvider selection updates coordination service`
        - `ToolDetailProvider receives updated tool from coordination service`
        - `Selecting tool in tree updates detail webview`
        - `Rapid selection changes are handled correctly`
        - `Selected tool is restored after VS Code restart`
    - **Steps:**
        1. Write tests in [test/services/ToolCoordinationService.test.ts](test/services/ToolCoordinationService.test.ts) - verify selection state management, listener notifications (tests should fail)
        2. Write coordination tests in [test/integration/tree-detail-coordination.test.ts](test/integration/tree-detail-coordination.test.ts) - verify end-to-end selection flow (tests should fail)
        3. Implement [src/services/ToolCoordinationService.ts](src/services/ToolCoordinationService.ts) with EventEmitter pattern for selection changes
        4. Update [src/providers/ToolTreeProvider.ts](src/providers/ToolTreeProvider.ts) to register selection command that updates coordination service
        5. Update [src/providers/ToolDetailProvider.ts](src/providers/ToolDetailProvider.ts) to subscribe to coordination service and update webview
        6. Run tests to verify coordination between tree and detail view (tests should pass)
        7. Run lint/format to ensure code quality

4. **Phase 4: Wire Tree and Detail Providers into Extension**
    - **Objective:** Register both the TreeView and detail WebviewView in the extension, update package.json to declare views, and remove old webview provider
    - **Files/Functions to Modify/Create:**
        - Update [src/extension.ts](src/extension.ts) - Register tree provider, detail provider, coordination service
        - Update [package.json](package.json) - Add tree view configuration, update webview view for details
        - Update [webpack.config.js](webpack.config.js) - Add toolDetail bundle entry
    - **Tests to Write:**
        - `Extension registers tree view provider`
        - `Extension registers detail webview provider`
        - `Extension creates coordination service singleton`
        - `Tree view displays in mcp-dashboard container`
        - `Detail view displays in mcp-dashboard container`
        - `Both views are activated correctly`
        - `Extension cleanup disposes both providers`
    - **Steps:**
        1. Write tests in [test/extension.test.ts](test/extension.test.ts) - verify tree and detail provider registration (tests should fail)
        2. Update [package.json](package.json) views section to define tree view (`mcpToolTree`) and detail webview (`mcpToolDetail`)
        3. Update [src/extension.ts](src/extension.ts) to instantiate coordination service, tree provider, detail provider
        4. Register both providers with VS Code: `vscode.window.registerTreeDataProvider()` and `vscode.window.registerWebviewViewProvider()`
        5. Add proper disposal in `deactivate()` function
        6. Update [webpack.config.js](webpack.config.js) to add `toolDetail` entry point
        7. Run tests to verify extension wiring (tests should pass)
        8. Run lint/format to ensure code quality

5. **Phase 5: Update Build Configuration and Remove Old Code**
    - **Objective:** Update webpack to bundle the new detail view component, create entry point, and remove deprecated webview code
    - **Files/Functions to Modify/Create:**
        - Create [src/toolDetailEntry.tsx](src/toolDetailEntry.tsx) - Entry point for detail webview bundle
        - Update [webpack.config.js](webpack.config.js) - Configure toolDetail bundle
        - Delete [src/webview.tsx](src/webview.tsx) - Old webview entry (deprecated)
        - Delete [src/panel.tsx](src/panel.tsx) - Old panel component (deprecated)
        - Delete [src/templates/webviewTemplate.ts](src/templates/webviewTemplate.ts) - Old template (deprecated)
    - **Tests to Write:**
        - `webpack builds toolDetail bundle successfully`
        - `toolDetail bundle exports correct API for VS Code`
        - `Old webview tests are removed or migrated`
        - `Detail view webpack bundle includes all dependencies`
    - **Steps:**
        1. Write build verification tests in [test/build.test.ts](test/build.test.ts) - verify webpack configuration, bundle outputs (tests should fail)
        2. Create [src/toolDetailEntry.tsx](src/toolDetailEntry.tsx) that renders ToolDetailView
        3. Update [webpack.config.js](webpack.config.js) to replace `webview` entry with `toolDetail` entry
        4. Delete deprecated files: [src/webview.tsx](src/webview.tsx), [src/panel.tsx](src/panel.tsx), [src/templates/webviewTemplate.ts](src/templates/webviewTemplate.ts)
        5. Migrate/remove old webview tests from [test/panel.ui.test.tsx](test/panel.ui.test.tsx) (consolidate into ToolDetailView tests)
        6. Run build tests to verify webpack configuration (tests should pass)
        7. Run full test suite to ensure no regressions
        8. Run lint/format to ensure code quality

6. **Phase 6: Polish and Documentation**
    - **Objective:** Add tree icons, improve empty states, add tooltips, and update README with new UI structure
    - **Files/Functions to Modify/Create:**
        - Update [src/providers/ToolTreeProvider.ts](src/providers/ToolTreeProvider.ts) - Add icons, tooltips, descriptions
        - Update [src/ui/components/ToolDetailView.tsx](src/ui/components/ToolDetailView.tsx) - Improve empty state message, loading states
        - Update [README.md](README.md) - Document new TreeView + Webview architecture
        - Add [docs/UI_ARCHITECTURE.md](docs/UI_ARCHITECTURE.md) - Technical documentation
    - **Tests to Write:**
        - `Tree items have appropriate icons (server vs tool)`
        - `Tree items have descriptive tooltips`
        - `Empty state shows helpful message`
        - `Loading state displays while fetching tools`
        - `Error state shows when tool fetch fails`
    - **Steps:**
        1. Write UI polish tests in existing test files - verify icons, tooltips, states (tests should fail)
        2. Add ThemeIcon configuration to tree items in [src/providers/ToolTreeProvider.ts](src/providers/ToolTreeProvider.ts)
        3. Add tooltip and description properties to tree items
        4. Update [src/ui/components/ToolDetailView.tsx](src/ui/components/ToolDetailView.tsx) with better empty/loading/error states
        5. Update [README.md](README.md) with screenshots and architecture explanation
        6. Create [docs/UI_ARCHITECTURE.md](docs/UI_ARCHITECTURE.md) documenting provider coordination, message flow
        7. Run tests to verify polish items (tests should pass)
        8. Run lint/format to ensure code quality

7. **Phase 7: Add Tree Search Functionality**
    - **Objective:** PAUSE FOR USER INPUT BEFORE STARTING - Implement search/filter functionality for the tool tree to help users quickly find tools in large lists
    - **Files/Functions to Modify/Create:**
        - Update [src/providers/ToolTreeProvider.ts](src/providers/ToolTreeProvider.ts) - Add search/filter capability
        - Create [src/commands/searchTools.ts](src/commands/searchTools.ts) - Search command implementation
        - Update [package.json](package.json) - Register search command
    - **Tests to Write:**
        - `Search filters tree to show only matching tools`
        - `Search is case-insensitive`
        - `Search clears when empty string provided`
        - `Search matches tool names and descriptions`
        - `Search expands parent nodes showing matches`
        - `Search command is accessible from tree view`
    - **Steps:**
        1. **STOP and consult user** - Discuss search UX: VSCode quick pick vs. custom input box vs. tree filter API
        2. Write tests for search functionality (tests should fail)
        3. Implement search filtering in ToolTreeProvider
        4. Add search command and register in package.json
        5. Implement auto-expand for nodes with search matches
        6. Run tests to verify search works correctly (tests should pass)
        7. Run lint/format to ensure code quality
