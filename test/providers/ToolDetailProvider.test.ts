import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ToolDetailProvider } from '../../src/providers/ToolDetailProvider';
import { ParsedMCPTool } from '../../src/types/mcpTool';

describe('ToolDetailProvider', () => {
	let provider: ToolDetailProvider;
	let mockContext: vscode.ExtensionContext;
	let mockWebviewView: any;
	let mockWebview: any;
	let messageHandler: ((message: any) => Promise<void>) | undefined;
	let sandbox: sinon.SinonSandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();

		// Setup mocks
		messageHandler = undefined;
		mockWebview = {
			html: '',
			options: {},
			onDidReceiveMessage: sinon.stub().callsFake((handler: any) => {
				messageHandler = handler;
				return { dispose: sinon.stub() };
			}),
			postMessage: sinon.stub().resolves(true),
			asWebviewUri: sinon.stub().callsFake((uri: any) => uri),
			cspSource: 'vscode-webview://test'
		};

		mockWebviewView = {
			webview: mockWebview,
			visible: true,
			onDidChangeVisibility: sinon.stub().returns({ dispose: sinon.stub() }),
			onDidDispose: sinon.stub().returns({ dispose: sinon.stub() })
		};

		mockContext = {
			extensionUri: vscode.Uri.parse('file:///test'),
			subscriptions: []
		} as any;

		provider = new ToolDetailProvider(mockContext.extensionUri, mockContext);
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('resolveWebviewView', () => {
		it('should create webview with correct options', () => {
			provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

			assert.deepStrictEqual(mockWebview.options, {
				enableScripts: true,
				localResourceRoots: [mockContext.extensionUri]
			});
		});

		it('should set HTML content for webview', () => {
			provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

			assert.ok(mockWebview.html, 'HTML should be set');
			assert.ok(mockWebview.html.includes('<!DOCTYPE html>'), 'HTML should be valid');
		});

		it('should register message handler', () => {
			provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

			assert.ok(mockWebview.onDidReceiveMessage.called, 'Should register message handler');
		});
	});

	describe('showToolDetail', () => {
		beforeEach(() => {
			provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
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
						param1: { type: 'string', description: 'First parameter' }
					},
					required: ['param1']
				}
			};

			await provider.showToolDetail(mockTool);

			// Should call postMessage at least once
			assert.ok((mockWebview.postMessage as sinon.SinonStub).called, 'postMessage should be called');
			
			// Check last call contains the tool
			const lastCall = (mockWebview.postMessage as sinon.SinonStub).lastCall;
			assert.ok(lastCall, 'Should have at least one postMessage call');
			assert.strictEqual(lastCall.args[0].type, 'toolDetailUpdate');
			assert.deepStrictEqual(lastCall.args[0].tool, mockTool);
		});

		it('should send loading state before fetching details', async () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test tool description',
				server: 'test_server',
				fullName: 'test_server_test_tool'
			};

			await provider.showToolDetail(mockTool);

			// Should call postMessage at least twice
			assert.ok((mockWebview.postMessage as sinon.SinonStub).callCount >= 2, 'Should call postMessage at least twice');
			
			// First call should have loading: true
			const firstCall = (mockWebview.postMessage as sinon.SinonStub).getCall(0);
			assert.strictEqual(firstCall.args[0].type, 'toolDetailUpdate');
			assert.strictEqual(firstCall.args[0].loading, true);
		});
	});

	describe('handleExecuteCommand', () => {
		let createPanelStub: sinon.SinonStub;
		let mockOutputPanel: any;
		let invokeLmToolStub: sinon.SinonStub;

		beforeEach(() => {
			provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
			(mockWebview.postMessage as sinon.SinonStub).resetHistory();

			// Setup output panel mock
			mockOutputPanel = {
				webview: {
					html: '',
					postMessage: sinon.stub().resolves(true),
					asWebviewUri: sinon.stub().callsFake((uri: any) => uri),
					cspSource: 'vscode-webview://test'
				},
				reveal: sinon.stub(),
				onDidDispose: sinon.stub().returns({ dispose: sinon.stub() }),
				title: ''
			};

			createPanelStub = sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockOutputPanel);

			// Mock vscode.lm.invokeTool
			invokeLmToolStub = sandbox.stub();
			invokeLmToolStub.resolves({
				content: [{ type: 'text', text: 'Test result' }]
			});
			
			// Mock vscode.lm with proper getter
			const mockTools = [{
				name: 'test_server_test_tool',
				description: 'Test tool'
			}];
			
			// Stub the property getter for tools
			sandbox.stub(vscode.lm, 'tools').get(() => mockTools);
			(vscode.lm as any).invokeTool = invokeLmToolStub;
		});

		it('should execute tool via vscode.lm.invokeTool', async () => {
			const message = {
				type: 'executeCommand',
				server: 'test_server',
				command: 'test_tool',
				parameters: { param1: 'value1' }
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.ok(invokeLmToolStub.called, 'invokeTool should be called');
			assert.strictEqual(invokeLmToolStub.getCall(0).args[0], 'test_server_test_tool');
		});

		it('should create output panel when executing command', async () => {
			const message = {
				type: 'executeCommand',
				server: 'test_server',
				command: 'test_tool',
				parameters: {}
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise(resolve => setTimeout(resolve, 100));

			assert.ok(createPanelStub.called, 'createWebviewPanel should be called');
			assert.strictEqual(createPanelStub.getCall(0).args[0], 'mcpOutput');
			assert.ok(createPanelStub.getCall(0).args[3].enableScripts, 'Should enable scripts');
			assert.ok(createPanelStub.getCall(0).args[3].retainContextWhenHidden, 'Should retain context');
		});

		it('should send result to output panel', async () => {
			const message = {
				type: 'executeCommand',
				server: 'test_server',
				command: 'test_tool',
				parameters: {}
			};

			if (messageHandler) {
				await messageHandler(message);
			}

			// Give time for async execution
			await new Promise(resolve => setTimeout(resolve, 150));

			assert.ok((mockOutputPanel.webview.postMessage as sinon.SinonStub).called, 'Should post message to output panel');
			
			// Find the result message
			const calls = (mockOutputPanel.webview.postMessage as sinon.SinonStub).getCalls();
			const resultCall = calls.find((call: sinon.SinonSpyCall) => call.args[0].type === 'result');
			
			assert.ok(resultCall, 'Should send result message');
			assert.strictEqual(resultCall.args[0].server, 'test_server');
			assert.strictEqual(resultCall.args[0].command, 'test_tool');
		});
	});

	describe('empty selection state', () => {
		beforeEach(() => {
			provider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
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
});
