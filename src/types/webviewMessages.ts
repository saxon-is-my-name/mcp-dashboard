import { ParsedMCPTool } from './mcpTool';
import { OutputPanelMessage } from './toolResult';

/**
 * Messages sent from webview to extension (discriminated union on 'type')
 */
export type WebviewToExtensionMessage = ExecuteCommandMessage | FocusTreeMessage;

/**
 * Execute a tool with parameters
 */
export interface ExecuteCommandMessage {
	type: 'executeCommand';
	tool: ParsedMCPTool;
	parameters?: Record<string, unknown>;
}

/**
 * Focus the tree view
 */
export interface FocusTreeMessage {
	type: 'focusTree';
}

/**
 * Messages sent from extension to tool detail webview
 */
export type ToolDetailMessage = ToolDetailUpdateMessage | ExecutionStateUpdateMessage;

/**
 * Update the tool detail view
 */
export interface ToolDetailUpdateMessage {
	type: 'toolDetailUpdate';
	tool?: ParsedMCPTool;
}

/**
 * Update execution state
 */
export interface ExecutionStateUpdateMessage {
	type: 'executionStateUpdate';
	executing: boolean;
}

/**
 * All messages sent from extension to any webview
 * (combines tool detail and output panel messages)
 */
export type ExtensionToWebviewMessage = ToolDetailMessage | OutputPanelMessage;
