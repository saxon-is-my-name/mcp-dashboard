import * as assert from 'assert';
import * as vscode from 'vscode';
import { ToolTreeProvider } from '../../src/providers/ToolTreeProvider';
import { ToolCoordinationService } from '../../src/services/ToolCoordinationService';
import { GroupedMCPTools, ParsedMCPTool } from '../../src/types/mcpTool';
import { ServerTreeItem, ToolTreeItem } from '../../src/types/treeItems';

describe('ToolTreeProvider', () => {
	let provider: ToolTreeProvider;
	let coordinationService: ToolCoordinationService;
	let mockContext: vscode.ExtensionContext;
	let workspaceState: Map<string, any>;
	let mockTools: GroupedMCPTools;

	beforeEach(() => {
		// Create mock workspace state
		workspaceState = new Map<string, any>();
		
		mockContext = {
			workspaceState: {
				get: (key: string) => workspaceState.get(key),
				update: async (key: string, value: any) => {
					workspaceState.set(key, value);
				}
			},
			subscriptions: []
		} as any;

		coordinationService = new ToolCoordinationService(mockContext);
		provider = new ToolTreeProvider(coordinationService);
		
		// Setup mock tools data
		mockTools = {
			'server1': [
				{
					name: 'tool1',
					description: 'Tool 1 description',
					server: 'server1',
					fullName: 'server1_tool1',
					inputSchema: {}
				},
				{
					name: 'tool2',
					description: 'Tool 2 description',
					server: 'server1',
					fullName: 'server1_tool2',
					inputSchema: {}
				}
			],
			'server2': [
				{
					name: 'tool3',
					description: 'Tool 3 description',
					server: 'server2',
					fullName: 'server2_tool3',
					inputSchema: {}
				}
			]
		};
	});

	afterEach(() => {
		// Dispose provider to clean up command registration
		if (provider) {
			provider.dispose();
		}
		if (coordinationService) {
			coordinationService.dispose();
		}
	});

	describe('getTreeItem', () => {
		it('should return correct tree item for server node', async () => {
			const serverItem = new ServerTreeItem('server1', vscode.TreeItemCollapsibleState.Collapsed);
			const treeItem = provider.getTreeItem(serverItem);
			
			assert.strictEqual(treeItem.label, 'server1');
			assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
			assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
		});

		it('should return correct tree item for tool node', async () => {
			const tool: ParsedMCPTool = {
				name: 'tool1',
				description: 'Tool 1 description',
				server: 'server1',
				fullName: 'server1_tool1',
				inputSchema: {}
			};
			const toolItem = new ToolTreeItem(tool, vscode.TreeItemCollapsibleState.None);
			const treeItem = provider.getTreeItem(toolItem);
			
			assert.strictEqual(treeItem.label, 'tool1');
			assert.strictEqual(treeItem.description, 'Tool 1 description');
			assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
			assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
			assert.ok(treeItem.command);
			assert.strictEqual(treeItem.command.command, 'mcp.selectTool');
		});
	});

	describe('getChildren', () => {
		it('should return correct server nodes at root level', async () => {
			provider.refresh(mockTools);
			const children = await provider.getChildren();
			
			assert.strictEqual(children.length, 2);
			assert.ok(children[0] instanceof ServerTreeItem);
			assert.ok(children[1] instanceof ServerTreeItem);
			
			const serverNames = children.map(c => c.label).sort();
			assert.deepStrictEqual(serverNames, ['server1', 'server2']);
		});

		it('should return correct tool nodes for each server', async () => {
			provider.refresh(mockTools);
			const servers = await provider.getChildren();
			const server1 = servers.find(s => s.label === 'server1');
			
			assert.ok(server1);
			const tools = await provider.getChildren(server1);
			
			assert.strictEqual(tools.length, 2);
			assert.ok(tools[0] instanceof ToolTreeItem);
			assert.ok(tools[1] instanceof ToolTreeItem);
			
			const toolNames = tools.map(t => t.label).sort();
			assert.deepStrictEqual(toolNames, ['tool1', 'tool2']);
		});

		it('should handle empty tools gracefully', async () => {
			const emptyTools: GroupedMCPTools = {};
			provider.refresh(emptyTools);
			
			const children = await provider.getChildren();
			assert.strictEqual(children.length, 0);
		});

		it('should handle undefined tools gracefully', async () => {
			const children = await provider.getChildren();
			assert.strictEqual(children.length, 0);
		});

		it('should handle server with empty tool array', async () => {
			const toolsWithEmpty: GroupedMCPTools = {
				'server1': [],
				'server2': [
					{
						name: 'tool3',
						description: 'Tool 3 description',
						server: 'server2',
						fullName: 'server2_tool3',
						inputSchema: {}
					}
				]
			};
			provider.refresh(toolsWithEmpty);
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 2);
			
			const server1 = servers.find(s => s.label === 'server1');
			const tools = await provider.getChildren(server1!);
			assert.strictEqual(tools.length, 0);
		});
	});

	describe('Server nodes', () => {
		it('should be collapsible and start collapsed by default', async () => {
			provider.refresh(mockTools);
			const servers = await provider.getChildren();
			
			for (const server of servers) {
				const treeItem = provider.getTreeItem(server);
				assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
			}
		});

		it('should have proper server icon', async () => {
			provider.refresh(mockTools);
			const servers = await provider.getChildren();
			const treeItem = provider.getTreeItem(servers[0]);
			
			assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
			assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'server');
		});

		it('should have tooltip showing server name', async () => {
			provider.refresh(mockTools);
			const servers = await provider.getChildren();
			const treeItem = provider.getTreeItem(servers[0]);
			
			assert.ok(treeItem.tooltip);
			assert.strictEqual(treeItem.tooltip, servers[0].label);
		});
	});

	describe('Tool nodes', () => {
		it('should not be collapsible', async () => {
			provider.refresh(mockTools);
			const servers = await provider.getChildren();
			const tools = await provider.getChildren(servers[0]);
			
			for (const tool of tools) {
				const treeItem = provider.getTreeItem(tool);
				assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
			}
		});

		it('should have proper tool icon', async () => {
			provider.refresh(mockTools);
			const servers = await provider.getChildren();
			const tools = await provider.getChildren(servers[0]);
			const treeItem = provider.getTreeItem(tools[0]);
			
			assert.ok(treeItem.iconPath instanceof vscode.ThemeIcon);
			assert.strictEqual((treeItem.iconPath as vscode.ThemeIcon).id, 'tools');
		});

		it('should have tooltip showing tool description', async () => {
			provider.refresh(mockTools);
			const servers = await provider.getChildren();
			const tools = await provider.getChildren(servers[0]);
			const treeItem = provider.getTreeItem(tools[0]);
			
			assert.ok(treeItem.tooltip);
			assert.ok((treeItem.tooltip as string).includes('tool1'));
			assert.ok((treeItem.tooltip as string).includes('Tool 1 description'));
		});

		it('should have tooltip with "No description" when description is empty', async () => {
			const toolsWithoutDesc: GroupedMCPTools = {
				'server1': [
					{
						name: 'tool_no_desc',
						description: '',
						server: 'server1',
						fullName: 'server1_tool_no_desc',
						inputSchema: {}
					}
				]
			};
			
			provider.refresh(toolsWithoutDesc);
			const servers = await provider.getChildren();
			const tools = await provider.getChildren(servers[0]);
			const treeItem = provider.getTreeItem(tools[0]);
			
			assert.ok(treeItem.tooltip);
			assert.ok((treeItem.tooltip as string).includes('No description'));
		});

		it('should contain correct command for selection', async () => {
			provider.refresh(mockTools);
			const servers = await provider.getChildren();
			const tools = await provider.getChildren(servers[0]);
			const treeItem = provider.getTreeItem(tools[0]);
			
			assert.ok(treeItem.command);
			assert.strictEqual(treeItem.command.command, 'mcp.selectTool');
			assert.ok(treeItem.command.arguments);
			assert.strictEqual(treeItem.command.arguments.length, 1);
		});
	});

	describe('refresh', () => {
		it('should trigger onDidChangeTreeData on refresh', (done) => {
			let eventFired = false;
			
			provider.onDidChangeTreeData(() => {
				eventFired = true;
				assert.ok(true, 'Event was fired');
				done();
			});
			
			provider.refresh(mockTools);
			
			// Ensure event was fired
			setTimeout(() => {
				if (!eventFired) {
					assert.fail('onDidChangeTreeData event was not fired');
					done();
				}
			}, 100);
		});

		it('should update children after refresh', async () => {
			provider.refresh(mockTools);
			let servers = await provider.getChildren();
			assert.strictEqual(servers.length, 2);
			
			const newTools: GroupedMCPTools = {
				'server3': [
					{
						name: 'tool4',
						description: 'Tool 4 description',
						server: 'server3',
						fullName: 'server3_tool4',
						inputSchema: {}
					}
				]
			};
			
			provider.refresh(newTools);
			servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			assert.strictEqual(servers[0].label, 'server3');
		});
	});

	describe('search', () => {
		let searchMockTools: GroupedMCPTools;

		beforeEach(() => {
			// Create more diverse mock data for search testing
			searchMockTools = {
				'database': [
					{
						name: 'query',
						description: 'Execute SQL queries on database',
						server: 'database',
						fullName: 'database_query',
						inputSchema: {},
						tags: ['sql', 'database']
					},
					{
						name: 'backup',
						description: 'Create database backup',
						server: 'database',
						fullName: 'database_backup',
						inputSchema: {},
						tags: ['backup', 'maintenance']
					},
					{
						name: 'export',
						description: 'Export data via API',
						server: 'database',
						fullName: 'database_export',
						inputSchema: {},
						tags: ['export', 'api']
					}
				],
				'api': [
					{
						name: 'fetch',
						description: 'Fetch data from external API',
						server: 'api',
						fullName: 'api_fetch',
						inputSchema: {},
						tags: ['http', 'api']
					},
					{
						name: 'post',
						description: 'Post data to API endpoint',
						server: 'api',
						fullName: 'api_post',
						inputSchema: {},
						tags: ['http', 'api']
					}
				],
				'filesystem': [
					{
						name: 'read',
						description: 'Read file contents',
						server: 'filesystem',
						fullName: 'filesystem_read',
						inputSchema: {}
					}
				]
			};
			provider.refresh(searchMockTools);
		});

		it('should filter tree to show only matching tools by name', async () => {
			provider.setFilterQuery('query');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			assert.strictEqual(servers[0].label, 'database');
			
			const tools = await provider.getChildren(servers[0]);
			assert.strictEqual(tools.length, 1);
			assert.strictEqual(tools[0].label, 'query');
		});

		it('should be case-insensitive', async () => {
			provider.setFilterQuery('QUERY');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			
			const tools = await provider.getChildren(servers[0]);
			assert.strictEqual(tools.length, 1);
			assert.strictEqual(tools[0].label, 'query');
		});

		it('should clear filter when empty string provided', async () => {
			provider.setFilterQuery('query');
			let servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			
			provider.setFilterQuery('');
			servers = await provider.getChildren();
			assert.strictEqual(servers.length, 3);
		});

		it('should match tool names', async () => {
			provider.setFilterQuery('backup');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			assert.strictEqual(servers[0].label, 'database');
			
			const tools = await provider.getChildren(servers[0]);
			assert.strictEqual(tools.length, 1);
			assert.strictEqual(tools[0].label, 'backup');
		});

		it('should match tool descriptions', async () => {
			provider.setFilterQuery('SQL');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			
			const tools = await provider.getChildren(servers[0]);
			assert.strictEqual(tools.length, 1);
			assert.strictEqual(tools[0].label, 'query');
		});

		it('should match tool tags', async () => {
			provider.setFilterQuery('http');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			assert.strictEqual(servers[0].label, 'api');
			
			const tools = await provider.getChildren(servers[0]);
			assert.strictEqual(tools.length, 2);
			const toolNames = tools.map(t => t.label).sort();
			assert.deepStrictEqual(toolNames, ['fetch', 'post']);
		});

		it('should match server names', async () => {
			provider.setFilterQuery('filesystem');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			assert.strictEqual(servers[0].label, 'filesystem');
			
			const tools = await provider.getChildren(servers[0]);
			assert.strictEqual(tools.length, 1);
		});

		it('should match fullName', async () => {
			provider.setFilterQuery('api_fetch');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			assert.strictEqual(servers[0].label, 'api');
			
			const tools = await provider.getChildren(servers[0]);
			assert.strictEqual(tools.length, 1);
			assert.strictEqual(tools[0].label, 'fetch');
		});

		it('should auto-collapse server nodes showing matches', async () => {
			provider.setFilterQuery('query');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 1);
			
			const treeItem = provider.getTreeItem(servers[0]);
			assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
		});

		it('should handle no matches gracefully', async () => {
			provider.setFilterQuery('nonexistent');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 0);
		});

		it('should match multiple servers when tools match', async () => {
			provider.setFilterQuery('api');
			
			const servers = await provider.getChildren();
			assert.strictEqual(servers.length, 2);
			
			const serverNames = servers.map(s => s.label).sort();
			assert.ok(serverNames.includes('api'));
			assert.ok(serverNames.includes('database')); // 'api' in tags
		});
	});
});
