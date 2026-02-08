# UI Architecture

## Overview

The MCP Dashboard extension uses a **TreeView + Webview** architecture to provide a clean separation between browsing tools (tree navigation) and viewing tool details (webview panel). This architecture enables efficient tool discovery, detailed parameter input, and seamless state management across VS Code sessions.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │          ToolCoordinationService                 │  │
│  │  - Manages selected tool state                   │  │
│  │  - Persists selection to workspace state         │  │
│  │  - Notifies listeners of selection changes       │  │
│  └──────────────────────────────────────────────────┘  │
│              │                           │              │
│              ▼                           ▼              │
│  ┌─────────────────────┐   ┌────────────────────────┐  │
│  │  ToolTreeProvider   │   │  ToolDetailProvider    │  │
│  │  - Displays servers │   │  - Shows tool details  │  │
│  │  - Lists tools      │   │  - Renders parameters  │  │
│  │  - Handles clicks   │   │  - Executes tools      │  │
│  └─────────────────────┘   └────────────────────────┘  │
│              │                           │              │
└──────────────┼───────────────────────────┼──────────────┘
               │                           │
               ▼                           ▼
      ┌────────────────┐        ┌──────────────────┐
      │   TreeView     │        │   Webview Panel  │
      │   (VS Code)    │        │   (React)        │
      └────────────────┘        └──────────────────┘
```

## Components

### ToolTreeProvider

**Location**: `src/providers/ToolTreeProvider.ts`

**Responsibilities**:
- Implements `vscode.TreeDataProvider` interface
- Organizes tools into a two-level hierarchy (servers → tools)
- Displays server nodes with server icon (`$(server)`) and tooltips
- Displays tool nodes with tools icon (`$(tools)`) and tooltips containing tool name and description
- Registers `mcp.selectTool` command for tool selection
- Triggers tree refresh when tool data changes

**Tree Structure**:
```
📦 Server 1
  └─ 🔧 Tool 1
  └─ 🔧 Tool 2
📦 Server 2
  └─ 🔧 Tool 3
```

### ToolDetailProvider

**Location**: `src/providers/ToolDetailProvider.ts`

**Responsibilities**:
- Implements `vscode.WebviewViewProvider` interface
- Renders tool details in a webview panel
- Generates HTML from templates (`src/templates/toolDetailTemplate.ts`)
- Listens for selection changes from coordination service
- Handles tool execution requests from webview
- Manages output panel for displaying execution results
- Handles webview message passing

**Webview States**:
- **Empty**: "Select a tool from the tree to view details"
- **Loading**: "Loading tool details..."
- **Error**: Shows error message if tool fetch fails
- **Loaded**: Displays tool name, description, server, parameters, and execute button

### ToolCoordinationService

**Location**: `src/services/ToolCoordinationService.ts`

**Responsibilities**:
- Central state management for selected tool
- Provides `selectTool(tool)` and `getSelectedTool()` methods
- Fires change events via `onSelectionChange` event emitter
- Persists selected tool to VS Code workspace state
- Restores selection on extension activation
- Singleton pattern ensures consistent state across providers

**State Persistence**:
```typescript
// Stored in workspace state
{
  "mcp.selectedTool": {
    "name": "tool_name",
    "server": "server_name",
    "fullName": "server_name_tool_name",
    "description": "...",
    "inputSchema": {...}
  }
}
```

## Message Flow

### Tool Selection Flow

1. User clicks tool in TreeView
2. `mcp.selectTool` command is triggered with tool data
3. Command handler calls `coordinationService.selectTool(tool)`
4. CoordinationService:
   - Updates internal state
   - Persists to workspace state
   - Fires `onSelectionChange` event
5. ToolDetailProvider receives event
6. ToolDetailProvider sends tool data to webview
7. React component receives message and updates UI

### Tool Execution Flow

1. User fills parameters and clicks "Execute" button in webview
2. Webview sends `executeCommand` message to extension
3. ToolDetailProvider receives message
4. Provider calls `vscode.lm.invokeTool()` with parameters
5. Result is formatted and sent to output panel webview
6. Output panel displays formatted result

## React Components

### ToolDetailView

**Location**: `src/ui/components/ToolDetailView.tsx`

**Props**:
- `tool?: ParsedMCPTool` - The tool to display
- `loading?: boolean` - Whether tool details are being fetched
- `error?: string` - Error message if tool fetch failed

**Features**:
- Dynamic parameter inputs based on JSON Schema
- Type-specific input rendering (string, number, boolean, object, array, enum)
- Client-side validation for required fields
- Real-time validation error display
- Clear validation errors on input change

**Parameter Types Supported**:
- `string` - Text input
- `number/integer` - Numeric input with validation
- `boolean` - Checkbox
- `object` - JSON textarea with syntax validation
- `array` - JSON textarea with syntax validation
- `enum` - Dropdown select

## Persistence Mechanism

### Workspace State

The extension uses VS Code's workspace state API to persist the selected tool:

```typescript
// Save
await context.workspaceState.update('mcp.selectedTool', tool);

// Restore
const savedTool = context.workspaceState.get<ParsedMCPTool>('mcp.selectedTool');
```

### Session Restoration

On extension activation:
1. CoordinationService checks workspace state for saved tool
2. If found, restores selection and notifies listeners
3. ToolDetailProvider automatically displays restored tool
4. TreeView highlights the restored selection

## Testing Strategy

### Integration Tests
- `test/integration/tree-detail-coordination.test.ts` - Tests coordination between components
- `test/providers/ToolTreeProvider.test.ts` - Tests tree provider logic
- `test/providers/ToolDetailProvider.test.ts` - Tests detail provider logic
- `test/services/ToolCoordinationService.test.ts` - Tests state management

### UI Tests
- `test/ui/ToolDetailView.ui.test.tsx` - Tests React component rendering and validation
- Uses Jest + React Testing Library with jsdom

## Extension Points

### Adding New Tool Types

To add support for new tool types:

1. Update `ParsedMCPTool` interface in `src/types/mcpTool.ts`
2. Update `ParameterInputs` component in `src/ui/components/ToolDetailView.tsx`
3. Add validation logic if needed
4. Add tests for new type

### Custom Tree Actions

To add context menu actions:

1. Register command in `extension.ts`
2. Update `contextValue` in `ServerTreeItem` or `ToolTreeItem`
3. Add menu contribution in `package.json`

### Output Formatting

To customize output display:

1. Modify `formatToolResult()` in `src/providers/ToolDetailProvider.ts`
2. Update React component in `src/outputPanel.tsx`

## Performance Considerations

- **Lazy Loading**: Tools are only fetched when needed
- **Efficient Updates**: Tree only refreshes on data changes
- **Webview Reuse**: Webview panels are reused rather than recreated
- **State Caching**: Selected tool is cached to avoid redundant fetches
- **Event Throttling**: Rapid selection changes are handled gracefully

## Future Enhancements

Potential improvements:
- Search/filter functionality in tree view
- Tool favorites/bookmarks
- Execution history
- Parameter templates/presets
- Batch tool execution
- Export/import configurations
