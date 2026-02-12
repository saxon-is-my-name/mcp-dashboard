import * as React from 'react';
import { ToolResult } from '../../types/toolResult';

interface OutputPanelProps {
	type: 'loading' | 'result';
	server?: string;
	command?: string;
	output?: string;
	result?: ToolResult;
	timestamp?: string;
}

const OutputPanel: React.FC<OutputPanelProps> = ({
	type,
	server,
	command,
	output,
	result,
	timestamp,
}) => {
	return (
		<div data-testid="output-panel">
			{type === 'loading' ? (
				<div data-testid="loading-state">
					<div>⏳ Executing {server && command ? `${server} › ${command}` : 'command'}...</div>
				</div>
			) : (
				<div data-testid="result-state">
					<div>
						<strong>
							{server} › {command}
						</strong>
					</div>
					{result && (
						<div
							style={{
								marginTop: '10px',
								marginBottom: '10px',
								padding: '8px 12px',
								borderRadius: '4px',
								backgroundColor: result.success ? 'rgba(0, 128, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
								borderLeft: `3px solid ${result.success ? 'green' : 'red'}`,
							}}
						>
							<strong>{result.success ? '✅ Success' : '❌ Error'}</strong>
							{result.executionTime && (
								<span style={{ marginLeft: '10px', fontSize: '0.9em', opacity: 0.8 }}>
									({result.executionTime}ms)
								</span>
							)}
						</div>
					)}
					<div data-testid="command-output">
						<pre>{output}</pre>
					</div>
					<div>
						<em>Completed at {timestamp}</em>
					</div>
				</div>
			)}
		</div>
	);
};

export default OutputPanel;
