# UI Architecture

## Overview

The MCP Dashboard extension uses a **TreeView + Webview** architecture to provide a clean separation between browsing tools (tree navigation) and viewing tool details (webview panel). This architecture enables efficient tool discovery, detailed parameter input, and seamless state management across VS Code sessions.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │          TIM (Tool Interaction Manager)          │   │
│  │  - Manages selected tool state                   │   │
│  │  - Persists selection to workspace state         │   │
│  │  - Notifies listeners of selection changes       │   │
│  │  - Uses Toolbox for tool execution               │   │
│  └──────────────────────────────────────────────────┘   │
│              │                           │              │
│              ▼                           ▼              │
│  ┌─────────────────────┐   ┌────────────────────────┐   │
│  │  ToolTreeProvider   │   │  ToolDetailProvider    │   │
│  │  - Displays servers │   │  - Shows tool details  │   │
│  │  - Lists tools      │   │  - Renders parameters  │   │
│  │  - Handles clicks   │   │  - Executes tools      │   │
│  └─────────────────────┘   └────────────────────────┘   │
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
- Provides integrated filter/search functionality with keyboard shortcuts (Ctrl+F to filter, Escape to clear)
- Updates tree view description to show active filter state (`Filter: "query"`)
- Manages `mcp.filterActive` context key for conditional UI elements
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
- Listens for selection changes from TIM
- Handles tool execution requests from webview
- Manages output panel for displaying execution results
- Handles webview message passing

**Webview States**:

- **Empty**: "Select a tool from the tree to view details"
- **Loading**: "Loading tool details..."
- **Error**: Shows error message if tool fetch fails
- **Loaded**: Displays tool name, description, server, parameters, and execute button

### TIM (Tool Interaction Manager)

**Location**: `src/services/TIM.ts`

**Responsibilities**:

- Central state management for selected tool
- Manages tool interaction through integrated Toolbox
- Provides `selectTool(tool)` and `getSelectedTool()` methods
- Provides `useTool(tool, parameters)` for tool execution
- Provides `getTools()` for tool discovery and grouping
- Fires change events via `onSelectionChanged` event emitter
- Persists selected tool to VS Code workspace state
- Restores selection on extension activation
- Parses tool names to extract server and tool identifiers
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
3. Command handler calls `tim.selectTool(tool)`
4. TIM:
   - Updates internal state
   - Sets `mcp.toolSelected` context key
   - Persists to workspace state
   - Fires `onSelectionChanged` event
5. ToolDetailProvider receives event
6. ToolDetailProvider sends tool data to webview
7. React component receives message and updates UI

### Tool Execution Flow

1. User fills parameters and clicks "Execute" button in webview
2. Webview sends `executeCommand` message to extension
3. ToolDetailProvider receives message
4. Provider calls `tim.useTool(tool, parameters)`
5. TIM delegates to Toolbox which calls `vscode.lm.invokeTool()`
6. Result is formatted and sent to output panel webview
7. Output panel displays formatted result

### Tool Search Flow

1. User activates filter:
   - Press Ctrl+F (Cmd+F on Mac) when tree view is focused, OR
   - Click filter icon in tree view title bar
2. `mcp.findTools` command is triggered
3. VS Code shows input box with current filter pre-filled
4. User enters filter text (or clears it with empty string) and confirms
5. Command handler calls `treeProvider.setSearchQuery(query)`
6. TreeProvider:
   - Filters tools based on query (matches tool name, description, server name, fullName, and tags)
   - Updates tree view description to show active filter: `Filter: "query"`
   - Sets context `mcp.filterActive` to true/false
   - Case-insensitive matching
   - Shows only servers with matching tools
7. Tree view automatically refreshes with filtered results
8. User can:
   - Press Escape to clear filter (when tree is focused)
   - Click clear filter icon (only visible when filter is active)
   - Click filter icon again to edit existing filter

**Filter Display**:

- Active filter shown in tree view description: `Filter: "database"`
- No description shown when filter is cleared
- Clear filter button only appears when filter is active (conditional menu using `mcp.filterActive` context)
- Filter persists across tree refreshes
- Keyboard shortcut (Ctrl+F / Cmd+F) makes it feel like native find functionality

**Filter Matching**:

- Tool name: `query` matches tools with "query" in name
- Description: `SQL` matches tools with "SQL" in description
- Tags: `http` matches tools with "http" tag
- Server name: `api` matches all tools from "api" server
- Full name: `database_backup` matches specific tool

**Technical Note**: VS Code's TreeView API doesn't support embedding custom input boxes directly in the tree panel (like the find widget). The current implementation uses `showInputBox` with keyboard shortcuts (Ctrl+F, Escape) to provide a find-like experience.

## React Components

### File Organization

**Component Structure**:

```
src/ui/
├── components/          # Pure React components
│   ├── ToolDetailView.tsx
│   └── OutputPanel.tsx
└── entries/            # Webpack entry points (state + message handling)
    ├── toolDetailEntry.tsx
    └── outputPanelEntry.tsx
```

**Pattern**: Entry files manage state and message handling, then pass props to pure components. This separates concerns and makes components more testable.

### ToolDetailView

**Location**: `src/ui/components/ToolDetailView.tsx`

**Props**:

- `tool?: ParsedMCPTool` - The tool to display
- `executing?: boolean` - Whether tool is currently executing
- `error?: string` - Error message if tool fetch failed

**Features**:

- Dynamic parameter inputs based on JSON Schema
- Type-specific input rendering (string, number, boolean, object, array, enum)
- Client-side validation for required fields
- Real-time validation error display
- Clear validation errors on input change
- Auto-focus first input field when tool loads
- Keyboard navigation (Shift+Tab to focus tree)

**Parameter Types Supported**:

- `string` - Text input
- `number/integer` - Numeric input with validation
- `boolean` - Checkbox
- `object` - JSON textarea with syntax validation
- `array` - JSON textarea with syntax validation
- `enum` - Dropdown select

### OutputPanel

**Location**: `src/ui/components/OutputPanel.tsx`

**Features**:

- Displays loading state during tool execution
- Shows formatted execution results with success/error styling
- Displays execution time when available
- Formats output in readable format

### Webview Entry Points

**ToolDetail Entry** (`src/ui/entries/toolDetailEntry.tsx`):

- Listens for `toolDetailUpdate` and `executionStateUpdate` messages
- Manages tool and executing state
- Renders `ToolDetailView` with current state

**OutputPanel Entry** (`src/ui/entries/outputPanelEntry.tsx`):

- Listens for `loading` and `result` messages from extension
- Manages output state (type, server, command, output, result, timestamp)
- Renders `OutputPanel` with current state

## Persistence Mechanism

### Workspace State

The extension uses VS Code's workspace state API to persist the selected tool:

```typescript
// Save (in TIM)
await context.workspaceState.update('mcp.selectedTool', tool);

// Restore (in TIM constructor)
const savedTool = context.workspaceState.get<ParsedMCPTool>('mcp.selectedTool');
```

### Session Restoration

On extension activation:

1. TIM checks workspace state for saved tool in constructor
2. If found, restores selection internally
3. ToolDetailProvider can query TIM for restored selection
4. TreeView highlights the restored selection

## Testing Strategy

### Integration Tests

- `test/integration/tree-detail-coordination.test.ts` - Tests coordination between components
- `test/integration/providers/ToolTreeProvider.test.ts` - Tests tree provider logic
- `test/integration/providers/ToolDetailProvider.test.ts` - Tests detail provider logic
- `test/integration/providers/OutputPanelProvider.test.ts` - Tests output panel provider logic
- `test/integration/services/Tim.test.ts` - Tests TIM state management and tool operations
- `test/integration/webview-messages.test.ts` - Tests message passing between extension and webviews

### UI Tests

- `test/unit/ToolDetailView.ui.test.tsx` - Tests ToolDetailView component rendering and validation
- `test/unit/outputPanel.ui.test.tsx` - Tests OutputPanel component rendering
- `test/unit/toolDetailView.focus.ui.test.tsx` - Tests focus and keyboard navigation
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

1. Modify `formatToolResult()` in `src/providers/OutputPanelProvider.ts`
2. Update React component in `src/ui/components/OutputPanel.tsx`
3. Update message handling in `src/ui/entries/outputPanelEntry.tsx` if needed

## Performance Considerations

- **Lazy Loading**: Tools are only fetched when needed
- **Efficient Updates**: Tree only refreshes on data changes
- **Webview Reuse**: Webview panels are reused rather than recreated
- **State Caching**: TIM caches selected tool to avoid redundant fetches
- **Event Throttling**: Rapid selection changes are handled gracefully
- **Toolbox Integration**: TIM delegates tool operations to Toolbox for efficient execution

## Future Enhancements

Potential improvements:

- Tool favorites/bookmarks
- Execution history
- Parameter templates/presets
- Batch tool execution
- Export/import configurations
