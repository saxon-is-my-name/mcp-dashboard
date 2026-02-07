## Plan: Real MCP Integration (Using VS Code Language Model API)

This plan integrates real Model Context Protocol (MCP) servers using VS Code's built-in Language Model API (`vscode.lm`). VS Code 1.109+ acts as the MCP client, so our extension only needs to register server configurations and use VS Code APIs to list/invoke tools.

**Key Discovery:** VS Code has native MCP support! We don't need `@modelcontextprotocol/sdk`.

**Architecture:**
```
Extension → vscode.lm API → VS Code (MCP Client) → MCP Servers
```

**Phases: 4** (reduced from 5 - simplified approach)

1. **Phase 1: MCP Server Definition Provider**
    - **Objective:** Implement `McpServerDefinitionProvider` to register MCP servers with VS Code's Language Model API.
    - **Files/Functions to Modify/Create:**
        - package.json (update engines to >=1.109.0)
        - src/mcpServerProvider.ts (new provider implementation)
        - src/mcpTypes.ts (TypeScript interfaces)
        - test/mcpServerProvider.test.ts (unit tests)
    - **Tests to Write:**
        - Should create MCP server definition provider
        - Should provide stdio server definitions
        - Should provide HTTP server definitions
        - Should handle empty server list
    - **Steps:**
        1. Write tests for provider implementation
        2. Update package.json engine requirement to >=1.109.0
        3. Create mcpServerProvider.ts implementing McpServerDefinitionProvider
        4. Create mcpTypes.ts with configuration interfaces
        5. Register provider using vscode.lm.registerMcpServerDefinitionProvider
        6. Run tests to confirm passing

2. **Phase 2: Server Configuration in VS Code Settings**
    - **Objective:** Add configuration schema for MCP servers and read them from VS Code settings.
    - **Files/Functions to Modify/Create:**
        - package.json (contributes.configuration schema)
        - src/mcpServerProvider.ts (read from settings)
        - src/extension.ts (initialize provider with settings)
        - test/mcpServerProvider.test.ts (configuration tests)
    - **Tests to Write:**
        - Should read stdio server configs from settings
        - Should read HTTP server configs from settings
        - Should validate server configuration format
        - Should handle invalid configurations
        - Should support enabled/disabled flag
    - **Steps:**
        1. Write tests for configuration loading
        2. Define mcp.servers configuration schema in package.json
        3. Implement settings reader in mcpServerProvider
        4. Add validation for server configurations
        5. Update extension.ts to pass settings to provider
        6. Run tests to confirm passing

3. **Phase 3: Dynamic Tool Listing from VS Code**
    - **Objective:** Use vscode.lm.tools to get all available tools from MCP servers and update UI.
    - **Files/Functions to Modify/Create:**
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
        2. Create mcpTool.ts with tool interfaces
        3. Query vscode.lm.tools in extension
        4. Format tool data for webview (group by server)
        5. Send tools to webview via postMessage
        6. Update webview.tsx to receive and display dynamic tools
        7. Run tests to confirm passing

4. **Phase 4: Real Tool Execution via VS Code API**
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
2. **Configuration UI:** Build custom UI for server configuration, or rely on VS Code settings editor?
3. **Tool Parameters UI:** Should Phase 4 include UI for entering tool parameters, or start with parameterless tools?
4. **Error Display:** How should we display tool execution errors to users? (Output panel, notifications, status bar?)

**Answered Questions:**
- ~~MCP Client SDK?~~ ✅ Use VS Code's built-in `vscode.lm` API
- ~~HTTP Transport?~~ ✅ Supported via `McpHttpServerDefinition`
- ~~Authentication?~~ ✅ VS Code handles OAuth flows automatically
- ~~Server Lifecycle?~~ ✅ VS Code manages server processes

**Technical Notes:**
- Requires VS Code 1.109.0 or higher
- No external MCP dependencies needed ( SDK not required)
- VS Code handles all MCP protocol communication
- Servers are launched and managed by VS Code
- Tools are unified across all sources (MCP servers + extensions)
- Built-in UI for tool confirmation and progress
