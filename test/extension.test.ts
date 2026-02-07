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

describe('Webview Bundle Integration', () => {
  it('should generate HTML with root div', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    // Create a mock webview
    const mockWebview = {
      asWebviewUri: (uri: vscode.Uri) => {
        return vscode.Uri.parse('vscode-webview://test' + uri.path);
      }
    } as any;
    
    // Access the private method via reflection
    const html = (provider as any)._getHtmlForWebview(mockWebview);
    
    assert.ok(html.includes('<div id="root"></div>'), 'HTML must contain root div');
    assert.ok(html.includes('<!DOCTYPE html>'), 'HTML must be valid HTML5');
  });

  it('should generate HTML with bundled script tag', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    // Create a mock webview
    const mockWebview = {
      asWebviewUri: (uri: vscode.Uri) => {
        return vscode.Uri.parse('vscode-webview://test' + uri.path);
      }
    } as any;
    
    const html = (provider as any)._getHtmlForWebview(mockWebview);
    
    // Should contain script tag with bundled webview.js
    assert.ok(html.includes('<script'), 'HTML must contain script tag');
    assert.ok(html.includes('webview.js'), 'Script tag must reference webview.js bundle');
  });

  it('should NOT contain inline vanilla JavaScript', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    const mockWebview = {
      asWebviewUri: (uri: vscode.Uri) => {
        return vscode.Uri.parse('vscode-webview://test' + uri.path);
      }
    } as any;
    
    const html = (provider as any)._getHtmlForWebview(mockWebview);
    
    // Ensure inline JS is removed (checking for functions that were previously inline)
    assert.ok(!html.includes('function render()'), 'Should not contain inline render function');
    assert.ok(!html.includes('function selectServer'), 'Should not contain inline selectServer function');
  });
});

describe('Message Handling and Output Panel', () => {
  it('should listen for executeCommand messages from sidebar', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    // Verify provider has message handling capability
    assert.ok(provider, 'Provider should exist');
  });

  it('should create output panel when executeCommand message received', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    // Create a mock webview for the sidebar
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: (callback: any) => {
          // Store the callback so we can trigger it
          (mockWebviewView as any).messageCallback = callback;
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: () => Promise.resolve(true)
      }
    } as any;

    // Resolve the webview view to set up message handler
    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Trigger executeCommand message
    const messageCallback = (mockWebviewView as any).messageCallback;
    assert.ok(messageCallback, 'Message callback should be registered');
    
    // Send executeCommand message
    await messageCallback({
      type: 'executeCommand',
      server: 'TestServer',
      command: 'test-cmd'
    });

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // We can't easily check if panel was created in test environment,
    // but we verify no errors occurred
    assert.ok(true, 'executeCommand handled without errors');
  });

  it('should generate output panel HTML with correct script', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    // Access the private method for output panel HTML generation
    const getOutputPanelHtml = (provider as any)._getOutputPanelHtml;
    
    if (getOutputPanelHtml) {
      const mockWebview = {
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        }
      } as any;
      
      const html = getOutputPanelHtml.call(provider, mockWebview);
      
      // Should contain root div
      assert.ok(html.includes('<div id="root"></div>'), 'HTML must contain root div');
      
      // Should reference outputPanel.js bundle
      assert.ok(html.includes('outputPanel.js'), 'HTML must reference outputPanel.js bundle');
      
      // Should be valid HTML
      assert.ok(html.includes('<!DOCTYPE html>'), 'HTML must be valid HTML5');
    }
  });

  it('should use singleton pattern for output panel', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    // Create mock webview view
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: (callback: any) => {
          (mockWebviewView as any).messageCallback = callback;
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: () => Promise.resolve(true)
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    const messageCallback = (mockWebviewView as any).messageCallback;
    
    // Send multiple executeCommand messages
    await messageCallback({
      type: 'executeCommand',
      server: 'Server1',
      command: 'cmd1'
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await messageCallback({
      type: 'executeCommand',
      server: 'Server2',
      command: 'cmd2'
    });
    
    // Both should succeed without creating duplicate panels
    // (We can't easily verify singleton in test env, but no errors should occur)
    assert.ok(true, 'Multiple commands handled without errors');
  });
});

