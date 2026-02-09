import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import ToolDetailView from './ui/components/ToolDetailView';
import { ParsedMCPTool } from './types/mcpTool';

// Declare VS Code API type
declare const acquireVsCodeApi: () => {
	postMessage: (message: any) => void;
};

const App: React.FC = () => {
	const [tool, setTool] = React.useState<ParsedMCPTool | undefined>(undefined);
	const [loading, setLoading] = React.useState<boolean>(false);

	React.useEffect(() => {
		// Handle messages from extension
		const messageHandler = (event: MessageEvent) => {
			const message = event.data;

			switch (message.type) {
				case 'toolDetailUpdate':
					setTool(message.tool);
					setLoading(message.loading || false);
					break;
			}
		};

		window.addEventListener('message', messageHandler);

		return () => {
			window.removeEventListener('message', messageHandler);
		};
	}, []);

	return <ToolDetailView tool={tool} loading={loading} />;
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
