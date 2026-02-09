import { ParsedMCPTool } from './mcpTool';

/**
 * Messages sent from webview to extension
 */
export type WebviewToExtensionMessage = {
	type: 'executeCommand';
	server: string;
	command: string;
	parameters?: any;
};

/**
 * Messages sent from extension to webview
 */
export type ExtensionToWebviewMessage =
	| { type: 'toolsUpdate'; tools: any }
	| { type: 'error'; message: string }
	| { type: 'toolDetailUpdate'; tool?: ParsedMCPTool; loading?: boolean };
