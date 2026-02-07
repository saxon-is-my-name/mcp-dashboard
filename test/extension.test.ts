import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Extension Activation', () => {
  it('should activate the extension', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    assert.ok(ext, 'Extension not found');
    await ext!.activate();
    assert.strictEqual(ext!.isActive, true, 'Extension did not activate');
  });
});

describe('MCP Panel Command', () => {
  it('should register the mcp.showPanel command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('mcp.showPanel'), 'mcp.showPanel command not registered');
  });
});
