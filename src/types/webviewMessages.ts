import { ParsedMCPTool } from './mcpTool';

/**
 * Messages sent from webview to extension
 */
export type WebviewToExtensionMessage =
	| {
			type: 'executeCommand';
			tool: ParsedMCPTool;
			parameters?: Record<string, unknown>;
	  }
	| {
			type: 'focusTree';
	  };

/**
 * Messages sent from extension to webview
 */
export type ExtensionToWebviewMessage =
	| { type: 'toolsUpdate'; tools: ParsedMCPTool[] }
	| { type: 'error'; message: string }
	| { type: 'toolDetailUpdate'; tool?: ParsedMCPTool; loading?: boolean };
