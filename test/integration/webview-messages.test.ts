import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ToolDetailProvider } from '../../src/providers/ToolDetailProvider';
import { OutputPanelProvider } from '../../src/providers/OutputPanelProvider';
import { TIM } from '../../src/services/TIM';
import { ParsedMCPTool } from '../../src/types/mcpTool';
import { ToolResult } from '../../src/types/toolResult';

/**
 * Tests for message passing between extension and webviews
 */
describe('Webview Message Passing', () => {
	let provider: ToolDetailProvider;
	let tim: TIM;
	let mockOutputPanelProvider: OutputPanelProvider;
	let mockContext: vscode.ExtensionContext;
	let workspaceState: Map<string, unknown>;
	let mockWebviewView: vscode.WebviewView;
	let mockWebview: vscode.Webview;
	let mockOutputPanel: any;
	let messageHandler: ((message: unknown) => Promise<void>) | undefined;
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
		workspaceState = new Map<string, unknown>();

		messageHandler = undefined;
		mockWebview = {
			html: '',
			options: {},
			onDidReceiveMessage: sandbox
				.stub()
				.callsFake((handler: (message: unknown) => Promise<void>) => {
					messageHandler = handler;
					return { dispose: sandbox.stub() };
				}),
			postMessage: sandbox.stub().resolves(true),
			asWebviewUri: sandbox.stub().callsFake((uri: vscode.Uri) => uri),
			cspSource: 'vscode-webview://test',
		} as vscode.Webview;

		mockWebviewView = {
			webview: mockWebview,
			visible: true,
			viewType: 'mcpToolDetail',
			show: sandbox.stub(),
			onDidChangeVisibility: sandbox.stub().returns({ dispose: sandbox.stub() }),
			onDidDispose: sandbox.stub().returns({ dispose: sandbox.stub() }),
		} as vscode.WebviewView;

		mockContext = {
			extensionUri: vscode.Uri.parse('file:///test'),
			subscriptions: [],
			workspaceState: {
				get: (key: string) => workspaceState.get(key),
				update: async (key: string, value: unknown) => {
					workspaceState.set(key, value);
				},
			},
		} as unknown as vscode.ExtensionContext;

		tim = new TIM(mockContext);

		// Create mock OutputPanelProvider
		mockOutputPanelProvider = {
			showOutputPanel: sandbox.stub(),
			sendLoadingMessage: sandbox.stub(),
			sendResultMessage: sandbox.stub(),
			dispose: sandbox.stub(),
		} as unknown as OutputPanelProvider;

		provider = new ToolDetailProvider(
			mockContext.extensionUri,
			mockContext,
			tim.onSelectionChanged,
			tim.useTool,
			mockOutputPanelProvider
		);
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('Tool Detail Webview Messages', () => {
		beforeEach(() => {
			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);
			(mockWebview.postMessage as sinon.SinonStub).resetHistory();
		});

		it('should send toolDetailUpdate message when tool is selected', async () => {
			await provider.showToolDetail(mockTool);

			assert.ok(
				(mockWebview.postMessage as sinon.SinonStub).called,
				'postMessage should be called'
			);

			const call = (mockWebview.postMessage as sinon.SinonStub).lastCall;
			const message = call.args[0];

			assert.strictEqual(
				message.type,
				'toolDetailUpdate',
				'Message type should be toolDetailUpdate'
			);
			assert.strictEqual(message.tool.name, mockTool.name, 'Tool name should match');
			assert.strictEqual(message.tool.server, mockTool.server, 'Tool server should match');
		});

		it('should send toolDetailUpdate with undefined when clearing selection', async () => {
			await provider.showToolDetail(undefined);

			const call = (mockWebview.postMessage as sinon.SinonStub).lastCall;
			const message = call.args[0];

			assert.strictEqual(message.type, 'toolDetailUpdate');
			assert.strictEqual(message.tool, undefined, 'Tool should be undefined when cleared');
		});

		it('should send executionStateUpdate messages during tool execution', async () => {
			const mockInvokeTool = sandbox.stub().resolves({
				success: true,
				data: { result: 'test' },
				toolName: 'test_tool',
			} as ToolResult);

			provider = new ToolDetailProvider(
				mockContext.extensionUri,
				mockContext,
				tim.onSelectionChanged,
				mockInvokeTool,
				mockOutputPanelProvider
			);

			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);
			(mockWebview.postMessage as sinon.SinonStub).resetHistory();

			// Setup output panel
			mockOutputPanel = {
				webview: {
					html: '',
					postMessage: sandbox.stub().resolves(true),
					asWebviewUri: sandbox.stub().callsFake((uri: any) => uri),
					cspSource: 'vscode-webview://test',
				},
				reveal: sandbox.stub(),
				onDidDispose: sandbox.stub().returns({ dispose: sandbox.stub() }),
				dispose: sandbox.stub(),
				title: '',
			};
			sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockOutputPanel);

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Wait for async execution
			await new Promise((resolve) => setTimeout(resolve, 100));

			const calls = (mockWebview.postMessage as sinon.SinonStub).getCalls();

			// Should have two execution state updates: start (true) and end (false)
			const executionMessages = calls
				.map((c) => c.args[0])
				.filter((m) => m.type === 'executionStateUpdate');

			assert.strictEqual(executionMessages.length, 2, 'Should have two execution state messages');
			assert.strictEqual(
				executionMessages[0].executing,
				true,
				'First message should indicate execution started'
			);
			assert.strictEqual(
				executionMessages[1].executing,
				false,
				'Second message should indicate execution completed'
			);
		});
	});

	describe('Output Panel Webview Messages', () => {
		beforeEach(() => {
			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);

			mockOutputPanel = {
				webview: {
					html: '',
					postMessage: sandbox.stub().resolves(true),
					asWebviewUri: sandbox.stub().callsFake((uri: any) => uri),
					cspSource: 'vscode-webview://test',
				},
				reveal: sandbox.stub(),
				onDidDispose: sandbox.stub().returns({ dispose: sandbox.stub() }),
				dispose: sandbox.stub(),
				title: '',
			};

			sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockOutputPanel);
		});

		it('should send loading message to output panel before execution', async () => {
			const mockInvokeTool = sandbox.stub().resolves({
				success: true,
				data: { result: 'test' },
				toolName: 'test_tool',
			} as ToolResult);

			provider = new ToolDetailProvider(
				mockContext.extensionUri,
				mockContext,
				tim.onSelectionChanged,
				mockInvokeTool,
				mockOutputPanelProvider
			);

			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify loading message was sent via OutputPanelProvider
			assert.ok(
				(mockOutputPanelProvider.sendLoadingMessage as sinon.SinonStub).called,
				'sendLoadingMessage should be called'
			);

			const call = (mockOutputPanelProvider.sendLoadingMessage as sinon.SinonStub).getCall(0);
			assert.strictEqual(call.args[0].server, mockTool.server);
			assert.strictEqual(call.args[0].name, mockTool.name);
		});

		it('should send result message to output panel after execution', async () => {
			const mockResult: ToolResult = {
				success: true,
				data: { result: 'test data' },
				toolName: 'test_tool',
				executionTime: 123,
			};

			const mockInvokeTool = sandbox.stub().resolves(mockResult);

			provider = new ToolDetailProvider(
				mockContext.extensionUri,
				mockContext,
				tim.onSelectionChanged,
				mockInvokeTool,
				mockOutputPanelProvider
			);

			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify result message was sent via OutputPanelProvider
			assert.ok(
				(mockOutputPanelProvider.sendResultMessage as sinon.SinonStub).called,
				'sendResultMessage should be called'
			);

			const call = (mockOutputPanelProvider.sendResultMessage as sinon.SinonStub).getCall(0);
			assert.strictEqual(call.args[0].server, mockTool.server, 'Tool server should match');
			assert.strictEqual(call.args[0].name, mockTool.name, 'Tool name should match');
			assert.strictEqual(call.args[1].success, true, 'Result should indicate success');
		});

		it('should send error result to output panel on execution failure', async () => {
			const mockErrorResult: ToolResult = {
				success: false,
				error: 'Tool execution failed',
				toolName: 'test_tool',
				executionTime: 50,
			};

			const mockInvokeTool = sandbox.stub().resolves(mockErrorResult);

			provider = new ToolDetailProvider(
				mockContext.extensionUri,
				mockContext,
				tim.onSelectionChanged,
				mockInvokeTool,
				mockOutputPanelProvider
			);

			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify error result was sent via OutputPanelProvider
			assert.ok(
				(mockOutputPanelProvider.sendResultMessage as sinon.SinonStub).called,
				'sendResultMessage should be called for errors'
			);

			const call = (mockOutputPanelProvider.sendResultMessage as sinon.SinonStub).getCall(0);
			assert.strictEqual(call.args[1].success, false, 'Result should indicate failure');
			assert.strictEqual(call.args[1].error, 'Tool execution failed', 'Error message should match');
		});
	});

	describe('Webview to Extension Messages', () => {
		beforeEach(() => {
			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);
		});

		it('should handle executeCommand message from webview', async () => {
			const mockInvokeTool = sandbox.stub().resolves({
				success: true,
				data: {},
				toolName: 'test_tool',
			} as ToolResult);

			provider = new ToolDetailProvider(
				mockContext.extensionUri,
				mockContext,
				tim.onSelectionChanged,
				mockInvokeTool,
				mockOutputPanelProvider
			);

			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: { testParam: 'testValue' },
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));

			assert.ok(mockInvokeTool.called, 'invokeTool should be called');
			const callArgs = mockInvokeTool.firstCall.args;
			assert.deepStrictEqual(callArgs[0], mockTool, 'Tool should match');
			assert.deepStrictEqual(callArgs[1], { testParam: 'testValue' }, 'Parameters should match');
		});

		it('should handle focusTree message from webview', async () => {
			const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');

			const message = {
				type: 'focusTree',
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			await new Promise((resolve) => setTimeout(resolve, 50));

			assert.ok(executeCommandStub.called, 'executeCommand should be called');
			assert.strictEqual(
				executeCommandStub.firstCall.args[0],
				'mcpToolTree.focus',
				'Should focus tree view'
			);
		});
	});
});
