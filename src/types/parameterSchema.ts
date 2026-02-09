/**
 * Type definitions for JSON Schema parameter definitions
 */

/**
 * JSON Schema property definition
 */
export interface JSONSchemaProperty {
	type?: string;
	description?: string;
	enum?: string[];
	default?: unknown;
	items?: JSONSchemaProperty;
	properties?: { [key: string]: JSONSchemaProperty };
}

/**
 * JSON Schema for tool parameters
 */
export interface ParameterSchema {
	type: 'object';
	properties?: { [key: string]: JSONSchemaProperty };
	required?: string[];
}
