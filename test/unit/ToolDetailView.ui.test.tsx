import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToolDetailView from '../../src/ui/components/ToolDetailView';
import { ParsedMCPTool } from '../../src/types/mcpTool';

// Mock the vscode API globally
const mockVscode = {
	postMessage: jest.fn(),
};

beforeAll(() => {
	(global as any).acquireVsCodeApi = () => mockVscode;
});

afterAll(() => {
	delete (global as any).acquireVsCodeApi;
});

beforeEach(() => {
	mockVscode.postMessage.mockClear();
});

describe('ToolDetailView', () => {
	describe('empty state', () => {
		it('should show "no tool selected" message when empty', () => {
			render(<ToolDetailView tool={undefined} />);

			expect(screen.getByText(/select a tool from the tree to view details/i)).toBeInTheDocument();
		});

		it('should not show execute button when empty', () => {
			render(<ToolDetailView tool={undefined} />);

			expect(screen.queryByRole('button', { name: /execute/i })).not.toBeInTheDocument();
		});
	});

	describe('error state', () => {
		it('should show error message when error prop is provided', () => {
			render(<ToolDetailView tool={undefined} error="Failed to load tool details" />);

			expect(screen.getByText(/failed to load tool details/i)).toBeInTheDocument();
		});

		it('should not show execute button when error occurs', () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
			};

			render(<ToolDetailView tool={mockTool} error="Network error" />);

			expect(screen.queryByRole('button', { name: /execute/i })).not.toBeInTheDocument();
		});
	});

	describe('tool details rendering', () => {
		const mockTool: ParsedMCPTool = {
			name: 'test_tool',
			description: 'This is a test tool description',
			server: 'test_server',
			fullName: 'test_server_test_tool',
			inputSchema: {
				type: 'object',
				properties: {
					param1: { type: 'string', description: 'First parameter' },
				},
				required: [],
			},
		};

		it('should render tool name and description', () => {
			render(<ToolDetailView tool={mockTool} />);

			expect(screen.getByText('test_tool')).toBeInTheDocument();
			expect(screen.getByText(/this is a test tool description/i)).toBeInTheDocument();
		});

		it('should show server name', () => {
			render(<ToolDetailView tool={mockTool} />);

			expect(screen.getByText(/test_server/i)).toBeInTheDocument();
		});

		it('should show execute button when tool selected', () => {
			render(<ToolDetailView tool={mockTool} />);

			expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument();
		});
	});

	describe('parameter rendering', () => {
		it('should render parameter inputs based on schema', () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
				inputSchema: {
					type: 'object',
					properties: {
						name: { type: 'string', description: 'Name parameter' },
						age: { type: 'number', description: 'Age parameter' },
					},
					required: ['name'],
				},
			};

			render(<ToolDetailView tool={mockTool} />);

			expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
		});

		it('should mark required parameters with asterisk', () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
				inputSchema: {
					type: 'object',
					properties: {
						required_param: { type: 'string' },
					},
					required: ['required_param'],
				},
			};

			render(<ToolDetailView tool={mockTool} />);

			expect(screen.getByLabelText(/required_param \*/i)).toBeInTheDocument();
		});

		it('should render different input types correctly', () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
				inputSchema: {
					type: 'object',
					properties: {
						text_param: { type: 'string' },
						num_param: { type: 'number' },
						bool_param: { type: 'boolean' },
					},
					required: [],
				},
			};

			render(<ToolDetailView tool={mockTool} />);

			const textInput = screen.getByLabelText(/text_param/i) as HTMLInputElement;
			const numInput = screen.getByLabelText(/num_param/i) as HTMLInputElement;
			const boolInput = screen.getByLabelText(/bool_param/i) as HTMLInputElement;

			expect(textInput.type).toBe('text');
			expect(numInput.type).toBe('text'); // Numeric input uses text type with inputMode
			expect(boolInput.type).toBe('checkbox');
		});

		it('should handle tools without parameters', () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
				inputSchema: {
					type: 'object',
					properties: {},
					required: [],
				},
			};

			render(<ToolDetailView tool={mockTool} />);

			expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument();
		});
	});

	describe('execution and validation', () => {
		it('should validate required parameters before execution', () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
				inputSchema: {
					type: 'object',
					properties: {
						required_param: { type: 'string' },
					},
					required: ['required_param'],
				},
			};

			render(<ToolDetailView tool={mockTool} />);

			const executeButton = screen.getByRole('button', { name: /execute/i });
			fireEvent.click(executeButton);

			// Should show validation error
			expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
			// Should not post message
			expect(mockVscode.postMessage).not.toHaveBeenCalled();
		});

		it('should send executeCommand message with parameters', () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
				inputSchema: {
					type: 'object',
					properties: {
						param1: { type: 'string' },
					},
					required: ['param1'],
				},
			};

			render(<ToolDetailView tool={mockTool} />);

			const input = screen.getByLabelText(/param1 \*/i) as HTMLInputElement;
			fireEvent.change(input, { target: { value: 'test_value' } });

			const executeButton = screen.getByRole('button', { name: /execute/i });
			fireEvent.click(executeButton);

			expect(mockVscode.postMessage).toHaveBeenCalledWith({
				type: 'executeCommand',
				tool: mockTool,
				parameters: { param1: 'test_value' },
			});
		});

		it('should clear validation errors when input changes', () => {
			const mockTool: ParsedMCPTool = {
				name: 'test_tool',
				description: 'Test description',
				server: 'test_server',
				fullName: 'test_server_test_tool',
				inputSchema: {
					type: 'object',
					properties: {
						required_param: { type: 'string' },
					},
					required: ['required_param'],
				},
			};

			render(<ToolDetailView tool={mockTool} />);

			const executeButton = screen.getByRole('button', { name: /execute/i });
			fireEvent.click(executeButton);

			// Should show validation error
			expect(screen.getByText(/this field is required/i)).toBeInTheDocument();

			// Change input
			const input = screen.getByLabelText(/required_param \*/i) as HTMLInputElement;
			fireEvent.change(input, { target: { value: 'test' } });

			// Error should be cleared
			expect(screen.queryByText(/this field is required/i)).not.toBeInTheDocument();
		});
	});
});

describe('Parameter Validation', () => {
	it('should validate required parameters are provided', () => {
		const mockTool: ParsedMCPTool = {
			name: 'test_tool',
			description: 'Test',
			server: 'test_server',
			fullName: 'test_server_test_tool',
			inputSchema: {
				type: 'object',
				properties: {
					requiredParam: { type: 'string', description: 'Required parameter' },
				},
				required: ['requiredParam'],
			},
		};

		render(<ToolDetailView tool={mockTool} />);

		const executeButton = screen.getByRole('button', { name: /execute/i });
		fireEvent.click(executeButton);

		// Should show validation error for missing required parameter
		expect(screen.getByText(/required/i)).toBeInTheDocument();
		// Should not call postMessage when validation fails
		expect(mockVscode.postMessage).not.toHaveBeenCalled();
	});

	it('should validate number type parameters', () => {
		const mockTool: ParsedMCPTool = {
			name: 'test_tool',
			description: 'Test',
			server: 'test_server',
			fullName: 'test_server_test_tool',
			inputSchema: {
				type: 'object',
				properties: {
					numberParam: { type: 'number', description: 'Number parameter' },
				},
				required: ['numberParam'],
			},
		};

		render(<ToolDetailView tool={mockTool} />);

		const input = screen.getByLabelText(/numberParam/i);
		fireEvent.change(input, { target: { value: 'not-a-number' } });

		const executeButton = screen.getByRole('button', { name: /execute/i });
		fireEvent.click(executeButton);

		// Should show validation error for invalid number
		expect(screen.getByText(/must be a valid number/i)).toBeInTheDocument();
		expect(mockVscode.postMessage).not.toHaveBeenCalled();
	});

	it('should validate integer type parameters', () => {
		const mockTool: ParsedMCPTool = {
			name: 'test_tool',
			description: 'Test',
			server: 'test_server',
			fullName: 'test_server_test_tool',
			inputSchema: {
				type: 'object',
				properties: {
					intParam: { type: 'integer', description: 'Integer parameter' },
				},
				required: ['intParam'],
			},
		};

		render(<ToolDetailView tool={mockTool} />);

		const input = screen.getByLabelText(/intParam/i);
		fireEvent.change(input, { target: { value: '3.14' } });

		const executeButton = screen.getByRole('button', { name: /execute/i });
		fireEvent.click(executeButton);

		// Should show validation error for non-integer
		expect(screen.getByText(/must be an integer/i)).toBeInTheDocument();
		expect(mockVscode.postMessage).not.toHaveBeenCalled();
	});

	it('should validate JSON object parameters', () => {
		const mockTool: ParsedMCPTool = {
			name: 'test_tool',
			description: 'Test',
			server: 'test_server',
			fullName: 'test_server_test_tool',
			inputSchema: {
				type: 'object',
				properties: {
					jsonParam: { type: 'object', description: 'JSON object parameter' },
				},
				required: ['jsonParam'],
			},
		};

		render(<ToolDetailView tool={mockTool} />);

		const textarea = screen.getByLabelText(/jsonParam/i);
		fireEvent.change(textarea, { target: { value: '{invalid json}' } });

		const executeButton = screen.getByRole('button', { name: /execute/i });
		fireEvent.click(executeButton);

		// Should show validation error for invalid JSON
		expect(screen.getByText(/must be valid JSON/i)).toBeInTheDocument();
		expect(mockVscode.postMessage).not.toHaveBeenCalled();
	});

	it('should accept valid parameters and execute', () => {
		const mockTool: ParsedMCPTool = {
			name: 'test_tool',
			description: 'Test',
			server: 'test_server',
			fullName: 'test_server_test_tool',
			inputSchema: {
				type: 'object',
				properties: {
					stringParam: { type: 'string', description: 'String parameter' },
					numberParam: { type: 'number', description: 'Number parameter' },
				},
				required: ['stringParam', 'numberParam'],
			},
		};

		render(<ToolDetailView tool={mockTool} />);

		const stringInput = screen.getByLabelText(/stringParam/i);
		const numberInput = screen.getByLabelText(/numberParam/i);

		fireEvent.change(stringInput, { target: { value: 'test value' } });
		fireEvent.change(numberInput, { target: { value: '42' } });

		const executeButton = screen.getByRole('button', { name: /execute/i });
		fireEvent.click(executeButton);

		// Should execute without validation errors
		expect(mockVscode.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'executeCommand',
				tool: mockTool,
				parameters: expect.objectContaining({
					stringParam: 'test value',
					numberParam: 42,
				}),
			})
		);
	});

	it('should clear validation errors when input changes', () => {
		const mockTool: ParsedMCPTool = {
			name: 'test_tool',
			description: 'Test',
			server: 'test_server',
			fullName: 'test_server_test_tool',
			inputSchema: {
				type: 'object',
				properties: {
					requiredParam: { type: 'string', description: 'Required parameter' },
				},
				required: ['requiredParam'],
			},
		};

		render(<ToolDetailView tool={mockTool} />);

		const executeButton = screen.getByRole('button', { name: /execute/i });
		fireEvent.click(executeButton);

		// Should show validation error
		expect(screen.getByText(/required/i)).toBeInTheDocument();

		// Type into the input
		const input = screen.getByLabelText(/requiredParam/i);
		fireEvent.change(input, { target: { value: 'some value' } });

		// Validation error should be cleared
		expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
	});
});
