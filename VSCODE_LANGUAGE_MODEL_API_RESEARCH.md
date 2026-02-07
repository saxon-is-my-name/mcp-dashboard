# VS Code Language Model API Research

**Date:** February 7, 2026  
**Critical Question:** Does VS Code's Language Model API (`vscode.lm.invokeTool`) eliminate the need for the MCP SDK in our extension?

**Research Summary:** YES - VS Code has built-in MCP client support! Extensions should use VS Code's APIs instead of implementing their own MCP client.

---

## Executive Summary

**CRITICAL FINDING: VS Code 1.70+ includes native MCP support through the Language Model API.**

VS Code acts as an MCP client internally and provides extension APIs to:
1. Register MCP servers via `lm.registerMcpServerDefinitionProvider()`
2. Register tools via `lm.registerTool()`
3. Invoke tools via `lm.invokeTool()`
4. List all available tools via `lm.tools`

**Architectural Implication:** Our extension should **NOT** implement its own MCP client using `@modelcontextprotocol/sdk`. Instead, we should:
- Use `lm.registerMcpServerDefinitionProvider()` to tell VS Code about MCP servers
- Let VS Code handle MCP protocol communication
- Use `lm.tools` to discover available tools
- Use `lm.invokeTool()` to execute tools

**This completely changes our implementation strategy.**

---

## 1. VS Code Language Model API Overview

### 1.1 The `vscode.lm` Namespace

VS Code provides a dedicated namespace for language model and tool functionality:

```typescript
export namespace lm {
  // Events
  export const onDidChangeChatModels: Event<void>;
  
  // Language Model Selection
  export function selectChatModels(selector?: LanguageModelChatSelector): Thenable<LanguageModelChat[]>;
  
  // Tool Management
  export function registerTool<T>(name: string, tool: LanguageModelTool<T>): Disposable;
  export const tools: readonly LanguageModelToolInformation[];
  export function invokeTool(name: string, options: LanguageModelToolInvocationOptions<object>, token?: CancellationToken): Thenable<LanguageModelToolResult>;
  
  // MCP Server Registration (KEY FINDING!)
  export function registerMcpServerDefinitionProvider(id: string, provider: McpServerDefinitionProvider): Disposable;
  
  // Language Model Provider Registration
  export function registerLanguageModelChatProvider(vendor: string, provider: LanguageModelChatProvider): Disposable;
}
```

---

## 2. MCP Server Registration - The Game Changer

### 2.1 How VS Code Handles MCP

VS Code has **built-in MCP client functionality**. Extensions don't implement MCP clients - they just tell VS Code where MCP servers are.

#### McpServerDefinitionProvider Interface

```typescript
export interface McpServerDefinitionProvider<T extends McpServerDefinition = McpServerDefinition> {
  /**
   * Optional event fired to signal that the set of available servers has changed.
   */
  readonly onDidChangeMcpServerDefinitions?: Event<void>;

  /**
   * Provides available MCP servers. The editor will call this method eagerly
   * to ensure the availability of servers for the language model.
   */
  provideMcpServerDefinitions(token: CancellationToken): ProviderResult<T[]>;

  /**
   * This function will be called when the editor needs to start a MCP server.
   * At this point, the extension may take any actions which may require user
   * interaction, such as authentication.
   */
  resolveMcpServerDefinition?(server: T, token: CancellationToken): ProviderResult<T>;
}
```

### 2.2 MCP Server Definition Types

VS Code supports two MCP transport types:

#### Stdio Transport
```typescript
export class McpStdioServerDefinition {
  readonly label: string;
  cwd?: Uri;
  command: string;
  args: string[];
  env: Record<string, string | number | null>;
  version?: string;
  
  constructor(label: string, command: string, args?: string[], env?: Record<string, string | number | null>, version?: string);
}
```

#### HTTP Transport
```typescript
export class McpHttpServerDefinition {
  readonly label: string;
  uri: Uri;
  headers: Record<string, string>;
  version?: string;
  
  constructor(label: string, uri: Uri, headers?: Record<string, string>, version?: string);
}
```

### 2.3 Registration Example

```typescript
// In package.json
{
  "contributes": {
    "mcpServerDefinitionProviders": [
      {
        "id": "my-extension.mcp-servers",
        "label": "My MCP Servers"
      }
    ]
  }
}

// In extension.ts
export function activate(context: vscode.ExtensionContext) {
  const provider: vscode.McpServerDefinitionProvider = {
    provideMcpServerDefinitions(token) {
      // Return MCP server definitions from config
      const config = vscode.workspace.getConfiguration('mcp');
      const servers = config.get<any[]>('servers', []);
      
      return servers.map(s => 
        new vscode.McpStdioServerDefinition(
          s.name,
          s.command,
          s.args,
          s.env
        )
      );
    },
    
    resolveMcpServerDefinition(server, token) {
      // Optional: handle authentication, validation, etc.
      return server;
    }
  };
  
  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('my-extension.mcp-servers', provider)
  );
}
```

**Key Point:** VS Code handles:
- Launching the MCP server process
- MCP protocol communication (JSON-RPC 2.0)
- Initialize handshake and capability negotiation
- Listing tools from the server
- Executing tool calls
- Managing server lifecycle

---

## 3. Tool Registration & Discovery

### 3.1 Tool Registration

Extensions can register their own tools (not necessarily from MCP servers):

```typescript
const tool: vscode.LanguageModelTool<{ query: string }> = {
  async invoke(options, token) {
    // Execute the tool
    const result = await doSomething(options.input.query);
    
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(result)
    ]);
  },
  
  async prepareInvocation(options, token) {
    return {
      invocationMessage: `Searching for: ${options.input.query}`,
      confirmationMessages: {
        title: 'Confirm Search',
        message: 'This will search the database'
      }
    };
  }
};

// Register the tool
vscode.lm.registerTool('my-extension.search', tool);
```

**Tools must also be declared in package.json:**
```json
{
  "contributes": {
    "languageModelTools": [
      {
        "name": "my-extension.search",
        "description": "Search for items",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### 3.2 Tool Discovery

Any extension can list all available tools:

```typescript
// Get all registered tools (from all sources - MCP servers, extensions, etc.)
const allTools = vscode.lm.tools;

for (const tool of allTools) {
  console.log(`Tool: ${tool.name}`);
  console.log(`Description: ${tool.description}`);
  console.log(`Input Schema:`, tool.inputSchema);
  console.log(`Tags:`, tool.tags);
}
```

**Crucial:** This includes tools from:
- MCP servers registered via `registerMcpServerDefinitionProvider`
- Tools registered directly via `registerTool`
- Built-in VS Code tools

### 3.3 Tool Invocation

```typescript
// Invoke a tool by name
const result = await vscode.lm.invokeTool(
  'my-extension.search',
  {
    toolInvocationToken: undefined, // or from ChatRequest for UI integration
    input: { query: 'hello world' }
  },
  cancellationToken
);

// Result contains LanguageModelTextPart, LanguageModelPromptTsxPart, etc.
for (const part of result.content) {
  if (part instanceof vscode.LanguageModelTextPart) {
    console.log(part.value);
  }
}
```

---

## 4. Relationship to MCP

### 4.1 Is VS Code an MCP Client?

**YES.** When you register an MCP server via `registerMcpServerDefinitionProvider`:

1. VS Code launches the server process (stdio) or connects (HTTP)
2. VS Code performs the MCP `initialize` handshake
3. VS Code calls `tools/list` to discover tools
4. VS Code exposes these tools via `lm.tools`
5. VS Code handles `tools/call` when `lm.invokeTool()` is called
6. VS Code manages the server lifecycle

### 4.2 Are VS Code Tools the Same as MCP Tools?

**Conceptually yes, but with abstraction.** VS Code unifies:
- MCP tools (from MCP servers)
- Extension tools (registered directly)
- Built-in tools

All are exposed through the same `lm.tools` API and invoked through `lm.invokeTool()`.

### 4.3 Does VS Code Read MCP Server Configurations?

**Only if an extension provides them.** VS Code doesn't automatically read MCP config files.

Extensions must:
1. Read configuration (from VS Code settings, files, etc.)
2. Return server definitions from `provideMcpServerDefinitions()`
3. VS Code then manages those servers

### 4.4 Direct Access to MCP Servers?

**No need.** Extensions don't get direct access to MCP servers or their connections. VS Code acts as the intermediary:

```
Extension → vscode.lm.invokeTool() → VS Code → MCP Server → VS Code → Extension
```

---

## 5. Tool Invocation Details

### 5.1 Tool Invocation Signature

```typescript
function invokeTool(
  name: string,
  options: LanguageModelToolInvocationOptions<object>,
  token?: CancellationToken
): Thenable<LanguageModelToolResult>;

interface LanguageModelToolInvocationOptions<T> {
  // For chat integration (shows in chat UI)
  toolInvocationToken: ChatParticipantToolToken | undefined;
  
  // The tool input (validated against inputSchema)
  input: T;
  
  // Token budget and counting
  tokenizationOptions?: LanguageModelToolTokenizationOptions;
}
```

### 5.2 Tool Result Format

```typescript
class LanguageModelToolResult {
  content: Array<
    | LanguageModelTextPart
    | LanguageModelPromptTsxPart
    | LanguageModelDataPart
    | unknown
  >;
}

// Text result
new LanguageModelTextPart("Hello world")

// Data result (JSON, image, etc.)
LanguageModelDataPart.json({ foo: "bar" })
LanguageModelDataPart.image(imageBytes, "image/png")
LanguageModelDataPart.text("content", "text/markdown")
```

### 5.3 Error Handling

Errors are thrown as exceptions:
- Invalid tool name → Error
- Server not available → Error
- Tool execution failed → Error
- Input validation failed → Error

---

## 6. Architecture Implications

### 6.1 What Our Extension Should Do

**OLD PLAN (INCORRECT):**
- ❌ Install `@modelcontextprotocol/sdk`
- ❌ Implement MCP client with `Client`, `StdioClientTransport`
- ❌ Manage server connections ourselves
- ❌ Handle MCP protocol messages
- ❌ Call `tools/list`, `tools/call` directly

**NEW PLAN (CORRECT):**
- ✅ Read MCP server configs from VS Code settings
- ✅ Implement `McpServerDefinitionProvider`
- ✅ Register with `lm.registerMcpServerDefinitionProvider()`
- ✅ Use `lm.tools` to list available tools
- ✅ Use `lm.invokeTool()` to execute tools
- ✅ Display UI for browsing and invoking tools

### 6.2 Extension Architecture

```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
  // 1. Register MCP Server Definition Provider
  const mcpProvider = new MCPServerProvider();
  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('mcp-dashboard.servers', mcpProvider)
  );
  
  // 2. Create UI that shows lm.tools
  const viewProvider = new MCPViewProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mcpView', viewProvider)
  );
  
  // 3. When user wants to list tools, read from lm.tools
  // 4. When user executes a tool, call lm.invokeTool()
}

// src/mcpServerProvider.ts
class MCPServerProvider implements vscode.McpServerDefinitionProvider {
  provideMcpServerDefinitions(token: vscode.CancellationToken) {
    const config = vscode.workspace.getConfiguration('mcp');
    const servers = config.get<ServerConfig[]>('servers', []);
    
    return servers.map(s => {
      if (s.transport === 'stdio') {
        return new vscode.McpStdioServerDefinition(
          s.name,
          s.command,
          s.args,
          s.env
        );
      } else {
        return new vscode.McpHttpServerDefinition(
          s.name,
          vscode.Uri.parse(s.url),
          s.headers
        );
      }
    });
  }
}

// src/mcpViewProvider.ts
class MCPViewProvider implements vscode.WebviewViewProvider {
  async resolveWebviewView(webviewView: vscode.WebviewView) {
    // Get all tools
    const tools = vscode.lm.tools;
    
    // Group by server (parse from tool name convention)
    const serverTools = groupToolsByServer(tools);
    
    // Send to webview
    webviewView.webview.postMessage({
      type: 'tools',
      tools: serverTools
    });
    
    // Handle execution
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'execute') {
        const result = await vscode.lm.invokeTool(
          msg.toolName,
          { toolInvocationToken: undefined, input: msg.input }
        );
        // Display result in output panel
      }
    });
  }
}
```

### 6.3 Configuration Schema

```json
// package.json
{
  "contributes": {
    "configuration": {
      "title": "MCP",
      "properties": {
        "mcp.servers": {
          "type": "array",
          "description": "MCP servers to connect to",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "transport": { "enum": ["stdio", "http"] },
              "command": { "type": "string" },
              "args": { "type": "array", "items": { "type": "string" } },
              "env": { "type": "object" },
              "url": { "type": "string" },
              "headers": { "type": "object" }
            }
          }
        }
      }
    },
    "mcpServerDefinitionProviders": [
      {
        "id": "mcp-dashboard.servers",
        "label": "MCP Dashboard Servers"
      }
    ]
  }
}
```

---

## 7. API Availability

### 7.1 Stable or Proposed?

Based on the type definitions in `@types/vscode@1.109.0`, the Language Model API is:
- **Present in VS Code 1.109+**
- **Documented in TypeScript definitions**
- **Part of the stable API** (no "proposed" markers in the types)

### 7.2 Version Requirements

Our extension already requires:
```json
{
  "engines": {
    "vscode": ">=1.70.0"
  }
}
```

We should **update** this to:
```json
{
  "engines": {
    "vscode": ">=1.109.0"
  }
}
```

### 7.3 Examples in the Wild

The API is relatively new (VS Code 1.109.0 was released in late 2025). Examples:
- GitHub Copilot extension uses this API
- VS Code's built-in chat participant system uses this
- The `@vscode/prompt-tsx` library integrates with tool results

---

## 8. What This Means for the MCP SDK Analysis

### 8.1 Previous Analysis is Now Obsolete

The document `MCP_SDK_ANALYSIS.md` analyzed whether to use `@modelcontextprotocol/sdk` or implement MCP manually.

**That analysis is now irrelevant** because:
- Neither approach is correct
- VS Code already has an MCP client
- Extensions should use VS Code's APIs

### 8.2 Comparison: SDK vs Manual vs VS Code API

| Approach | When to Use |
|----------|-------------|
| **MCP SDK** | Building a standalone MCP client (CLI, desktop app, server) |
| **Manual Implementation** | Never (too much work) |
| **VS Code LM API** | ✅ **Building VS Code extensions** |

### 8.3 Dependencies Required

**Before (WRONG):**
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "zod": "^3.25.0"
  }
}
```

**After (CORRECT):**
```json
{
  "dependencies": {
    // No external dependencies needed!
    // VS Code provides everything
  }
}
```

---

## 9. Updated Implementation Roadmap

### Phase 1: Configuration Schema (1 day)
- Define `mcp.servers` configuration in package.json
- Add settings UI schema
- Test configuration reading

### Phase 2: MCP Server Provider (1-2 days)
- Implement `McpServerDefinitionProvider`
- Register with `lm.registerMcpServerDefinitionProvider()`
- Handle stdio and HTTP server definitions
- Test that VS Code connects to servers

### Phase 3: Tool Discovery UI (1-2 days)
- Read `lm.tools` to get all available tools
- Group tools by server/source
- Display in sidebar webview
- Update UI when `lm.onDidChangeChatModels` fires

### Phase 4: Tool Execution (1-2 days)
- Implement tool invocation via `lm.invokeTool()`
- Handle tool input parameters
- Display results in output panel
- Error handling and cancellation

### Phase 5: Advanced Features (2-3 days)
- Tool parameter input UI
- Tool result formatting (JSON, markdown, images)
- Tool execution history
- Server status indicators

**Total: 6-10 days** (vs 10-14 with manual SDK implementation)

---

## 10. Answers to Research Questions

### 1. Does VS Code's Language Model API eliminate the need for MCP SDK?

**YES, ABSOLUTELY.** For VS Code extensions, you should **never** use the MCP SDK. VS Code is already an MCP client.

### 2. What does `vscode.lm` provide?

- MCP server registration (`registerMcpServerDefinitionProvider`)
- Tool registration (`registerTool`)
- Tool discovery (`lm.tools`)
- Tool invocation (`invokeTool`)
- Language model access (`selectChatModels`)

### 3. Does VS Code connect to MCP servers automatically?

No. Extensions must provide server definitions via `McpServerDefinitionProvider`, then VS Code connects automatically.

### 4. Can we list available tools?

**YES.** `vscode.lm.tools` provides all tools from all sources (MCP servers, extensions, built-in).

### 5. Does VS Code act as an MCP client internally?

**YES.** VS Code handles all MCP protocol communication when you register servers.

### 6. Can extensions access MCP servers through VS Code APIs?

**YES.** Via:
- `registerMcpServerDefinitionProvider()` to declare servers
- `lm.tools` to see tools
- `lm.invokeTool()` to execute tools

---

## 11. Conclusion

**CRITICAL ARCHITECTURAL CHANGE:**

The real-mcp-integration-plan.md must be completely rewritten. We should **NOT**:
- Install `@modelcontextprotocol/sdk`
- Implement `MCPClientManager`
- Manage MCP connections
- Handle JSON-RPC messages

Instead, we should:
- Implement `McpServerDefinitionProvider`
- Read server configs from VS Code settings
- Let VS Code handle all MCP communication
- Use `lm.tools` and `lm.invokeTool()` for everything

**Implementation Complexity:** 
- Previous plan: ~7-10 days with SDK
- New plan: **~6-10 days with VS Code API** (simpler, more correct)

**Benefits:**
- ✅ No external dependencies
- ✅ VS Code handles protocol updates
- ✅ Integrated with VS Code's tool system
- ✅ Automatic UI for tool confirmations
- ✅ Better performance (no duplicate connections)
- ✅ Consistent with VS Code architecture

**Next Step:** Rewrite the implementation plan based on VS Code's Language Model API.

---

## Appendix: Code Examples

### A. Complete Extension Activation

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register MCP server provider
  const mcpProvider = new MCPServerProvider();
  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('mcp-dashboard.servers', mcpProvider)
  );
  
  // Register webview view
  const viewProvider = new MCPViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('mcpView', viewProvider)
  );
  
  // Listen for tool changes
  context.subscriptions.push(
    vscode.lm.onDidChangeChatModels(() => {
      // Refresh UI when tools change
      viewProvider.refresh();
    })
  );
}

class MCPServerProvider implements vscode.McpServerDefinitionProvider {
  provideMcpServerDefinitions(token: vscode.CancellationToken): vscode.ProviderResult<vscode.McpServerDefinition[]> {
    const config = vscode.workspace.getConfiguration('mcp');
    const servers = config.get<any[]>('servers', []);
    
    return servers.map(server => {
      if (server.transport === 'stdio') {
        return new vscode.McpStdioServerDefinition(
          server.name,
          server.command,
          server.args || [],
          server.env || {},
          server.version
        );
      } else {
        return new vscode.McpHttpServerDefinition(
          server.name,
          vscode.Uri.parse(server.url),
          server.headers || {},
          server.version
        );
      }
    });
  }
}

class MCPViewProvider implements vscode.WebviewViewProvider {
  constructor(private extensionUri: vscode.Uri) {}
  
  async resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    
    // Send tools to webview
    await this.updateTools(webviewView.webview);
    
    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'executeTool') {
        await this.executeTool(message.toolName, message.input);
      }
    });
  }
  
  private async updateTools(webview: vscode.Webview) {
    const tools = vscode.lm.tools;
    
    // Group by server (assuming tool names are prefixed)
    const grouped = this.groupToolsByServer(tools);
    
    webview.postMessage({
      type: 'tools',
      tools: grouped
    });
  }
  
  private async executeTool(toolName: string, input: any) {
    try {
      const result = await vscode.lm.invokeTool(
        toolName,
        {
          toolInvocationToken: undefined,
          input: input
        }
      );
      
      // Show result in output panel
      const output = result.content
        .filter(p => p instanceof vscode.LanguageModelTextPart)
        .map(p => (p as vscode.LanguageModelTextPart).value)
        .join('\n');
      
      // Display in webview or output channel
      vscode.window.showInformationMessage(`Tool result: ${output}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Tool execution failed: ${error}`);
    }
  }
  
  private groupToolsByServer(tools: readonly vscode.LanguageModelToolInformation[]) {
    // Implementation to group tools by server name
    // Could parse tool name prefix or use tool tags
    const grouped: { [server: string]: vscode.LanguageModelToolInformation[] } = {};
    
    for (const tool of tools) {
      // Example: tool name is "server-name.tool-name"
      const [server, ...rest] = tool.name.split('.');
      const serverName = server || 'unknown';
      
      if (!grouped[serverName]) {
        grouped[serverName] = [];
      }
      grouped[serverName].push(tool);
    }
    
    return grouped;
  }
}
```

### B. Configuration Example

```json
// settings.json (user or workspace)
{
  "mcp.servers": [
    {
      "name": "Filesystem Tools",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"],
      "env": {}
    },
    {
      "name": "Brave Search",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    },
    {
      "name": "Remote MCP Server",
      "transport": "http",
      "url": "https://mcp-server.example.com",
      "headers": {
        "Authorization": "Bearer token"
      }
    }
  ]
}
```

---

**END OF RESEARCH DOCUMENT**
