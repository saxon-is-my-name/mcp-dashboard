import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OutputPanel from '../../src/ui/components/OutputPanel';
import { ToolResult } from '../../src/types/toolResult';

describe('Output Panel UI', () => {
	it('should render without crashing', () => {
		render(<OutputPanel type="loading" />);
		expect(screen.getByTestId('output-panel')).toBeInTheDocument();
	});

	it('should display loading state', () => {
		render(<OutputPanel type="loading" />);
		expect(screen.getByTestId('loading-state')).toBeInTheDocument();
		expect(screen.getByText(/Executing command.../i)).toBeInTheDocument();
	});

	it('should display loading spinner icon', () => {
		render(<OutputPanel type="loading" />);
		const loadingState = screen.getByTestId('loading-state');
		expect(loadingState).toContainHTML('⏳');
	});

	it('should display result state', () => {
		const mockResult: ToolResult = {
			success: true,
			data: {},
			toolName: 'test_tool',
			executionTime: 123,
		};

		render(
			<OutputPanel
				type="result"
				server="Server1"
				command="status"
				output="Command executed successfully\nStatus: OK"
				result={mockResult}
				timestamp="2026-02-07 10:30:00"
			/>
		);

		expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
		expect(screen.getByTestId('result-state')).toBeInTheDocument();
	});

	it('should display server and command in result state', () => {
		render(
			<OutputPanel
				type="result"
				server="Server1"
				command="status"
				output="Command executed successfully"
				timestamp="2026-02-07 10:30:00"
			/>
		);

		expect(screen.getByText(/Server1/)).toBeInTheDocument();
		expect(screen.getByText(/status/)).toBeInTheDocument();
	});

	it('should display command output in result state', () => {
		render(
			<OutputPanel
				type="result"
				server="TestServer"
				command="test-cmd"
				output="Test output line 1\nTest output line 2"
				timestamp="2026-02-07 10:30:00"
			/>
		);

		const output = screen.getByTestId('command-output');
		expect(output).toHaveTextContent('Test output line 1');
		expect(output).toHaveTextContent('Test output line 2');
	});

	it('should display timestamp in result state', () => {
		render(
			<OutputPanel
				type="result"
				server="Server1"
				command="status"
				output="Output"
				timestamp="2026-02-07 10:30:15"
			/>
		);

		expect(screen.getByText(/10:30:15/)).toBeInTheDocument();
	});

	it('should display loading message with server and command', () => {
		render(<OutputPanel type="loading" server="TestServer" command="deploy" />);

		expect(screen.getByText(/Executing TestServer › deploy.../i)).toBeInTheDocument();
	});

	it('should display success result with execution time', () => {
		const mockResult: ToolResult = {
			success: true,
			data: { message: 'Operation completed' },
			toolName: 'test_tool',
			executionTime: 456,
		};

		render(
			<OutputPanel
				type="result"
				server="TestServer"
				command="execute"
				output="Success output"
				result={mockResult}
				timestamp="2026-02-07 11:00:00"
			/>
		);

		expect(screen.getByText(/✅ Success/)).toBeInTheDocument();
		expect(screen.getByText(/456ms/)).toBeInTheDocument();
	});

	it('should display error result', () => {
		const mockResult: ToolResult = {
			success: false,
			error: 'Something went wrong',
			toolName: 'test_tool',
			executionTime: 100,
		};

		render(
			<OutputPanel
				type="result"
				server="TestServer"
				command="failedCmd"
				output="Error output"
				result={mockResult}
				timestamp="2026-02-07 11:15:00"
			/>
		);

		expect(screen.getByText(/❌ Error/)).toBeInTheDocument();
	});
});
