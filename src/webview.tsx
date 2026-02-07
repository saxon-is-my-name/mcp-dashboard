import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import MCPPanel from './panel';

// Type definitions for tool data from extension
interface ParsedMCPTool {
	name: string;
	description: string;
	server: string;
	fullName: string;
}

interface GroupedMCPTools {
	[serverName: string]: ParsedMCPTool[];
}

interface ToolsUpdateMessage {
	type: 'toolsUpdate';
	tools: GroupedMCPTools;
}

// Declare VS Code API
declare const acquireVsCodeApi: () => {
	postMessage: (message: any) => void;
};

// Main App component that handles tool data
const App: React.FC = () => {
	const [tools, setTools] = React.useState<GroupedMCPTools>({});
	const [isLoading, setIsLoading] = React.useState(true);

	React.useEffect(() => {
		// Listen for messages from extension
		const messageListener = (event: MessageEvent) => {
			const message = event.data as ToolsUpdateMessage;
			if (message.type === 'toolsUpdate') {
				setTools(message.tools);
				setIsLoading(false);
			}
		};

		window.addEventListener('message', messageListener);

		return () => {
			window.removeEventListener('message', messageListener);
		};
	}, []);

	// Convert grouped tools to format expected by MCPPanel
	const servers = Object.keys(tools).map(serverName => ({
		name: serverName,
		host: 'N/A',
		port: 0
	}));

	const commands: { [serverName: string]: { name: string; description: string }[] } = {};
	for (const [serverName, toolList] of Object.entries(tools)) {
		commands[serverName] = toolList.map(tool => ({
			name: tool.name,
			description: tool.description
		}));
	}

	if (isLoading) {
		return <div style={{ padding: '10px' }}>Loading MCP tools...</div>;
	}

	if (servers.length === 0) {
		return <div style={{ padding: '10px' }}>No MCP tools available. Configure MCP servers in VS Code settings.</div>;
	}

	return <MCPPanel servers={servers} commands={commands} />;
};

// Wait for DOM to be ready
const rootElement = document.getElementById('root');
if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}
