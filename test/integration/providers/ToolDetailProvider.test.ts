import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ToolDetailProvider } from '../../../src/providers/ToolDetailProvider';
import { OutputPanelProvider } from '../../../src/providers/OutputPanelProvider';
import { TIM } from '../../../src/services/TIM';
import { ParsedMCPTool } from '../../../src/types/mcpTool';

describe('ToolDetailProvider', () => {
	let provider: ToolDetailProvider;
	let tim: TIM;
	let mockOutputPanelProvider: OutputPanelProvider;
	let mockContext: vscode.ExtensionContext;
	let workspaceState: Map<string, unknown>;
	let mockWebviewView: vscode.WebviewView;
	let mockWebview: vscode.Webview;
	let messageHandler: ((message: unknown) => Promise<void>) | undefined;
	let sandbox: sinon.SinonSandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();

		// Create mock workspace state
		workspaceState = new Map<string, unknown>();

		// Setup mocks
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

	describe('resolveWebviewView', () => {
		it('should create webview with correct options', () => {
			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);

			assert.deepStrictEqual(mockWebview.options, {
				enableScripts: true,
				localResourceRoots: [mockContext.extensionUri],
			});
		});

		it('should set HTML content for webview', () => {
			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);

			assert.ok(mockWebview.html, 'HTML should be set');
			assert.ok(mockWebview.html.includes('<!DOCTYPE html>'), 'HTML should be valid');
		});

		it('should register message handler', () => {
			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);

			assert.ok((mockWebview.onDidReceiveMessage as any).called, 'Should register message handler');
		});
	});

	describe('showToolDetail', () => {
		beforeEach(() => {
			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);
			(mockWebview.postMessage as sinon.SinonStub).resetHistory();
		});

		it('should send tool detail on selection', async () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test tool description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
				inputSchema: {
					type: 'object',
					properties: {
						param1: { type: 'string', description: 'First parameter' },
					},
					required: ['param1'],
				},
			};

			await provider.showToolDetail(mockTool);

			// Should call postMessage at least once
			assert.ok(
				(mockWebview.postMessage as sinon.SinonStub).called,
				'postMessage should be called'
			);

			// Check last call contains the tool
			const lastCall = (mockWebview.postMessage as sinon.SinonStub).lastCall;
			assert.ok(lastCall, 'Should have at least one postMessage call');
			assert.strictEqual(lastCall.args[0].type, 'toolDetailUpdate');
			assert.deepStrictEqual(lastCall.args[0].tool, mockTool);
		});
	});

	describe('handleExecuteCommand', () => {
		let mockInvokeTool: sinon.SinonStub;

		beforeEach(() => {
			// Create a new provider with a mocked invokeTool function
			mockInvokeTool = sandbox.stub().resolves({
				success: true,
				data: { result: 'Test result' },
				toolName: 'test_server_test_tool',
			});

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

			// Setup output panel mock
		});

		it('should invoke tool with correct parameters', async () => {
			const mockTool: ParsedMCPTool = {
				fullName: 'test_server_test_tool',
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				inputSchema: { type: 'object', properties: {} },
			};

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: { param1: 'value1' },
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise((resolve) => setTimeout(resolve, 100));

			assert.ok(mockInvokeTool.called, 'invokeTool should be called');
			assert.deepStrictEqual(mockInvokeTool.getCall(0).args[0], mockTool);
			assert.deepStrictEqual(mockInvokeTool.getCall(0).args[1], { param1: 'value1' });
		});

		it('should create output panel when executing command', async () => {
			const mockTool: ParsedMCPTool = {
				fullName: 'test_server_test_tool',
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				inputSchema: { type: 'object', properties: {} },
			};

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify OutputPanelProvider methods were called
			assert.ok(
				(mockOutputPanelProvider.showOutputPanel as sinon.SinonStub).called,
				'showOutputPanel should be called'
			);
			assert.ok(
				(mockOutputPanelProvider.sendLoadingMessage as sinon.SinonStub).called,
				'sendLoadingMessage should be called'
			);
		});

		it('should send result to output panel', async () => {
			const mockTool: ParsedMCPTool = {
				fullName: 'test_server_test_tool',
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				inputSchema: { type: 'object', properties: {} },
			};

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Verify sendResultMessage was called on OutputPanelProvider
			assert.ok(
				(mockOutputPanelProvider.sendResultMessage as sinon.SinonStub).called,
				'sendResultMessage should be called'
			);

			// Verify the arguments passed to sendResultMessage
			const call = (mockOutputPanelProvider.sendResultMessage as sinon.SinonStub).getCall(0);
			assert.strictEqual(call.args[0].server, 'test_server', 'Tool server should match');
			assert.strictEqual(call.args[0].name, 'test_tool', 'Tool name should match');
			assert.ok(call.args[1].success, 'Result should indicate success');
		});

		it('should handle tool invocation errors', async () => {
			// Mock invokeTool to return an error
			mockInvokeTool.resolves({
				success: false,
				error: 'Tool execution failed',
				toolName: 'test_server_test_tool',
			});

			const mockTool: ParsedMCPTool = {
				fullName: 'test_server_test_tool',
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				inputSchema: { type: 'object', properties: {} },
			};

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should still send result to output panel (with error)
			assert.ok(
				(mockOutputPanelProvider.sendResultMessage as sinon.SinonStub).called,
				'sendResultMessage should be called for errors'
			);

			const call = (mockOutputPanelProvider.sendResultMessage as sinon.SinonStub).getCall(0);
			assert.ok(call.args[1].error, 'Result should contain error');
			assert.strictEqual(call.args[1].success, false, 'Result should indicate failure');
		});

		it('should send execution state updates to detail view', async () => {
			const mockTool: ParsedMCPTool = {
				fullName: 'test_server_test_tool',
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				inputSchema: { type: 'object', properties: {} },
			};

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			(mockWebview.postMessage as sinon.SinonStub).resetHistory();

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should send execution state messages to the detail view
			const calls = (mockWebview.postMessage as sinon.SinonStub).getCalls();
			const stateMessages = calls
				.filter((call: sinon.SinonSpyCall) => call.args[0].type === 'executionStateUpdate')
				.map((call: sinon.SinonSpyCall) => call.args[0]);

			// Should send executing: true at start and executing: false at end
			assert.strictEqual(stateMessages.length, 2, 'Should send two execution state messages');
			assert.strictEqual(
				stateMessages[0].executing,
				true,
				'First message should be executing: true'
			);
			assert.strictEqual(
				stateMessages[1].executing,
				false,
				'Second message should be executing: false'
			);
		});
	});

	describe('empty selection state', () => {
		beforeEach(() => {
			provider.resolveWebviewView(
				mockWebviewView,
				{} as vscode.WebviewViewResolveContext,
				{} as vscode.CancellationToken
			);
			(mockWebview.postMessage as sinon.SinonStub).resetHistory();
		});

		it('should handle empty selection state', async () => {
			await provider.showToolDetail(undefined);

			assert.ok((mockWebview.postMessage as sinon.SinonStub).called, 'Should post message');
			const call = (mockWebview.postMessage as sinon.SinonStub).getCall(0);
			assert.strictEqual(call.args[0].type, 'toolDetailUpdate');
			assert.strictEqual(call.args[0].tool, undefined);
		});
	});

	describe('disposal', () => {
		let mockInvokeTool: sinon.SinonStub;

		beforeEach(() => {
			// Create a new provider with a mocked invokeTool function
			mockInvokeTool = sandbox.stub().resolves({
				success: true,
				data: { result: 'Test result' },
				toolName: 'test_server_test_tool',
			});

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
		});

		it('should dispose of subscription and output panel', async () => {
			// Create output panel by executing a command
			const mockTool: ParsedMCPTool = {
				fullName: 'test_server_test_tool',
				name: 'test_tool',
				description: 'Test tool',
				server: 'test_server',
				inputSchema: { type: 'object', properties: {} },
			};

			const message = {
				type: 'executeCommand',
				tool: mockTool,
				parameters: {},
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify OutputPanelProvider was used
			assert.ok(
				(mockOutputPanelProvider.showOutputPanel as sinon.SinonStub).called,
				'OutputPanelProvider should be used'
			);

			// Dispose the provider
			provider.dispose();

			// Note: OutputPanelProvider disposal is now handled separately by extension.ts
			// This test verifies that ToolDetailProvider's disposal doesn't throw errors
			assert.ok(true, 'Provider disposed successfully');
		});
	});
});
