/**
 * Messages sent from webview to extension
 */
export type WebviewToExtensionMessage = 
	| { type: 'executeCommand'; server: string; command: string; parameters?: any }
	| { type: 'requestTools' };

/**
 * Messages sent from extension to webview
 */
export type ExtensionToWebviewMessage = 
	| { type: 'toolsUpdate'; tools: any }
	| { type: 'error'; message: string };
