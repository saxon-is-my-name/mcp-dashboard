# MCP Dashboard VS Code Extension

A VS Code extension for MCP (Model Context Protocol) dashboard integration.

## Features

The MCP Dashboard provides a comprehensive interface for browsing and executing MCP tools:

- **TreeView Navigation**: Tools are organized by server in a collapsible tree view with intuitive icons. Servers are expandable to reveal their available tools.
- **Integrated Filter**: Filter tools by name, description, tags, or server using Ctrl+F (Cmd+F on Mac) when focused on the tree, or click the filter icon. Active filters are shown in the panel description for visibility. Press Escape to clear the filter.
- **Detail Panel**: Select any tool from the tree to view its details, parameters, and description in a dedicated webview panel below.
- **Persistent Selection**: Your selected tool is remembered across VS Code sessions, so you can pick up where you left off.
- **Parameter Input**: Dynamic forms adapt to each tool's parameter schema, supporting strings, numbers, booleans, objects, arrays, and enums.
- **Real-time Execution**: Execute tools directly from the detail panel with automatic parameter validation and result display.

## Development

### Prerequisites

- Node.js >= 18
- VS Code >= 1.70.0

### Installation

```bash
npm install
```

### Building

```bash
npm run compile       # Build TypeScript
npm run watch         # Watch mode for development
```

## Testing

This project uses three different testing approaches for different types of code:

### 1. VS Code Integration Tests

Tests that interact with the VS Code API and extension host. These tests require a display server (X11 or Xvfb) and launch a full VS Code instance.

```bash
npm test
```

- **Framework**: Mocha with `@vscode/test-electron`
- **Location**: `test/*.test.ts`, `test/suite/`
- **Environment**: Requires VS Code and display (uses xvfb-run in container)
- **Use for**: Extension activation, VS Code commands, API integration

### 2. Pure Logic Unit Tests

Fast, isolated tests for business logic that doesn't depend on VS Code APIs or webviews. Can run in any environment without VS Code.

```bash
npm run unit-test
```

- **Framework**: Mocha with ts-node
- **Location**: `test/unit/**/*.test.ts`
- **Environment**: Node.js only, no VS Code required
- **Use for**: Data models, utilities, helper functions

> **Note**: No unit tests exist yet. Place pure logic/unit tests in `test/unit/` as you extract testable business logic.

### 3. React Component UI Tests

Tests for React components used in webview panels. Uses jsdom to simulate a browser environment.

```bash
npx jest
```

- **Framework**: Jest with React Testing Library
- **Location**: `test/**/*.ui.test.tsx`
- **Environment**: jsdom (no VS Code required)
- **Use for**: React components, webview UI logic

### Test Configuration Files

- **`.mocharc.js`**: Mocha configuration for unit tests
- **`jest.config.js`**: Jest configuration for React UI tests
- **`test/suite/index.js`**: Entry point for VS Code integration tests

## License

See LICENSE file for details.
