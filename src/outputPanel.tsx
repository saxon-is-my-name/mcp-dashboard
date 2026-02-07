import * as React from 'react';

interface OutputState {
	type: 'loading' | 'result';
	server?: string;
	command?: string;
	output?: string;
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
