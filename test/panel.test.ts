const assert = require('assert');
const { getMockServers, getMockCommands, MCPServer, MCPCommand } = require('../../src/panel.js');

describe('MCP Data Model', function () {
  it('Should create MCP server objects', function () {
    const server = new MCPServer('TestServer', '127.0.0.1', 8080);
    assert.strictEqual(server.name, 'TestServer');
    assert.strictEqual(server.host, '127.0.0.1');
    assert.strictEqual(server.port, 8080);
  });

  it('Should create MCP command objects', function () {
    const command = new MCPCommand('status', 'Get server status');
    assert.strictEqual(command.name, 'status');
    assert.strictEqual(command.description, 'Get server status');
  });

  it('Should return mock data for servers/commands', function () {
    const servers = getMockServers();
    const commands = getMockCommands();
    assert.ok(Array.isArray(servers));
    assert.ok(Array.isArray(commands));
    assert.ok(servers.length > 0);
    assert.ok(commands.length > 0);
    assert.ok(servers[0] instanceof MCPServer);
    assert.ok(commands[0] instanceof MCPCommand);
  });
});
