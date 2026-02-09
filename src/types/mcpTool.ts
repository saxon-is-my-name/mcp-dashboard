/**
 * Type definitions for MCP tools from vscode.lm API
 */
import { ParameterSchema } from './parameterSchema';

/**
 * Represents an MCP tool from vscode.lm.tools
 */
export interface MCPTool {
	/** Full tool name from vscode.lm (e.g., "server_toolName") */
	name: string;
	/** Tool description */
	description: string;
	/** Input schema for the tool */
	inputSchema?: object;
	/** Tags associated with the tool */
	tags?: readonly string[];
}

/**
 * Represents a parsed tool with server information extracted
 */
export interface ParsedMCPTool {
	/** Tool name without server prefix */
	name: string;
	/** Tool description */
	description: string;
	/** Server name this tool belongs to */
	server: string;
	/** Full original name from vscode.lm */
	fullName: string;
	/** Input schema for the tool */
	inputSchema?: ParameterSchema;
	/** Tags associated with the tool */
	tags?: readonly string[];
}

/**
 * Tools grouped by server name
 */
export interface GroupedMCPTools {
	[serverName: string]: ParsedMCPTool[];
}

/**
 * Message sent to webview with tool data
 */
export interface ToolsUpdateMessage {
	type: 'toolsUpdate';
	tools: GroupedMCPTools;
}
