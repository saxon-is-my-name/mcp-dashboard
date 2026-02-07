## Plan: Tool Parameter Input UI

Add UI for entering tool parameters before execution. When a user selects a tool, display input fields for each parameter the tool accepts (based on its input schema), along with descriptions. Pass these parameters when executing the tool.

**Current State:**
- Tools have `inputSchema` in type definitions but it's not used in UI
- Execute button sends command without parameters
- Extension's `invokeTool()` already accepts parameters

**Goal:**
- Show dynamic parameter input fields based on tool's input schema
- Display parameter names, types, and descriptions
- Collect parameter values and pass to tool execution
- Handle required vs optional parameters
- Validate basic input types

**Architecture:**
```
User selects tool → Parse inputSchema → Show input fields → User fills in values → Execute with parameters
```

**Phases: 3**

1. **Phase 1: Pass Input Schema to UI**
    - **Objective:** Ensure input schema data flows from extension to webview UI components
    - **Files/Functions to Modify/Create:**
        - src/webview.tsx (update ParsedMCPTool interface to include inputSchema)
        - src/panel.tsx (update MCPCommand interface to include inputSchema)
        - test/extension.test.ts (verify schema is passed through)
    - **Tests to Write:**
        - Should include inputSchema in tools sent to webview
        - Should pass inputSchema to MCPPanel component
    - **Steps:**
        1. Write tests for schema passthrough
        2. Update ParsedMCPTool interface in webview.tsx to include inputSchema
        3. Update MCPCommand interface in panel.tsx to include inputSchema
        4. Update webview.tsx to pass inputSchema when converting tools
        5. Run tests to confirm passing

2. **Phase 2: Dynamic Parameter Input UI**
    - **Objective:** Display input fields for tool parameters based on JSON Schema
    - **Files/Functions to Modify/Create:**
        - src/panel.tsx (add parameter input component)
        - src/types/parameterSchema.ts (TypeScript interfaces for JSON Schema)
        - test/panel.ui.test.tsx (UI tests for parameter inputs)
    - **Tests to Write:**
        - Should display parameter input fields for selected command
        - Should show parameter descriptions
        - Should handle string, number, and boolean types
        - Should handle enum types with dropdown
        - Should handle object/array types with JSON text input
        - Should mark required parameters
        - Should pre-populate default values
        - Should handle parameters with no schema (show generic input)
    - **Steps:**
        1. Write tests for parameter input UI
        2. Create parameterSchema.ts with JSON Schema type definitions
        3. Add ParameterInputs component to panel.tsx
        4. Parse inputSchema and generate input fields
        5. Display parameter name, type, description
        6. Mark required vs optional parameters
        7. Handle different parameter types:
           - string: text input
           - number/integer: number input
           - boolean: checkbox
           - enum: dropdown select
           - object/array: JSON text area
        8. Pre-populate default values from schema
        9. Run tests to confirm passing

3. **Phase 3: Parameter Collection and Execution**
    - **Objective:** Collect parameter values and pass them to tool execution
    - **Files/Functions to Modify/Create:**
        - src/panel.tsx (collect parameter values, send with execute message)
        - src/extension.ts (update message handler to accept parameters)
        - test/extension.test.ts (test parameter passing)
        - test/panel.ui.test.tsx (test parameter collection)
    - **Tests to Write:**
        - Should collect parameter values from input fields
        - Should send parameters with executeCommand message
        - Should pass parameters to invokeTool function
        - Should validate required parameters are filled
        - Should validate number types
        - Should validate boolean types
        - Should validate JSON syntax for object/array types
        - Should handle empty parameters (tools with no inputs)
    - **Steps:**
        1. Write tests for parameter collection
        2. Add state management for parameter values in panel.tsx
        3. Update handleExecute to include parameters in message
        4. Update extension message handler to accept parameters field
        5. Pass parameters to invokeTool function
        6. Add validation for required parameters
        7. Add type validation (number, boolean, JSON parsing)
        8. Run tests to confirm passing

**Answered Questions:**
1. **Schema Support:** ✅ Support string, number, boolean, enum (dropdown), object/array (JSON text input)
2. **Complex Types:** ✅ Arrays and nested objects shown as JSON text input initially
3. **Validation:** ✅ Implement simple type checking (string/number/boolean validation)
4. **Default Values:** ✅ Pre-populate inputs with default values from schema
5. **Enum Support:** ✅ Show enums as dropdown selects

**Technical Notes:**
- Input schemas follow JSON Schema format (used by MCP protocol)
- Common types: string, number, integer, boolean, object, array
- Schema properties: type, description, required, default, enum
- Start with basic types, can expand to complex types later
- VS Code API passes parameters as object to invokeTool()
