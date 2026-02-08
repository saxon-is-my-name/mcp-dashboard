import * as React from 'react';
import { ToolResult } from './types/toolResult';

interface OutputState {
	type: 'loading' | 'result';
	server?: string;
	command?: string;
	output?: string;
	result?: ToolResult;
	timestamp?: string;
}

const OutputPanel: React.FC = () => {
	const [state, setState] = React.useState<OutputState>({ type: 'loading' });

	React.useEffect(() => {
		// Listen for messages from the extension
		const messageHandler = (event: MessageEvent) => {
			const message = event.data;

			if (message.type === 'loading') {
				setState({
					type: 'loading',
					server: message.server,
					command: message.command
				});
			} else if (message.type === 'result') {
				setState({
					type: 'result',
					server: message.server,
					command: message.command,
					output: message.output,
					result: message.result,
					timestamp: message.timestamp
				});
			}
		};

		window.addEventListener('message', messageHandler);

		return () => {
			window.removeEventListener('message', messageHandler);
		};
	}, []);

	return (
		<div data-testid="output-panel">
			{state.type === 'loading' ? (
				<div data-testid="loading-state">
					<div>⏳ Executing {state.server && state.command ? `${state.server} › ${state.command}` : 'command'}...</div>
				</div>
			) : (
				<div data-testid="result-state">
					<div>
						<strong>{state.server} › {state.command}</strong>
					</div>
					{state.result && (
						<div style={{ 
							marginTop: '10px', 
							marginBottom: '10px',
							padding: '8px 12px',
							borderRadius: '4px',
							backgroundColor: state.result.success ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
							borderLeft: `3px solid ${state.result.success ? 'green' : 'red'}`
						}}>
							<strong>{state.result.success ? '✅ Success' : '❌ Error'}</strong>
							{state.result.executionTime && (
								<span style={{ marginLeft: '10px', fontSize: '0.9em', opacity: 0.8 }}>
									({state.result.executionTime}ms)
								</span>
							)}
						</div>
					)}
					<div data-testid="command-output">
						<pre>{state.output}</pre>
					</div>
					<div>
						<em>Completed at {state.timestamp}</em>
					</div>
				</div>
			)}
		</div>
	);
};

export default OutputPanel;
