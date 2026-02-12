import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import ToolDetailView from '../components/ToolDetailView';
import { ParsedMCPTool } from '../../types/mcpTool';
import { ToolDetailMessage } from '../../types/webviewMessages';

const App: React.FC = () => {
	const [tool, setTool] = React.useState<ParsedMCPTool | undefined>(undefined);
	const [executing, setExecuting] = React.useState<boolean>(false);

	React.useEffect(() => {
		// Handle messages from extension
		const messageHandler = (event: MessageEvent<ToolDetailMessage>) => {
			const message = event.data;

			switch (message.type) {
				case 'toolDetailUpdate':
					setTool(message.tool);
					break;
				case 'executionStateUpdate':
					setExecuting(message.executing);
					break;
			}
		};

		window.addEventListener('message', messageHandler);

		return () => {
			window.removeEventListener('message', messageHandler);
		};
	}, []);

	return <ToolDetailView tool={tool} executing={executing} />;
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
