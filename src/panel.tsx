import * as React from 'react';
import type { ParameterSchema, JSONSchemaProperty } from './types/parameterSchema';

// Declare VS Code API type
declare const acquireVsCodeApi: () => {
	postMessage: (message: any) => void;
};

interface MCPServer {
	name: string;
	host: string;
	port: number;
}

interface MCPCommand {
	name: string;
	description: string;
	inputSchema?: any;
}

interface MCPPanelProps {
	servers: MCPServer[];
	commands: { [serverName: string]: MCPCommand[] };
}

interface ParameterInputsProps {
	schema: ParameterSchema;
	validationErrors?: { [key: string]: string };
	onInputChange?: (paramName: string) => void;
}

const ParameterInputs: React.FC<ParameterInputsProps> = ({ schema, validationErrors = {}, onInputChange }) => {
	const { properties = {}, required = [] } = schema;

	const handleChange = (paramName: string) => {
		if (onInputChange) {
			onInputChange(paramName);
		}
	};

	const renderInput = (paramName: string, prop: JSONSchemaProperty) => {
		const isRequired = required.includes(paramName);
		const label = `${paramName}${isRequired ? ' *' : ''}`;
		const { type, description, enum: enumValues, default: defaultValue } = prop;
		const hasError = !!validationErrors[paramName];

		// Handle enum types with dropdown
		if (enumValues && enumValues.length > 0) {
			return (
				<div key={paramName}>
					<label htmlFor={paramName}>{label}</label>
					<select 
						id={paramName} 
						defaultValue={defaultValue}
						onChange={() => handleChange(paramName)}
					>
						<option value="">-- Select --</option>
						{enumValues.map(value => (
							<option key={value} value={value}>{value}</option>
						))}
					</select>
					{description && <div>{description}</div>}
					{hasError && <div style={{ color: 'red' }}>{validationErrors[paramName]}</div>}
				</div>
			);
		}

		// Handle different types
		switch (type) {
			case 'string':
				return (
					<div key={paramName}>
						<label htmlFor={paramName}>{label}</label>
						<input
							id={paramName}
							type="text"
							defaultValue={defaultValue}
							onChange={() => handleChange(paramName)}
						/>
						{description && <div>{description}</div>}
						{hasError && <div style={{ color: 'red' }}>{validationErrors[paramName]}</div>}
					</div>
				);
			
			case 'number':
			case 'integer':
				return (
					<div key={paramName}>
						<label htmlFor={paramName}>{label}</label>
						<input
							id={paramName}
							type="text"
							inputMode="numeric"
							defaultValue={defaultValue}
							onChange={() => handleChange(paramName)}
						/>
						{description && <div>{description}</div>}
						{hasError && <div style={{ color: 'red' }}>{validationErrors[paramName]}</div>}
					</div>
				);
			
			case 'boolean':
				return (
					<div key={paramName}>
						<label htmlFor={paramName}>{label}</label>
						<input
							id={paramName}
							type="checkbox"
							defaultChecked={defaultValue}
							onChange={() => handleChange(paramName)}
						/>
						{description && <div>{description}</div>}
						{hasError && <div style={{ color: 'red' }}>{validationErrors[paramName]}</div>}
					</div>
				);
			
			case 'object':
				return (
					<div key={paramName}>
						<label htmlFor={paramName}>{label}</label>
						<textarea
							id={paramName}
							data-json-type="object"
							defaultValue={defaultValue !== undefined ? JSON.stringify(defaultValue, null, 2) : ''}
							onChange={() => handleChange(paramName)}
						/>
						{description && <div>{description}</div>}
						{hasError && <div style={{ color: 'red' }}>{validationErrors[paramName]}</div>}
					</div>
				);
			
			case 'array':
				return (
					<div key={paramName}>
						<label htmlFor={paramName}>{label}</label>
						<textarea
							id={paramName}
							data-json-type="array"
							defaultValue={defaultValue !== undefined ? JSON.stringify(defaultValue, null, 2) : ''}
							onChange={() => handleChange(paramName)}
						/>
						{description && <div>{description}</div>}
						{hasError && <div style={{ color: 'red' }}>{validationErrors[paramName]}</div>}
					</div>
				);
			
			default:
				// Default to text input for unknown types
				return (
					<div key={paramName}>
						<label htmlFor={paramName}>{label}</label>
						<input
							id={paramName}
							type="text"
							defaultValue={defaultValue}
							onChange={() => handleChange(paramName)}
						/>
						{description && <div>{description}</div>}
						{hasError && <div style={{ color: 'red' }}>{validationErrors[paramName]}</div>}
					</div>
				);
		}
	};

	return (
		<div data-testid="parameter-inputs">
			{Object.entries(properties).map(([paramName, prop]) => renderInput(paramName, prop))}
		</div>
	);
};

const MCPPanel: React.FC<MCPPanelProps> = ({ servers, commands }) => {
	const [selectedServer, setSelectedServer] = React.useState<string>(servers[0]?.name || '');
	const [selectedCommand, setSelectedCommand] = React.useState<string>('');
	const [validationErrors, setValidationErrors] = React.useState<{ [key: string]: string }>({});
	const vscode = React.useMemo(() => acquireVsCodeApi(), []);

	// Clear validation errors when command changes
	React.useEffect(() => {
		setValidationErrors({});
	}, [selectedCommand]);

	const handleServerChange = (serverName: string) => {
		setSelectedServer(serverName);
		setSelectedCommand(''); // Clear command selection when server changes
		setValidationErrors({}); // Clear validation errors
	};

	const collectParameters = (): Record<string, any> => {
		const selectedCommandObj = commands[selectedServer]?.find(cmd => cmd.name === selectedCommand);
		if (!selectedCommandObj?.inputSchema?.properties) {
			return {};
		}

		const params: Record<string, any> = {};
		const { properties } = selectedCommandObj.inputSchema;

		for (const paramName in properties) {
			const prop = properties[paramName];
			const element = document.getElementById(paramName) as HTMLInputElement | HTMLTextAreaElement;
			
			if (!element) continue;

			// Handle different input types based on schema type
			if (element.type === 'checkbox') {
				// Always include boolean value (true or false)
				params[paramName] = (element as HTMLInputElement).checked;
			} else if (prop.type === 'number' || prop.type === 'integer') {
				const value = element.value.trim();
				if (value !== '') {
					const parsed = parseFloat(value);
					if (!isNaN(parsed)) {
						params[paramName] = parsed;
					}
				}
			} else if (element.dataset.jsonType === 'object' || element.dataset.jsonType === 'array') {
				const value = element.value.trim();
				if (value !== '') {
					try {
						params[paramName] = JSON.parse(value);
					} catch (error) {
						// Leave as string if parsing fails - validation will catch this
						params[paramName] = value;
					}
				}
			} else {
				const value = element.value.trim();
				if (value !== '') {
					params[paramName] = value;
				}
			}
		}

		return params;
	};

	const validateParameters = (params: Record<string, any>): { [key: string]: string } => {
		const errors: { [key: string]: string } = {};
		const selectedCommandObj = commands[selectedServer]?.find(cmd => cmd.name === selectedCommand);
		
		if (!selectedCommandObj?.inputSchema) {
			return errors;
		}

		const { properties = {}, required = [] } = selectedCommandObj.inputSchema;

		// Validate types first, then required
		for (const paramName in properties) {
			const prop = properties[paramName];
			const element = document.getElementById(paramName) as HTMLInputElement | HTMLTextAreaElement;
			
			if (!element) continue;

			const value = element.value.trim();

			// Validate number and integer types
			if (prop.type === 'integer') {
				if (value !== '' && !Number.isInteger(Number(value))) {
					errors[paramName] = `${paramName} must be a valid integer`;
				}
			} else if (prop.type === 'number') {
				if (value !== '' && isNaN(parseFloat(value))) {
					errors[paramName] = `${paramName} must be a valid number`;
				}
			}

			// Validate JSON types (object/array)
			if (prop.type === 'object' || prop.type === 'array') {
				if (value !== '') {
					try {
						JSON.parse(value);
					} catch (e) {
						errors[paramName] = `${paramName} must be valid JSON`;
					}
				}
			}
		}

		// Validate required parameters (after type validation)
		for (const paramName of required) {
			// Skip if already has a type error
			if (errors[paramName]) {
				continue;
			}
			
			if (!(paramName in params) || params[paramName] === '') {
				errors[paramName] = `${paramName} is required`;
			}
		}

		return errors;
	};

	const handleExecute = () => {
		if (!selectedCommand) return;

		// Collect parameters
		const params = collectParameters();

		// Validate parameters
		const errors = validateParameters(params);

		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			return;
		}

		// Clear any previous errors
		setValidationErrors({});

		// Send message with parameters
		vscode.postMessage({
			type: 'executeCommand',
			server: selectedServer,
			command: selectedCommand,
			parameters: params
		});
	};

	const handleInputChange = (paramName: string) => {
		// Clear validation error for this parameter when it changes
		if (validationErrors[paramName]) {
			setValidationErrors(prev => {
				const newErrors = { ...prev };
				delete newErrors[paramName];
				return newErrors;
			});
		}
	};

	// Get the selected command's schema
	const selectedCommandObj = commands[selectedServer]?.find(cmd => cmd.name === selectedCommand);
	const hasSchema = selectedCommandObj?.inputSchema?.type === 'object' && selectedCommandObj?.inputSchema?.properties;

	return (
		<div>
			<div>
				{servers.map(server => (
					<button 
						key={server.name} 
						data-testid={`server-${server.name}`}
						className={selectedServer === server.name ? 'selected' : ''}
						onClick={() => handleServerChange(server.name)}
					>
						<div>{server.name}</div>
						<div>{server.host}:{server.port}</div>
					</button>
				))}
			</div>
			<div data-testid="command-list">
				{commands[selectedServer]?.map(cmd => (
					<button
						key={cmd.name}
						data-testid={`command-${cmd.name}`}
						className={selectedCommand === cmd.name ? 'selected' : ''}
						onClick={() => setSelectedCommand(cmd.name)}
					>
						<div>{cmd.name}</div>
						<div>{cmd.description}</div>
					</button>
				))}
			</div>
			{hasSchema && (
				<ParameterInputs 
					schema={selectedCommandObj.inputSchema} 
					validationErrors={validationErrors}
					onInputChange={handleInputChange}
				/>
			)}
			<button 
				data-testid="execute-button"
				disabled={!selectedCommand}
				onClick={handleExecute}
			>
				Execute!
			</button>
		</div>
	);
};
export default MCPPanel;

// Data model for MCP Server (for panel.tsx UI logic)
// ...existing code...
