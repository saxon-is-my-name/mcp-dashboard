## Plan: Real MCP Integration (Using VS Code Language Model API)

This plan integrates real Model Context Protocol (MCP) tools using VS Code's built-in Language Model API (`vscode.lm`). VS Code 1.109+ acts as the MCP client and manages server configurations, so our extension only needs to consume tools via VS Code APIs.

**Key Discovery:** VS Code has native MCP support! Users configure servers through VS Code settings, and we just consume the tools.

**Architecture:**
```
Extension → vscode.lm.tools API → VS Code (MCP Client) → MCP Servers (user-configured)
```

**Phases: 2** (streamlined approach - consume only, no server registration)

1. **Phase 1: Dynamic Tool Listing from VS Code**
    - **Objective:** Use vscode.lm.tools to get all available tools from MCP servers and update UI.
    - **Files/Functions to Modify/Create:**
        - package.json (update engines to >=1.109.0)
        - src/extension.ts (use vscode.lm.tools)
        - src/webview.tsx (use dynamic data)
        - src/types/mcpTool.ts (tool type definitions)
        - test/extension.test.ts (integration tests)
    - **Tests to Write:**
        - Should list tools from vscode.lm.tools
        - Should group tools by server
        - Should handle empty tool list
        - Should update UI when tools change
        - Should handle tool discovery errors
    - **Steps:**
        1. Write tests for tool listing
        2. Update package.json engine requirement to >=1.109.0
        3. Create mcpTool.ts with tool interfaces
        4. Query vscode.lm.tools in extension
        5. Format tool data for webview (group by server)
        6. Send tools to webview via postMessage
        7. Update webview.tsx to receive and display dynamic tools
        8. Run tests to confirm passing

2. **Phase 2: Real Tool Execution via VS Code API**
    - **Objective:** Use vscode.lm.invokeTool() to execute tools and display results.
    - **Files/Functions to Modify/Create:**
        - src/extension.ts (call vscode.lm.invokeTool)
        - src/outputPanel.tsx (handle tool results)
        - src/types/toolResult.ts (result type definitions)
        - test/extension.test.ts (execution tests)
    - **Tests to Write:**
        - Should invoke tool using vscode.lm.invokeTool
        - Should pass tool parameters correctly
        - Should handle tool execution success
        - Should handle tool execution errors
        - Should display results in output panel
    - **Steps:**
        1. Write tests for tool execution
        2. Create toolResult.ts with result interfaces
        3. Implement tool invocation in extension message handler
        4. Handle toolInvocationToken and parameters
        5. Parse and format tool results
        6. Send results to output panel
        7. Update outputPanel.tsx to render tool results
        8. Run tests to confirm passing

**Open Questions:**
1. **Test MCP Server:** Should we include a simple test MCP server in the repo for testing?
2. **Tool Parameters UI:** Should Phase 2 include UI for entering tool parameters, or start with parameterless tools?
3. **Error Display:** How should we display tool execution errors to users? (Output panel, notifications, status bar?)

**Answered Questions:**
- ~~MCP Client SDK?~~ ✅ Use VS Code's built-in `vscode.lm` API
- ~~Server Registration?~~ ✅ Users configure servers via VS Code settings, we just consume tools
- ~~Configuration UI?~~ ✅ Use VS Code's built-in settings editor
- ~~Authentication?~~ ✅ VS Code handles OAuth flows automatically
- ~~Server Lifecycle?~~ ✅ VS Code manages server processes

**Technical Notes:**
- Requires VS Code 1.109.0 or higher
- No external MCP dependencies needed (SDK not required)
- VS Code handles all MCP protocol communication
- Users configure MCP servers through VS Code settings (e.g., `languageModels.mcpServers`)
- Extension only consumes tools via `vscode.lm.tools` API
- Tools are unified across all sources (MCP servers + extensions)
- Built-in UI for tool confirmation and progress
