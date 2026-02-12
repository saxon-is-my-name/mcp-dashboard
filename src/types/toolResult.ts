/**
 * Type definitions for MCP tool execution results
 */

/**
 * Successful tool execution result
 */
export interface ToolResultSuccess {
	success: true;
	data: unknown;
	toolName: string;
	executionTime?: number;
}

/**
 * Failed tool execution result
 */
export interface ToolResultError {
	success: false;
	error: string;
	toolName: string;
	executionTime?: number;
}

/**
 * Tool execution result (success or error)
 */
export type ToolResult = ToolResultSuccess | ToolResultError;

/**
 * Message sent to output panel with tool execution result
 */
export interface ToolResultMessage {
	type: 'result';
	server: string;
	command: string;
	output: string; // Formatted JSON string
	result: ToolResult;
	timestamp: string;
}

/**
 * Message sent to output panel when starting execution
 */
export interface ToolLoadingMessage {
	type: 'loading';
	server: string;
	command: string;
}

/**
 * Union of all output panel messages
 */
export type OutputPanelMessage = ToolResultMessage | ToolLoadingMessage;
