import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import OutputPanel from '../components/OutputPanel';
import { ToolResult, ToolLoadingMessage, ToolResultMessage } from '../../types/toolResult';

interface OutputState {
	type: 'loading' | 'result';
	server?: string;
	command?: string;
	output?: string;
	result?: ToolResult;
	timestamp?: string;
}

const App: React.FC = () => {
	const [state, setState] = React.useState<OutputState>({ type: 'loading' });

	React.useEffect(() => {
		// Listen for messages from the extension
		const messageHandler = (event: MessageEvent<ToolLoadingMessage | ToolResultMessage>) => {
			const message = event.data;

			if (message.type === 'loading') {
				setState({
					type: 'loading',
					server: message.server,
					command: message.command,
				});
			} else if (message.type === 'result') {
				setState({
					type: 'result',
					server: message.server,
					command: message.command,
					output: message.output,
					result: message.result,
					timestamp: message.timestamp,
				});
			}
		};

		window.addEventListener('message', messageHandler);

		return () => {
			window.removeEventListener('message', messageHandler);
		};
	}, []);

	return (
		<OutputPanel
			type={state.type}
			server={state.server}
			command={state.command}
			output={state.output}
			result={state.result}
			timestamp={state.timestamp}
		/>
	);
};

// Wait for DOM to be ready
const rootElement = document.getElementById('root');
if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}
