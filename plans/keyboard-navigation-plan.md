## Plan: Keyboard Navigation for Tool Selection and Execution

Enable full keyboard navigation from tool selection through parameter entry to execution, allowing users to work without a mouse.

**Phases: 2**

1. **Phase 1: Keyboard Navigation to Detail Panel with Auto-focus**
   - **Objective:** Add keyboard shortcuts (Enter and Tab) to focus the detail webview after selecting a tool in the tree, with optional auto-focus of first input field for seamless keyboard entry
   - **Files/Functions to Modify/Create:**
     - [src/extension.ts](src/extension.ts) - Register `mcp.focusDetail` command and set context key `mcp.toolSelected`
     - [src/providers/ToolTreeProvider.ts](src/providers/ToolTreeProvider.ts) - Set context key when tool is selected
     - [src/ui/components/ToolDetailView.tsx](src/ui/components/ToolDetailView.tsx) - Add React ref and useEffect to auto-focus first input
     - [package.json](package.json) - Add command, keybindings (Enter and Tab), and configuration setting
   - **Tests to Write:**
     - `mcp.focusDetail command focuses the detail webview`
     - `mcp.toolSelected context key is set when tool is selected`
     - `mcp.toolSelected context key is cleared when no tool is selected`
     - `Enter key when tree focused and tool selected executes mcp.focusDetail`
     - `Tab key when tree focused and tool selected executes mcp.focusDetail`
     - `ToolDetailView auto-focuses first input when tool loads and setting enabled`
     - `ToolDetailView does not auto-focus when setting disabled`
     - `ToolDetailView does not auto-focus when no parameters exist`
   - **Steps:**
     1. Write integration test in [test/integration/keyboardNavigation.test.ts](test/integration/keyboardNavigation.test.ts) - verify focus command, context key, and keybindings (tests should fail)
     2. Write UI tests in [test/unit/toolDetailView.focus.test.tsx](test/unit/toolDetailView.focus.test.tsx) - verify auto-focus behavior (tests should fail)
     3. Add configuration setting in [package.json](package.json): `mcp.autoFocusFirstInput` (default: true)
     4. Add `mcp.focusDetail` command in [src/extension.ts](src/extension.ts) that executes `'mcpToolDetail.focus'`
     5. Update `mcp.selectTool` command handler to set context key `mcp.toolSelected` to true/false based on whether tool is defined
     6. Register keybindings in [package.json](package.json): Enter and Tab keys with `when` clause `focusedView == mcpToolTree && mcp.toolSelected`
     7. Add command declaration in [package.json](package.json)
     8. Add React ref `firstInputRef` in [ToolDetailView component](src/ui/components/ToolDetailView.tsx)
     9. Add useEffect that checks configuration setting and focuses first input when tool changes
     10. Update ParameterInputs component to accept and attach ref to first parameter input
     11. Run tests to verify keyboard navigation and auto-focus work (tests should pass)
     12. Run lint/format to ensure code quality

2. **Phase 2: Add Execute Keyboard Shortcut**
   - **Objective:** Add Ctrl+Enter (Cmd+Enter on Mac) keyboard shortcut to execute the tool from within the webview focus
   - **Files/Functions to Modify/Create:**
     - [src/ui/components/ToolDetailView.tsx](src/ui/components/ToolDetailView.tsx) - Add keyboard event listener for Ctrl+Enter
     - [README.md](README.md) - Document keyboard shortcuts
   - **Tests to Write:**
     - `Ctrl+Enter triggers tool execution`
     - `Cmd+Enter triggers tool execution on Mac`
     - `Execute keyboard shortcut validates parameters before execution`
   - **Steps:**
     1. Write UI tests in [test/unit/toolDetailView.keyboard.test.tsx](test/unit/toolDetailView.keyboard.test.tsx) - verify keyboard execution (tests should fail)
     2. Add keyboard event listener in [ToolDetailView component](src/ui/components/ToolDetailView.tsx) for Ctrl+Enter/Cmd+Enter
     3. Wire keyboard event to call `handleExecute` function
     4. Update [README.md](README.md) to document keyboard shortcuts in Features section
     5. Run tests to verify keyboard execution works (tests should pass)
     6. Run lint/format to ensure code quality

**Keyboard Navigation Flow:**

1. Press **Ctrl+F** to filter tools
2. Use **arrow keys** to select a tool
3. Press **Enter** or **Tab** to focus the detail panel (with auto-focus of first input if enabled)
4. **Tab** through parameters and enter values
5. Press **Ctrl+Enter** (Cmd+Enter on Mac) to execute

**Configuration:**

- `mcp.autoFocusFirstInput` (default: true) - Automatically focus the first parameter input when the detail panel is focused
