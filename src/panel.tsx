import * as React from 'react';

// Declare VS Code API type
declare const acquireVsCodeApi: () => {
	postMessage: (message: any) => void;
};

interface MCPServer {
	name: string;
	host: string;
	port: number;
}

interface MCPCommand {
	name: string;
	description: string;
}

interface MCPPanelProps {
	servers: MCPServer[];
	commands: { [serverName: string]: MCPCommand[] };
}

const MCPPanel: React.FC<MCPPanelProps> = ({ servers, commands }) => {
	const [selectedServer, setSelectedServer] = React.useState<string>(servers[0]?.name || '');
	const [selectedCommand, setSelectedCommand] = React.useState<string>('');
	const vscode = React.useMemo(() => acquireVsCodeApi(), []);

	const handleServerChange = (serverName: string) => {
		setSelectedServer(serverName);
		setSelectedCommand(''); // Clear command selection when server changes
	};

	const handleExecute = () => {
		if (selectedCommand) {
			vscode.postMessage({
				type: 'executeCommand',
				server: selectedServer,
				command: selectedCommand
			});
		}
	};

	return (
		<div>
			<div>
				{servers.map(server => (
					<button 
						key={server.name} 
						data-testid={`server-${server.name}`}
						className={selectedServer === server.name ? 'selected' : ''}
						onClick={() => handleServerChange(server.name)}
					>
						<div>{server.name}</div>
						<div>{server.host}:{server.port}</div>
					</button>
				))}
			</div>
			<div data-testid="command-list">
				{commands[selectedServer]?.map(cmd => (
					<button
						key={cmd.name}
						data-testid={`command-${cmd.name}`}
						className={selectedCommand === cmd.name ? 'selected' : ''}
						onClick={() => setSelectedCommand(cmd.name)}
					>
						<div>{cmd.name}</div>
						<div>{cmd.description}</div>
					</button>
				))}
			</div>
			<button 
				data-testid="execute-button"
				disabled={!selectedCommand}
				onClick={handleExecute}
			>
				Execute
			</button>
		</div>
	);
};
export default MCPPanel;

// Data model for MCP Server (for panel.tsx UI logic)
// ...existing code...
