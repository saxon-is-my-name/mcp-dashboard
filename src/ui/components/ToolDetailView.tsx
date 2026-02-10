import * as React from 'react';
import { ParsedMCPTool } from '../../types/mcpTool';
import type { ParameterSchema, JSONSchemaProperty } from '../../types/parameterSchema';

// Declare VS Code API type
declare const acquireVsCodeApi: () => {
	postMessage: (message: Record<string, unknown>) => void;
};

interface ToolDetailViewProps {
	tool?: ParsedMCPTool;
	loading?: boolean;
	error?: string;
}

interface ParameterInputsProps {
	schema: ParameterSchema;
	validationErrors?: { [key: string]: string };
	onInputChange?: (paramName: string) => void;
	firstInputRef?: React.RefObject<
		HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
	>;
}

const ParameterInputs: React.FC<ParameterInputsProps> = ({
	schema,
	validationErrors = {},
	onInputChange,
	firstInputRef,
}) => {
	const { properties = {}, required = [] } = schema;

	const handleChange = (paramName: string) => {
		if (onInputChange) {
			onInputChange(paramName);
		}
	};

	const renderInput = (paramName: string, prop: JSONSchemaProperty, isFirst: boolean) => {
		const isRequired = required.includes(paramName);
		const label = `${paramName}${isRequired ? ' *' : ''}`;
		const { type, description, enum: enumValues, default: defaultValue } = prop;
		const hasError = !!validationErrors[paramName];

		// Determine if this should receive the ref
		const shouldAttachRef = isFirst && firstInputRef;

		// Handle enum types with dropdown
		if (enumValues && enumValues.length > 0) {
			return (
				<div key={paramName}>
					<label htmlFor={paramName}>{label}</label>
					<select
						id={paramName}
						defaultValue={defaultValue as any} // eslint-disable-line @typescript-eslint/no-explicit-any
						onChange={() => handleChange(paramName)}
						ref={
							shouldAttachRef ? (firstInputRef as React.RefObject<HTMLSelectElement>) : undefined
						}
					>
						<option value="">-- Select --</option>
						{enumValues.map((value) => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</select>
					{description && <div className="parameter-description">{description}</div>}
					{hasError && <div className="validation-error">{validationErrors[paramName]}</div>}
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
							defaultValue={defaultValue as any} // eslint-disable-line @typescript-eslint/no-explicit-any
							onChange={() => handleChange(paramName)}
							ref={
								shouldAttachRef ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined
							}
						/>
						{description && <div className="parameter-description">{description}</div>}
						{hasError && <div className="validation-error">{validationErrors[paramName]}</div>}
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
							defaultValue={defaultValue as any} // eslint-disable-line @typescript-eslint/no-explicit-any
							onChange={() => handleChange(paramName)}
							ref={
								shouldAttachRef ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined
							}
						/>
						{description && <div className="parameter-description">{description}</div>}
						{hasError && <div className="validation-error">{validationErrors[paramName]}</div>}
					</div>
				);

			case 'boolean':
				return (
					<div key={paramName}>
						<label htmlFor={paramName}>
							<input
								id={paramName}
								type="checkbox"
								defaultChecked={defaultValue as any} // eslint-disable-line @typescript-eslint/no-explicit-any
								onChange={() => handleChange(paramName)}
							/>
							{label}
						</label>
						{description && <div className="parameter-description">{description}</div>}
						{hasError && <div className="validation-error">{validationErrors[paramName]}</div>}
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
							ref={
								shouldAttachRef
									? (firstInputRef as React.RefObject<HTMLTextAreaElement>)
									: undefined
							}
						/>
						{description && <div className="parameter-description">{description}</div>}
						{hasError && <div className="validation-error">{validationErrors[paramName]}</div>}
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
							ref={
								shouldAttachRef
									? (firstInputRef as React.RefObject<HTMLTextAreaElement>)
									: undefined
							}
						/>
						{description && <div className="parameter-description">{description}</div>}
						{hasError && <div className="validation-error">{validationErrors[paramName]}</div>}
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
							defaultValue={defaultValue as any} // eslint-disable-line @typescript-eslint/no-explicit-any
							onChange={() => handleChange(paramName)}
						/>
						{description && <div className="parameter-description">{description}</div>}
						{hasError && <div className="validation-error">{validationErrors[paramName]}</div>}
					</div>
				);
		}
	};

	return (
		<div data-testid="parameter-inputs">
			{Object.entries(properties).map(([paramName, prop], index) =>
				renderInput(paramName, prop, index === 0)
			)}
		</div>
	);
};

const ToolDetailView: React.FC<ToolDetailViewProps> = ({ tool, loading = false, error }) => {
	const [validationErrors, setValidationErrors] = React.useState<{ [key: string]: string }>({});
	const vscode = React.useMemo(() => acquireVsCodeApi(), []);
	const firstInputRef = React.useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
		null
	);

	// Clear validation errors when tool changes
	React.useEffect(() => {
		setValidationErrors({});
	}, [tool]);

	// Auto-focus first input when tool loads
	// Note: Configuration check happens at the extension level (whether to focus this webview)
	// The webview always auto-focuses its first input once it receives focus
	React.useEffect(() => {
		if (
			tool &&
			tool.inputSchema?.properties &&
			Object.keys(tool.inputSchema.properties).length > 0
		) {
			// Use setTimeout to ensure DOM is ready after React commits updates
			const timer = setTimeout(() => {
				if (firstInputRef.current) {
					firstInputRef.current.focus();
				}
			}, 0);

			return () => clearTimeout(timer);
		}
	}, [tool]);

	const collectParameters = (): Record<string, unknown> => {
		if (!tool?.inputSchema?.properties) {
			return {};
		}

		const params: Record<string, unknown> = {};
		const { properties } = tool.inputSchema;

		for (const paramName in properties) {
			const prop = properties[paramName] as JSONSchemaProperty;
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

	const validateParameters = (params: Record<string, unknown>): { [key: string]: string } => {
		const errors: { [key: string]: string } = {};

		if (!tool?.inputSchema) {
			return errors;
		}

		const { properties = {}, required = [] } = tool.inputSchema;

		// Validate types first, then required
		for (const paramName in properties) {
			const prop = properties[paramName] as JSONSchemaProperty;
			const element = document.getElementById(paramName) as HTMLInputElement | HTMLTextAreaElement;

			if (!element) continue;

			const paramValue = params[paramName];

			// Type validation
			if (paramValue !== undefined) {
				if (prop.type === 'number' || prop.type === 'integer') {
					if (typeof paramValue !== 'number') {
						errors[paramName] = 'Must be a number';
					}
				} else if (element.dataset.jsonType === 'object' || element.dataset.jsonType === 'array') {
					if (typeof paramValue === 'string') {
						errors[paramName] = 'Invalid JSON format';
					}
				}
			}
		}

		// Required validation
		for (const paramName of required as string[]) {
			if (params[paramName] === undefined || params[paramName] === '') {
				errors[paramName] = 'This field is required';
			}
		}

		return errors;
	};

	const handleExecute = () => {
		if (!tool) return;

		const params = collectParameters();
		const errors = validateParameters(params);

		if (Object.keys(errors).length > 0) {
			setValidationErrors(errors);
			return;
		}

		// Send execute command to extension
		vscode.postMessage({
			type: 'executeCommand',
			server: tool.server,
			command: tool.name,
			parameters: params,
		});
	};

	const handleInputChange = (paramName: string) => {
		// Clear validation error for this parameter
		if (validationErrors[paramName]) {
			setValidationErrors((prev) => {
				const next = { ...prev };
				delete next[paramName];
				return next;
			});
		}
	};

	// Show loading state
	if (loading) {
		return <div className="loading-state">Loading tool details...</div>;
	}

	// Show error state
	if (error) {
		return <div className="error-state">{error}</div>;
	}

	// Show empty state
	if (!tool) {
		return <div className="empty-state">Select a tool from the tree to view details</div>;
	}

	// Show tool details
	return (
		<div>
			<div className="tool-header">
				<div className="tool-name">{tool.name}</div>
				<div className="tool-server">{tool.server}</div>
				{tool.description && <div className="tool-description">{tool.description}</div>}
			</div>

			{tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0 && (
				<div className="parameters-section">
					<h3>Parameters</h3>
					<ParameterInputs
						schema={tool.inputSchema as ParameterSchema}
						validationErrors={validationErrors}
						onInputChange={handleInputChange}
						firstInputRef={firstInputRef}
					/>
				</div>
			)}

			<button onClick={handleExecute}>Execute</button>
		</div>
	);
};

export default ToolDetailView;
