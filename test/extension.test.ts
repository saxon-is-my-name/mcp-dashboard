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
  let disposables: vscode.Disposable[] = [];

  afterEach(() => {
    disposables.forEach(d => d.dispose());
    disposables = [];
    
    // Close any open panels
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    if (ext && ext.isActive) {
      const extExports = ext.exports;
      if (extExports && extExports.getCurrentPanel) {
        const panel = extExports.getCurrentPanel();
        if (panel) {
          panel.dispose();
        }
      }
    }
  });

  it('should register the mcp.showPanel command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('mcp.showPanel'), 'mcp.showPanel command not registered');
  });

  it('should create a webview panel when command is executed', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    assert.ok(ext, 'Extension not found');
    
    // Execute the command
    await vscode.commands.executeCommand('mcp.showPanel');
    
    // Get the panel from extension exports
    const extExports = ext!.exports;
    assert.ok(extExports, 'Extension exports not found');
    assert.ok(extExports.getCurrentPanel, 'getCurrentPanel function not exported');
    
    const panel = extExports.getCurrentPanel();
    assert.ok(panel, 'Panel was not created');
  });

  it('should set correct panel properties', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await vscode.commands.executeCommand('mcp.showPanel');
    
    const panel = ext!.exports.getCurrentPanel();
    assert.ok(panel, 'Panel not created');
    assert.strictEqual(panel.viewType, 'mcpPanel', 'Panel viewType is incorrect');
    assert.strictEqual(panel.title, 'MCP Dashboard', 'Panel title is incorrect');
  });

  it('should reuse existing panel instead of creating multiple panels', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    
    // Execute command first time
    await vscode.commands.executeCommand('mcp.showPanel');
    const panel1 = ext!.exports.getCurrentPanel();
    
    // Execute command second time
    await vscode.commands.executeCommand('mcp.showPanel');
    const panel2 = ext!.exports.getCurrentPanel();
    
    // Should be the same panel instance
    assert.strictEqual(panel1, panel2, 'Multiple panels created instead of reusing');
  });
});

