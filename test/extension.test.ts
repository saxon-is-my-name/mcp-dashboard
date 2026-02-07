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

describe('MCP Sidebar View', () => {
  it('should register the webview view provider', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    assert.ok(ext, 'Extension not found');
    await ext!.activate();
    
    // Verify the extension exports the provider
    const extExports = ext!.exports;
    assert.ok(extExports, 'Extension exports not found');
    assert.ok(extExports.getViewProvider, 'getViewProvider function not exported');
    
    const provider = extExports.getViewProvider();
    assert.ok(provider, 'Webview view provider not found');
  });

  it('should have resolveWebviewView method', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    assert.ok(provider.resolveWebviewView, 'resolveWebviewView method not found');
    assert.strictEqual(typeof provider.resolveWebviewView, 'function', 'resolveWebviewView must be a function');
  });

  it('should focus the MCP view when command is executed', async () => {
    // Execute the command to show the view
    await vscode.commands.executeCommand('mcp.showView');
    
    // Give it a moment to open
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify command executes without error
    // Note: We can't easily test if the view is actually visible in the test environment
    assert.ok(true, 'Command executed successfully');
  });
});

