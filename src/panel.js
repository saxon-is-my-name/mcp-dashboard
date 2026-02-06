// Data model for MCP Server
class MCPServer {
  constructor(name, host, port) {
    this.name = name;
    this.host = host;
    this.port = port;
  }
}

// Data model for MCP Command
class MCPCommand {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }
}

// Mock data for servers
function getMockServers() {
  return [
    new MCPServer('Alpha', '192.168.1.10', 9000),
    new MCPServer('Beta', '192.168.1.11', 9001)
  ];
}

// Mock data for commands
function getMockCommands() {
  return [
    new MCPCommand('start', 'Start the server'),
    new MCPCommand('stop', 'Stop the server'),
    new MCPCommand('status', 'Get server status')
  ];
}

module.exports = {
  MCPServer,
  MCPCommand,
  getMockServers,
  getMockCommands
};
