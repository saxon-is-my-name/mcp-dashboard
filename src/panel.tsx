import * as React from 'react';

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

	return (
		<div>
			<div>
				{servers.map(server => (
					<button key={server.name} onClick={() => setSelectedServer(server.name)}>
						{server.name}
					</button>
				))}
			</div>
			<div>
				{commands[selectedServer]?.map(cmd => (
					<button
						key={cmd.name}
						className={selectedCommand === cmd.name ? 'selected' : ''}
						onClick={() => setSelectedCommand(cmd.name)}
					>
						{cmd.name}
					</button>
				))}
			</div>
		</div>
	);
};
export default MCPPanel;

// Data model for MCP Server (for panel.tsx UI logic)
// ...existing code...
