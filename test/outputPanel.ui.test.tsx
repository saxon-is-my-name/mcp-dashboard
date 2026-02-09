import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import OutputPanel from '../src/outputPanel';

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

describe('Output Panel UI', () => {
	it('should render without crashing', () => {
		render(<OutputPanel />);
		expect(screen.getByTestId('output-panel')).toBeInTheDocument();
	});

	it('should display loading state initially', () => {
		render(<OutputPanel />);
		expect(screen.getByTestId('loading-state')).toBeInTheDocument();
		expect(screen.getByText(/Executing command.../i)).toBeInTheDocument();
	});

	it('should display loading spinner icon', () => {
		render(<OutputPanel />);
		const loadingState = screen.getByTestId('loading-state');
		expect(loadingState).toContainHTML('⏳');
	});

	it('should update to result state when receiving result message', () => {
		render(<OutputPanel />);

		// Simulate receiving a message from extension
		act(() => {
			const event = new MessageEvent('message', {
				data: {
					type: 'result',
					server: 'Server1',
					command: 'status',
					output: 'Command executed successfully\nStatus: OK',
					timestamp: '2026-02-07 10:30:00',
				},
			});
			window.dispatchEvent(event);
		});

		expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
		expect(screen.getByTestId('result-state')).toBeInTheDocument();
	});

	it('should display server and command in result state', () => {
		render(<OutputPanel />);

		act(() => {
			const event = new MessageEvent('message', {
				data: {
					type: 'result',
					server: 'Server1',
					command: 'status',
					output: 'Command executed successfully',
					timestamp: '2026-02-07 10:30:00',
				},
			});
			window.dispatchEvent(event);
		});

		expect(screen.getByText(/Server1/)).toBeInTheDocument();
		expect(screen.getByText(/status/)).toBeInTheDocument();
	});

	it('should display command output in result state', () => {
		render(<OutputPanel />);

		act(() => {
			const event = new MessageEvent('message', {
				data: {
					type: 'result',
					server: 'TestServer',
					command: 'test-cmd',
					output: 'Test output line 1\nTest output line 2',
					timestamp: '2026-02-07 10:30:00',
				},
			});
			window.dispatchEvent(event);
		});

		const output = screen.getByTestId('command-output');
		expect(output).toHaveTextContent('Test output line 1');
		expect(output).toHaveTextContent('Test output line 2');
	});

	it('should display timestamp in result state', () => {
		render(<OutputPanel />);

		act(() => {
			const event = new MessageEvent('message', {
				data: {
					type: 'result',
					server: 'Server1',
					command: 'status',
					output: 'Output',
					timestamp: '2026-02-07 10:30:15',
				},
			});
			window.dispatchEvent(event);
		});

		expect(screen.getByText(/10:30:15/)).toBeInTheDocument();
	});

	it('should remain in loading state when receiving loading message', () => {
		render(<OutputPanel />);

		act(() => {
			const event = new MessageEvent('message', {
				data: {
					type: 'loading',
					server: 'Server1',
					command: 'status',
				},
			});
			window.dispatchEvent(event);
		});

		expect(screen.getByTestId('loading-state')).toBeInTheDocument();
		expect(screen.queryByTestId('result-state')).not.toBeInTheDocument();
	});

	it('should update loading message with server and command', () => {
		render(<OutputPanel />);

		act(() => {
			const event = new MessageEvent('message', {
				data: {
					type: 'loading',
					server: 'TestServer',
					command: 'deploy',
				},
			});
			window.dispatchEvent(event);
		});

		expect(screen.getByText(/Executing TestServer › deploy.../i)).toBeInTheDocument();
	});
});
