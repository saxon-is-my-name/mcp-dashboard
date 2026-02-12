import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { OutputPanelProvider } from '../../../src/providers/OutputPanelProvider';
import { ParsedMCPTool } from '../../../src/types/mcpTool';
import { ToolResult } from '../../../src/types/toolResult';

describe('OutputPanelProvider', () => {
	let provider: OutputPanelProvider;
	let mockContext: vscode.ExtensionContext;
	let mockWebviewPanel: vscode.WebviewPanel;
	let mockWebview: vscode.Webview;
	let createPanelStub: sinon.SinonStub;
	let sandbox: sinon.SinonSandbox;

	const mockTool: ParsedMCPTool = {
		fullName: 'test_server_test_tool',
		name: 'test_tool',
		description: 'Test tool',
		server: 'test_server',
		inputSchema: { type: 'object', properties: {} },
	};

	beforeEach(() => {
		sandbox = sinon.createSandbox();

		mockContext = {
			extensionUri: vscode.Uri.parse('file:///test'),
		} as unknown as vscode.ExtensionContext;

		// Setup mock webview
		mockWebview = {
			html: '',
			postMessage: sandbox.stub().resolves(true),
			asWebviewUri: sandbox.stub().callsFake((uri: vscode.Uri) => uri),
			cspSource: 'vscode-webview://test',
		} as unknown as vscode.Webview;

		// Setup mock webview panel
		mockWebviewPanel = {
			webview: mockWebview,
			reveal: sandbox.stub(),
			onDidDispose: sandbox.stub().returns({ dispose: sandbox.stub() }),
			dispose: sandbox.stub(),
			title: '',
		} as unknown as vscode.WebviewPanel;

		createPanelStub = sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockWebviewPanel);

		provider = new OutputPanelProvider(mockContext.extensionUri);
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('showOutputPanel', () => {
		it('should create webview panel with correct options on first call', () => {
			provider.showOutputPanel(mockTool);

			assert.ok(createPanelStub.called, 'createWebviewPanel should be called');

			const call = createPanelStub.getCall(0);
			assert.strictEqual(call.args[0], 'mcpOutput', 'View type should be mcpOutput');
			assert.strictEqual(call.args[1], 'MCP Output', 'Initial title should be MCP Output');
			assert.strictEqual(call.args[2], vscode.ViewColumn.One, 'Should use ViewColumn.One');

			const options = call.args[3];
			assert.ok(options.enableScripts, 'Should enable scripts');
			assert.ok(options.retainContextWhenHidden, 'Should retain context when hidden');
			assert.deepStrictEqual(options.localResourceRoots, [mockContext.extensionUri]);
		});

		it('should set panel title to include server and tool name', () => {
			provider.showOutputPanel(mockTool);

			assert.strictEqual(
				mockWebviewPanel.title,
				'test_server › test_tool',
				'Title should include server and tool name'
			);
		});

		it('should set HTML content for webview', () => {
			provider.showOutputPanel(mockTool);

			assert.ok(mockWebview.html.length > 0, 'HTML should be set');
			assert.ok(mockWebview.html.includes('outputPanel.js'), 'Should include script reference');
		});

		it('should reveal existing panel instead of creating new one', () => {
			// First call creates panel
			provider.showOutputPanel(mockTool);
			assert.strictEqual(createPanelStub.callCount, 1, 'Should create panel once');

			// Reset history
			createPanelStub.resetHistory();
			(mockWebviewPanel.reveal as sinon.SinonStub).resetHistory();

			// Second call should reveal existing panel
			provider.showOutputPanel(mockTool);
			assert.ok(createPanelStub.notCalled, 'Should not create new panel');
			assert.ok(
				(mockWebviewPanel.reveal as sinon.SinonStub).called,
				'Should reveal existing panel'
			);
		});

		it('should update title on subsequent calls', () => {
			provider.showOutputPanel(mockTool);

			const newTool: ParsedMCPTool = {
				...mockTool,
				name: 'another_tool',
				server: 'another_server',
			};

			provider.showOutputPanel(newTool);
			assert.strictEqual(
				mockWebviewPanel.title,
				'another_server › another_tool',
				'Title should update for new tool'
			);
		});

		it('should handle panel disposal and allow recreating', () => {
			provider.showOutputPanel(mockTool);

			// Simulate panel being disposed
			const onDisposeCallback = (mockWebviewPanel.onDidDispose as sinon.SinonStub).getCall(0)
				.args[0];
			onDisposeCallback();

			// Reset stubs
			createPanelStub.resetHistory();

			// Should create new panel after disposal
			provider.showOutputPanel(mockTool);
			assert.ok(createPanelStub.called, 'Should create new panel after disposal');
		});
	});

	describe('sendLoadingMessage', () => {
		it('should send loading message with correct format', () => {
			provider.showOutputPanel(mockTool);
			provider.sendLoadingMessage(mockTool);

			const postMessageStub = mockWebview.postMessage as sinon.SinonStub;
			assert.ok(postMessageStub.called, 'postMessage should be called');

			const message = postMessageStub.lastCall.args[0];
			assert.strictEqual(message.type, 'loading', 'Message type should be loading');
			assert.strictEqual(message.server, 'test_server', 'Server should match');
			assert.strictEqual(message.command, 'test_tool', 'Command should match tool name');
		});

		it('should do nothing if panel does not exist', () => {
			// Don't call showOutputPanel
			provider.sendLoadingMessage(mockTool);

			// postMessage should not be called because panel doesn't exist
			const postMessageStub = mockWebview.postMessage as sinon.SinonStub;
			assert.ok(postMessageStub.notCalled, 'postMessage should not be called without panel');
		});
	});

	describe('sendResultMessage', () => {
		it('should send result message with correct format for success', () => {
			const result: ToolResult = {
				success: true,
				data: { test: 'data' },
				toolName: 'test_tool',
				executionTime: 123,
			};

			provider.showOutputPanel(mockTool);
			provider.sendResultMessage(mockTool, result);

			const postMessageStub = mockWebview.postMessage as sinon.SinonStub;
			const message = postMessageStub.lastCall.args[0];

			assert.strictEqual(message.type, 'result', 'Message type should be result');
			assert.strictEqual(message.server, 'test_server', 'Server should match');
			assert.strictEqual(message.command, 'test_tool', 'Command should match');
			assert.ok(message.output, 'Should include formatted output');
			assert.strictEqual(message.result.success, true, 'Result should indicate success');
			assert.ok(message.timestamp, 'Should include timestamp');
		});

		it('should send result message with correct format for errors', () => {
			const result: ToolResult = {
				success: false,
				error: 'Test error',
				toolName: 'test_tool',
				executionTime: 50,
			};

			provider.showOutputPanel(mockTool);
			provider.sendResultMessage(mockTool, result);

			const postMessageStub = mockWebview.postMessage as sinon.SinonStub;
			const message = postMessageStub.lastCall.args[0];

			assert.strictEqual(message.type, 'result');
			assert.strictEqual(message.result.success, false, 'Result should indicate failure');
			assert.strictEqual(message.result.error, 'Test error', 'Error should be included');
		});

		it('should format output as JSON', () => {
			const result: ToolResult = {
				success: true,
				data: { nested: { object: 'value' } },
				toolName: 'test_tool',
				executionTime: 100,
			};

			provider.showOutputPanel(mockTool);
			provider.sendResultMessage(mockTool, result);

			const postMessageStub = mockWebview.postMessage as sinon.SinonStub;
			const message = postMessageStub.lastCall.args[0];

			// Verify output is valid JSON with indentation
			assert.ok(message.output.includes('  '), 'Output should be formatted with indentation');
			const parsed = JSON.parse(message.output);
			assert.deepStrictEqual(parsed, result, 'Parsed output should match result');
		});

		it('should do nothing if panel does not exist', () => {
			const result: ToolResult = {
				success: true,
				data: {},
				toolName: 'test_tool',
			};

			// Don't call showOutputPanel
			provider.sendResultMessage(mockTool, result);

			const postMessageStub = mockWebview.postMessage as sinon.SinonStub;
			assert.ok(postMessageStub.notCalled, 'postMessage should not be called without panel');
		});
	});

	describe('dispose', () => {
		it('should dispose of webview panel', () => {
			provider.showOutputPanel(mockTool);

			const disposeSpy = mockWebviewPanel.dispose as sinon.SinonStub;

			provider.dispose();

			assert.ok(disposeSpy.called, 'Panel dispose should be called');
		});

		it('should handle disposal when panel does not exist', () => {
			// Should not throw when disposing without a panel
			assert.doesNotThrow(() => {
				provider.dispose();
			}, 'Should handle disposal without panel');
		});

		it('should clear panel reference after disposal', () => {
			provider.showOutputPanel(mockTool);
			provider.dispose();

			// After disposal, sending messages should do nothing
			provider.sendLoadingMessage(mockTool);

			const postMessageStub = mockWebview.postMessage as sinon.SinonStub;
			// Reset history to only see calls after disposal
			postMessageStub.resetHistory();
			provider.sendLoadingMessage(mockTool);

			assert.ok(postMessageStub.notCalled, 'Should not send messages after disposal');
		});
	});
});
