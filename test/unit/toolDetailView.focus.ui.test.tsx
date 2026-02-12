import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToolDetailView from '../../src/ui/components/ToolDetailView';
import { ParsedMCPTool } from '../../src/types/mcpTool';

// Mock the vscode API globally
const mockVscode = {
	postMessage: jest.fn(),
};

// Mock vscode workspace configuration
const mockWorkspaceConfig: {
	get: jest.Mock<any, [string, any]>;
} = {
	get: jest.fn((key: string, defaultValue: any): any => {
		return defaultValue;
	}),
};

beforeAll(() => {
	(global as any).acquireVsCodeApi = () => mockVscode;
	(global as any).vscode = {
		workspace: {
			getConfiguration: jest.fn(() => mockWorkspaceConfig),
		},
	};
});

afterAll(() => {
	delete (global as any).acquireVsCodeApi;
	delete (global as any).vscode;
});

beforeEach(() => {
	mockVscode.postMessage.mockClear();
});

describe('ToolDetailView - Auto-focus First Input', () => {
	const mockToolWithParams: ParsedMCPTool = {
		name: 'test_tool',
		description: 'Test tool with parameters',
		server: 'test_server',
		fullName: 'test_server_test_tool',
		inputSchema: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'Search query' },
				limit: { type: 'number', description: 'Result limit' },
			},
			required: ['query'],
		},
	};

	const mockToolWithoutParams: ParsedMCPTool = {
		name: 'simple_tool',
		description: 'Tool without parameters',
		server: 'test_server',
		fullName: 'test_server_simple_tool',
	};

	describe('auto-focus behavior', () => {
		it('should auto-focus first input when tool loads with parameters', async () => {
			const { container } = render(<ToolDetailView tool={mockToolWithParams} />);

			// Wait for focus to be applied (with extended timeout to account for setTimeout in implementation)
			await waitFor(
				() => {
					const firstInput = container.querySelector('#query') as HTMLInputElement;
					expect(document.activeElement).toBe(firstInput);
				},
				{ timeout: 200 }
			);
		});

		it('should auto-focus first input when tool changes', async () => {
			const { rerender, container } = render(<ToolDetailView tool={undefined} />);

			// Change to a tool with parameters
			rerender(<ToolDetailView tool={mockToolWithParams} />);

			// Wait for focus to be applied
			await waitFor(
				() => {
					const firstInput = container.querySelector('#query') as HTMLInputElement;
					expect(document.activeElement).toBe(firstInput);
				},
				{ timeout: 200 }
			);
		});

		it('should not auto-focus when tool has no parameters', async () => {
			const { container } = render(<ToolDetailView tool={mockToolWithoutParams} />);

			// Wait a bit to ensure focus doesn't happen
			await new Promise((resolve) => setTimeout(resolve, 150));

			// No input elements should exist
			const inputs = container.querySelectorAll('input');
			expect(inputs.length).toBe(0);

			// Body should still have focus or no specific element focused
			expect(document.activeElement).not.toHaveAttribute('id', 'query');
		});
	});

	describe('edge cases', () => {
		it('should not auto-focus when error is shown', async () => {
			const { container } = render(<ToolDetailView tool={mockToolWithParams} error="Test error" />);

			// Wait a bit to ensure focus doesn't happen
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Error state shown, no inputs rendered
			expect(screen.getByText(/test error/i)).toBeInTheDocument();
			expect(container.querySelectorAll('input').length).toBe(0);
		});

		it('should handle focus when first property is select/dropdown', async () => {
			const mockToolWithEnum: ParsedMCPTool = {
				name: 'enum_tool',
				description: 'Tool with enum parameter',
				server: 'test_server',
				fullName: 'test_server_enum_tool',
				inputSchema: {
					type: 'object',
					properties: {
						mode: {
							type: 'string',
							description: 'Operation mode',
							enum: ['fast', 'slow', 'medium'],
						},
						text: { type: 'string', description: 'Text input' },
					},
					required: ['mode'],
				},
			};

			const { container } = render(<ToolDetailView tool={mockToolWithEnum} />);

			// Wait for focus to be applied to the select element
			await waitFor(
				() => {
					const firstSelect = container.querySelector('#mode') as HTMLSelectElement;
					expect(document.activeElement).toBe(firstSelect);
				},
				{ timeout: 200 }
			);
		});
	});
});
