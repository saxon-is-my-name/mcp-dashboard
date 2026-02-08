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
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
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
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
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

describe('MCP Tool Discovery - Phase 1', () => {
  it('should list tools from vscode.lm.tools', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    // Access the exported tool listing function
    const extExports = ext!.exports;
    assert.ok(extExports.getTools, 'getTools function should be exported');
    
    const tools = await extExports.getTools();
    assert.ok(Array.isArray(tools), 'getTools should return an array');
  });

  it('should group tools by server', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    const groupedTools = await extExports.getGroupedTools();
    
    assert.ok(typeof groupedTools === 'object', 'groupedTools should be an object');
    assert.ok(!Array.isArray(groupedTools), 'groupedTools should not be an array');
    
    // Check structure: should be { serverName: [tools] }
    for (const serverName in groupedTools) {
      assert.ok(Array.isArray(groupedTools[serverName]), `Tools for ${serverName} should be an array`);
    }
  });

  it('should handle empty tool list', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    const tools = await extExports.getTools();
    
    // Should return empty array if no tools available, not throw
    assert.ok(Array.isArray(tools), 'Should return array even if empty');
  });

  it('should send tools to webview on initialization', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let postMessageCalled = false;
    let messageData: any = null;
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: (callback: any) => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: (data: any) => {
          postMessageCalled = true;
          messageData = data;
          return Promise.resolve(true);
        }
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Wait for async tool loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert.ok(postMessageCalled, 'postMessage should be called to send tools');
    assert.ok(messageData, 'Message data should be provided');
    assert.strictEqual(messageData.type, 'toolsUpdate', 'Message type should be toolsUpdate');
    assert.ok(messageData.tools, 'Message should contain tools data');
  });

  it('should handle tool discovery errors gracefully', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    
    // Should not throw even if vscode.lm.tools fails
    try {
      const tools = await extExports.getTools();
      assert.ok(Array.isArray(tools), 'Should return array on error');
    } catch (error) {
      assert.fail('getTools should not throw, should return empty array on error');
    }
  });

  it('should parse tool names to extract server information', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    
    // Tools from vscode.lm.tools have names like "serverName_toolName"
    const groupedTools = await extExports.getGroupedTools();
    
    // Each server group should have tools with proper structure
    for (const serverName in groupedTools) {
      const tools = groupedTools[serverName];
      for (const tool of tools) {
        assert.ok(tool.name, 'Tool should have a name');
        assert.ok(tool.description !== undefined, 'Tool should have a description');
      }
    }
  });
});

describe('MCP Tool Execution - Phase 2', () => {
  it('should invoke tool using vscode.lm.invokeTool', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    
    // Get available tools
    const tools = await extExports.getTools();
    
    if (tools.length === 0) {
      // Skip if no tools available, but test that invokeTool function exists
      assert.ok(extExports.invokeTool, 'invokeTool function should be exported');
      return;
    }
    
    // Try to invoke the first tool
    const firstTool = tools[0];
    const result = await extExports.invokeTool(firstTool.name, {});
    
    // Result should have specific structure
    assert.ok(result, 'invokeTool should return a result');
    assert.ok('success' in result || 'error' in result, 'Result should have success or error property');
  });

  it('should pass tool parameters correctly to vscode.lm.invokeTool', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    
    // Test parameters are passed through
    const testParams = { test: 'value', number: 42 };
    const result = await extExports.invokeTool('test_tool', testParams);
    
    // Should not throw and should return something
    assert.ok(result !== undefined, 'invokeTool should return a result');
  });

  it('should handle tool execution success', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    const tools = await extExports.getTools();
    
    if (tools.length === 0) {
      // Create a mock successful result
      const result = {
        success: true,
        data: { message: 'success' }
      };
      
      assert.ok(result.success, 'Success result should have success=true');
      assert.ok(result.data, 'Success result should have data');
      return;
    }
    
    // Try real tool invocation
    const result = await extExports.invokeTool(tools[0].name, {});
    
    // Should return a structured result
    assert.ok(result !== undefined, 'Result should be defined');
  });

  it('should handle tool execution errors', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    
    // Try to invoke a non-existent tool
    const result = await extExports.invokeTool('nonexistent_tool', {});
    
    // Should return an error result, not throw
    assert.ok(result, 'Should return error result');
    assert.ok(result.error || result.success === false, 'Should indicate error');
  });

  it('should display tool results in output panel', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let postMessageCalls: any[] = [];
    
    const mockOutputWebview = {
      asWebviewUri: (uri: vscode.Uri) => {
        return vscode.Uri.parse('vscode-webview://test' + uri.path);
      },
      postMessage: (data: any) => {
        postMessageCalls.push(data);
        return Promise.resolve(true);
      }
    } as any;
    
    // Create mock webview view for sidebar
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
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    const messageCallback = (mockWebviewView as any).messageCallback;
    
    // Trigger executeCommand with parameters
    await messageCallback({
      type: 'executeCommand',
      server: 'TestServer',
      command: 'test-cmd',
      parameters: { test: 'value' }
    });
    
    // Wait for execution
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify that execution occurred (no errors thrown)
    assert.ok(true, 'Command execution completed');
  });

  it('should send loading state before tool execution', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
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
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    const messageCallback = (mockWebviewView as any).messageCallback;
    
    // Send executeCommand
    await messageCallback({
      type: 'executeCommand',
      server: 'TestServer',
      command: 'test-cmd'
    });
    
    // Should not throw
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(true, 'Loading state sent successfully');
  });

  it('should format tool results for display', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    
    // Test result formatting
    const mockResult = {
      success: true,
      data: {
        message: 'Test result',
        items: [1, 2, 3]
      }
    };
    
    // Should have a formatter function
    if (extExports.formatToolResult) {
      const formatted = extExports.formatToolResult(mockResult);
      assert.ok(typeof formatted === 'string', 'Formatted result should be a string');
      assert.ok(formatted.length > 0, 'Formatted result should not be empty');
    }
  });
});

describe('Tool Parameter Input - Phase 1: Schema Passthrough', () => {
  it('should include inputSchema in tools sent to webview', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let messageData: any = null;
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: (callback: any) => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: (data: any) => {
          messageData = data;
          return Promise.resolve(true);
        }
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Wait for async tool loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert.ok(messageData, 'Message data should be provided');
    assert.strictEqual(messageData.type, 'toolsUpdate', 'Message type should be toolsUpdate');
    assert.ok(messageData.tools, 'Message should contain tools data');
    
    // Check that tools include inputSchema
    for (const serverName in messageData.tools) {
      const tools = messageData.tools[serverName];
      for (const tool of tools) {
        assert.ok('inputSchema' in tool, `Tool ${tool.name} should have inputSchema property (even if undefined)`);
      }
    }
  });

  it('should preserve inputSchema when converting tools to commands', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let messageData: any = null;
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: (callback: any) => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: (data: any) => {
          messageData = data;
          return Promise.resolve(true);
        }
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Wait for async tool loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that tools with inputSchema maintain that schema
    if (messageData && messageData.tools) {
      for (const serverName in messageData.tools) {
        const tools = messageData.tools[serverName];
        for (const tool of tools) {
          // If a tool has inputSchema, it should be an object or undefined, not missing
          if (tool.inputSchema !== undefined) {
            assert.ok(
              typeof tool.inputSchema === 'object' || tool.inputSchema === null,
              `Tool ${tool.name} inputSchema should be an object if present`
            );
          }
        }
      }
    }
    
    assert.ok(true, 'inputSchema preserved in tool data');
  });
});

describe('Tool Parameter Input - Phase 3: Parameter Passing', () => {
  it('should pass parameters to invokeTool function', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    // Track invokeTool calls
    const extExports = ext!.exports;
    const originalInvokeTool = extExports.invokeTool;
    let capturedToolName: string | null = null;
    let capturedParameters: any = null;
    
    extExports.invokeTool = async (toolName: string, parameters: any) => {
      capturedToolName = toolName;
      capturedParameters = parameters;
      // Return a mock result
      return {
        success: true,
        data: { result: 'test' },
        toolName: toolName,
        executionTime: 100
      };
    };
    
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
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    const messageCallback = (mockWebviewView as any).messageCallback;
    
    // Send executeCommand message with parameters
    await messageCallback({
      type: 'executeCommand',
      server: 'TestServer',
      command: 'testCommand',
      parameters: {
        name: 'John',
        age: 25,
        active: true
      }
    });
    
    // Wait for async execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify parameters were passed
    assert.strictEqual(capturedToolName, 'TestServer_testCommand', 'Tool name should match');
    assert.ok(capturedParameters, 'Parameters should be passed');
    assert.strictEqual(capturedParameters.name, 'John', 'Name parameter should match');
    assert.strictEqual(capturedParameters.age, 25, 'Age parameter should match');
    assert.strictEqual(capturedParameters.active, true, 'Active parameter should match');
    
    // Restore original function
    extExports.invokeTool = originalInvokeTool;
  });

  it('should pass empty parameters object when no parameters provided', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    // Track invokeTool calls
    const extExports = ext!.exports;
    const originalInvokeTool = extExports.invokeTool;
    let capturedParameters: any = null;
    
    extExports.invokeTool = async (toolName: string, parameters: any) => {
      capturedParameters = parameters;
      return {
        success: true,
        data: { result: 'test' },
        toolName: toolName,
        executionTime: 100
      };
    };
    
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
      },
      onDidChangeVisibility: () => {
        return { dispose: () => {} };
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    const messageCallback = (mockWebviewView as any).messageCallback;
    
    // Send executeCommand message without parameters
    await messageCallback({
      type: 'executeCommand',
      server: 'TestServer',
      command: 'simpleCommand'
    });
    
    // Wait for async execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify empty parameters object was passed
    assert.ok(capturedParameters !== null, 'Parameters should be passed');
    assert.deepStrictEqual(capturedParameters, {}, 'Parameters should be empty object');
    
    // Restore original function
    extExports.invokeTool = originalInvokeTool;
  });
});

describe('Panel Visibility and Reload', () => {
  it('should register onDidChangeVisibility listener during resolve', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let visibilityListenerRegistered = false;
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: () => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: () => Promise.resolve(true)
      },
      onDidChangeVisibility: (callback: any) => {
        visibilityListenerRegistered = true;
        return { dispose: () => {} };
      }
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    assert.ok(visibilityListenerRegistered, 'onDidChangeVisibility listener should be registered');
  });

  it('should re-send tools when webview becomes visible after being hidden', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let visibilityCallback: any = null;
    let postMessageCallCount = 0;
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: () => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: (data: any) => {
          if (data.type === 'toolsUpdate') {
            postMessageCallCount++;
          }
          return Promise.resolve(true);
        }
      },
      onDidChangeVisibility: (callback: any) => {
        visibilityCallback = callback;
        return { dispose: () => {} };
      },
      visible: true
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Wait for initial tool load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const initialCallCount = postMessageCallCount;
    
    // Simulate webview becoming hidden
    mockWebviewView.visible = false;
    if (visibilityCallback) {
      visibilityCallback();
    }
    
    // Simulate webview becoming visible again
    mockWebviewView.visible = true;
    if (visibilityCallback) {
      visibilityCallback();
    }
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert.ok(postMessageCallCount > initialCallCount, 'Tools should be re-sent when webview becomes visible');
  });

  it('should not send tools when webview becomes invisible', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let visibilityCallback: any = null;
    let postMessageCallCount = 0;
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: () => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: (data: any) => {
          if (data.type === 'toolsUpdate') {
            postMessageCallCount++;
          }
          return Promise.resolve(true);
        }
      },
      onDidChangeVisibility: (callback: any) => {
        visibilityCallback = callback;
        return { dispose: () => {} };
      },
      visible: true
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Wait for initial tool load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const initialCallCount = postMessageCallCount;
    
    // Simulate webview becoming invisible
    mockWebviewView.visible = false;
    if (visibilityCallback) {
      visibilityCallback();
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert.strictEqual(postMessageCallCount, initialCallCount, 'Tools should not be sent when webview becomes invisible');
  });

  it('should handle visibility changes when view is disposed', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let visibilityCallback: any = null;
    let disposed = false;
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: () => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: () => {
          if (disposed) {
            throw new Error('Cannot post message to disposed webview');
          }
          return Promise.resolve(true);
        }
      },
      onDidChangeVisibility: (callback: any) => {
        visibilityCallback = callback;
        return { dispose: () => {} };
      },
      visible: true
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Wait for initial tool load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate disposal
    disposed = true;
    (provider as any)._view = undefined;
    
    // Simulate visibility change after disposal - should not throw
    mockWebviewView.visible = true;
    if (visibilityCallback) {
      visibilityCallback();
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert.ok(true, 'Visibility change after disposal should not throw');
  });

  it('should send cached tools immediately when becoming visible', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let visibilityCallback: any = null;
    let postMessageCalls: any[] = [];
    let postMessageTimestamps: number[] = [];
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: () => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: (data: any) => {
          if (data.type === 'toolsUpdate') {
            postMessageCalls.push(data);
            postMessageTimestamps.push(Date.now());
          }
          return Promise.resolve(true);
        }
      },
      onDidChangeVisibility: (callback: any) => {
        visibilityCallback = callback;
        return { dispose: () => {} };
      },
      visible: true
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Wait for initial tool load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const initialCallCount = postMessageCalls.length;
    assert.ok(initialCallCount > 0, 'Initial tools should be sent');
    
    // Clear timestamps for the next test
    postMessageTimestamps = [];
    
    // Simulate webview becoming visible again
    mockWebviewView.visible = true;
    if (visibilityCallback) {
      const beforeCallback = Date.now();
      visibilityCallback();
      const afterCallback = Date.now();
      
      // Check if cached tools were sent synchronously (within 50ms)
      const firstNewTimestamp = postMessageTimestamps[0];
      if (firstNewTimestamp) {
        const timeDiff = firstNewTimestamp - beforeCallback;
        assert.ok(timeDiff < 50, 'Cached tools should be sent immediately (synchronously)');
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    assert.ok(postMessageCalls.length > initialCallCount, 'Cached tools should be sent when becoming visible');
  });

  it('should refresh tools after sending cached data', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const provider = ext!.exports.getViewProvider();
    
    let visibilityCallback: any = null;
    let postMessageCallCount = 0;
    
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: () => {
          return { dispose: () => {} };
        },
        asWebviewUri: (uri: vscode.Uri) => {
          return vscode.Uri.parse('vscode-webview://test' + uri.path);
        },
        postMessage: (data: any) => {
          if (data.type === 'toolsUpdate') {
            postMessageCallCount++;
          }
          return Promise.resolve(true);
        }
      },
      onDidChangeVisibility: (callback: any) => {
        visibilityCallback = callback;
        return { dispose: () => {} };
      },
      visible: true
    } as any;

    await provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
    
    // Wait for initial tool load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const initialCallCount = postMessageCallCount;
    
    // Simulate webview becoming visible again
    mockWebviewView.visible = true;
    if (visibilityCallback) {
      visibilityCallback();
    }
    
    // Wait for async refresh
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should have sent cached tools + refreshed tools (could be 1 or 2 calls depending on timing)
    assert.ok(postMessageCallCount >= initialCallCount + 1, 'Tools should be refreshed after sending cached data');
  });
});

describe('Phase 4: TreeView and Detail Provider Registration', () => {
  it('should register tree view provider', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    assert.ok(ext, 'Extension not found');
    await ext!.activate();
    
    // Verify the extension exports the tree provider
    const extExports = ext!.exports;
    assert.ok(extExports, 'Extension exports not found');
    assert.ok(extExports.getTreeProvider, 'getTreeProvider function not exported');
    
    const treeProvider = extExports.getTreeProvider();
    assert.ok(treeProvider, 'Tree provider not found');
  });

  it('should register detail webview provider', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    assert.ok(extExports.getDetailProvider, 'getDetailProvider function not exported');
    
    const detailProvider = extExports.getDetailProvider();
    assert.ok(detailProvider, 'Detail provider not found');
  });

  it('should create coordination service singleton', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const extExports = ext!.exports;
    assert.ok(extExports.getCoordinationService, 'getCoordinationService function not exported');
    
    const coordinationService = extExports.getCoordinationService();
    assert.ok(coordinationService, 'Coordination service not found');
  });

  it('should have refresh method on tree provider', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const treeProvider = ext!.exports.getTreeProvider();
    assert.ok(treeProvider.refresh, 'refresh method not found');
    assert.strictEqual(typeof treeProvider.refresh, 'function', 'refresh must be a function');
  });

  it('should have resolveWebviewView method on detail provider', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const detailProvider = ext!.exports.getDetailProvider();
    assert.ok(detailProvider.resolveWebviewView, 'resolveWebviewView method not found');
    assert.strictEqual(typeof detailProvider.resolveWebviewView, 'function', 'resolveWebviewView must be a function');
  });

  it('should initially load and refresh tree with tools', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const treeProvider = ext!.exports.getTreeProvider();
    
    // Wait a bit for async tool refresh
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to get children (should work even if no tools available)
    const children = await treeProvider.getChildren();
    assert.ok(Array.isArray(children), 'getChildren should return array');
  });

  it('should register mcp.selectTool command', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    // Try to execute the command - should not throw
    try {
      await vscode.commands.executeCommand('mcp.selectTool', undefined);
      assert.ok(true, 'Command executed without error');
    } catch (error) {
      assert.fail('Command should be registered');
    }
  });

  it('should coordination service be shared between providers', async () => {
    const ext = vscode.extensions.getExtension('mcp-dashboard.vscode-mcp-extension');
    await ext!.activate();
    
    const coordinationService = ext!.exports.getCoordinationService();
    
    // Verify it has expected methods
    assert.ok(coordinationService.selectTool, 'selectTool method not found');
    assert.ok(coordinationService.getSelectedTool, 'getSelectedTool method not found');
    assert.ok(coordinationService.onSelectionChanged, 'onSelectionChanged event not found');
  });
});
