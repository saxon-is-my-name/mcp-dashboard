import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MCPPanel from '../src/panel';

// Mock the vscode API globally
const mockVscode = {
  postMessage: jest.fn()
};

beforeAll(() => {
  (global as any).acquireVsCodeApi = () => mockVscode;
});

afterAll(() => {
  delete (global as any).acquireVsCodeApi;
});

beforeEach(() => {
  mockVscode.postMessage.mockClear();
});

const mockServers = [
  { name: 'Server1', host: '127.0.0.1', port: 8080 },
  { name: 'Server2', host: '192.168.1.1', port: 9090 }
];
const mockCommands = {
  Server1: [
    { name: 'status', description: 'Get status' },
    { name: 'restart', description: 'Restart server' }
  ],
  Server2: [
    { name: 'deploy', description: 'Deploy app' }
  ]
};

describe('MCP Panel UI', () => {
  it('renders without crashing', () => {
    render(<MCPPanel servers={mockServers} commands={mockCommands} />);
    expect(screen.getByText('Server1')).toBeInTheDocument();
  });

  describe('Server List', () => {
    it('should render all servers from mock data', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      expect(screen.getByText('Server1')).toBeInTheDocument();
      expect(screen.getByText('Server2')).toBeInTheDocument();
    });

    it('should display server details (host and port)', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      expect(screen.getByText(/127\.0\.0\.1:8080/)).toBeInTheDocument();
      expect(screen.getByText(/192\.168\.1\.1:9090/)).toBeInTheDocument();
    });

    it('should highlight the selected server', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      const server1Button = screen.getByTestId('server-Server1');
      expect(server1Button).toHaveClass('selected');
    });
  });

  describe('Command List', () => {
    it('should render commands for the selected server', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      // Server1 is selected by default
      expect(screen.getByText('status')).toBeInTheDocument();
      expect(screen.getByText('restart')).toBeInTheDocument();
      expect(screen.queryByText('deploy')).not.toBeInTheDocument();
    });

    it('should display command descriptions', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      expect(screen.getByText(/Get status/)).toBeInTheDocument();
      expect(screen.getByText(/Restart server/)).toBeInTheDocument();
    });

    it('should render empty list when no commands for server', () => {
      const serversWithNoCommands = [
        { name: 'EmptyServer', host: '127.0.0.1', port: 8080 }
      ];
      const emptyCommands = {};
      
      render(<MCPPanel servers={serversWithNoCommands} commands={emptyCommands} />);
      
      const commandList = screen.getByTestId('command-list');
      expect(commandList).toBeEmptyDOMElement();
    });
  });

  describe('Selection Handling', () => {
    it('should change command list when different server is selected', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      // Initially Server1 commands are shown
      expect(screen.getByText('status')).toBeInTheDocument();
      expect(screen.queryByText('deploy')).not.toBeInTheDocument();
      
      // Click Server2
      const server2Button = screen.getByTestId('server-Server2');
      fireEvent.click(server2Button);
      
      // Now Server2 commands are shown
      expect(screen.queryByText('status')).not.toBeInTheDocument();
      expect(screen.getByText('deploy')).toBeInTheDocument();
    });

    it('should highlight selected server after click', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      const server1Button = screen.getByTestId('server-Server1');
      const server2Button = screen.getByTestId('server-Server2');
      
      // Server1 selected by default
      expect(server1Button).toHaveClass('selected');
      expect(server2Button).not.toHaveClass('selected');
      
      // Click Server2
      fireEvent.click(server2Button);
      
      // Server2 should now be selected
      expect(server1Button).not.toHaveClass('selected');
      expect(server2Button).toHaveClass('selected');
    });

    it('should highlight selected command after click', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      const statusButton = screen.getByTestId('command-status');
      const restartButton = screen.getByTestId('command-restart');
      
      // No command selected initially
      expect(statusButton).not.toHaveClass('selected');
      
      // Click status command
      fireEvent.click(statusButton);
      expect(statusButton).toHaveClass('selected');
      expect(restartButton).not.toHaveClass('selected');
      
      // Click restart command
      fireEvent.click(restartButton);
      expect(statusButton).not.toHaveClass('selected');
      expect(restartButton).toHaveClass('selected');
    });

    it('should clear command selection when server changes', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      // Select a command from Server1
      const statusButton = screen.getByTestId('command-status');
      fireEvent.click(statusButton);
      expect(statusButton).toHaveClass('selected');
      
      // Switch to Server2
      const server2Button = screen.getByTestId('server-Server2');
      fireEvent.click(server2Button);
      
      // Command selection should be cleared
      const deployButton = screen.getByTestId('command-deploy');
      expect(deployButton).not.toHaveClass('selected');
    });
  });

  describe('Execute Button', () => {
    it('should render execute button', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      const executeButton = screen.getByTestId('execute-button');
      expect(executeButton).toBeInTheDocument();
      expect(executeButton).toHaveTextContent('Execute');
    });

    it('should be disabled when no command is selected', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      const executeButton = screen.getByTestId('execute-button');
      expect(executeButton).toBeDisabled();
    });

    it('should be enabled when a command is selected', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      // Select a command
      const statusButton = screen.getByTestId('command-status');
      fireEvent.click(statusButton);
      
      const executeButton = screen.getByTestId('execute-button');
      expect(executeButton).not.toBeDisabled();
    });

    it('should call postMessage when clicked with selected command', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      // Select a command
      const statusButton = screen.getByTestId('command-status');
      fireEvent.click(statusButton);
      
      // Click execute button
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Verify postMessage was called with correct data
      expect(mockVscode.postMessage).toHaveBeenCalledWith({
        type: 'executeCommand',
        server: 'Server1',
        command: 'status',
        parameters: {}
      });
    });

    it('should be disabled after server changes (command cleared)', () => {
      render(<MCPPanel servers={mockServers} commands={mockCommands} />);
      
      // Select a command from Server1
      const statusButton = screen.getByTestId('command-status');
      fireEvent.click(statusButton);
      
      const executeButton = screen.getByTestId('execute-button');
      expect(executeButton).not.toBeDisabled();
      
      // Switch to Server2
      const server2Button = screen.getByTestId('server-Server2');
      fireEvent.click(server2Button);
      
      // Execute button should be disabled (command cleared)
      expect(executeButton).toBeDisabled();
    });
  });

  describe('Tool Parameter Input - Phase 2', () => {
    const commandsWithSchema = {
      Server1: [
        {
          name: 'createUser',
          description: 'Create a new user',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'User name' },
              age: { type: 'number', description: 'Age in years' },
              active: { type: 'boolean', description: 'Active status' },
              role: { type: 'string', enum: ['admin', 'user', 'guest'], description: 'User role' },
              metadata: { type: 'object', description: 'User metadata as JSON' },
              tags: { type: 'array', description: 'User tags as JSON array' }
            },
            required: ['name', 'age']
          }
        },
        {
          name: 'simpleCommand',
          description: 'Command with no schema'
        },
        {
          name: 'withDefaults',
          description: 'Command with default values',
          inputSchema: {
            type: 'object',
            properties: {
              timeout: { type: 'number', description: 'Timeout in seconds', default: 30 },
              debug: { type: 'boolean', description: 'Enable debug mode', default: false }
            }
          }
        }
      ]
    };

    it('should display parameter input fields for selected command', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      // Select the command with parameters
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Should show parameter inputs
      expect(screen.getByTestId('parameter-inputs')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    });

    it('should show parameter descriptions', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      expect(screen.getByText(/User name/)).toBeInTheDocument();
      expect(screen.getByText(/Age in years/)).toBeInTheDocument();
      expect(screen.getByText(/Active status/)).toBeInTheDocument();
      expect(screen.getByText(/User role/)).toBeInTheDocument();
    });

    it('should handle string type with text input', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('type', 'text');
    });

    it('should handle number type with number input', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      const ageInput = screen.getByLabelText(/age/i);
      expect(ageInput).toHaveAttribute('type', 'text');
      expect(ageInput).toHaveAttribute('inputMode', 'numeric');
    });

    it('should handle boolean type with checkbox', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      const activeInput = screen.getByLabelText(/active/i);
      expect(activeInput).toHaveAttribute('type', 'checkbox');
    });

    it('should handle enum types with dropdown', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      const roleSelect = screen.getByLabelText(/role/i);
      expect(roleSelect.tagName).toBe('SELECT');
      
      // Check options
      const options = Array.from((roleSelect as HTMLSelectElement).options).map(o => o.value);
      expect(options).toContain('admin');
      expect(options).toContain('user');
      expect(options).toContain('guest');
    });

    it('should handle object type with JSON textarea', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      const metadataInput = screen.getByLabelText(/metadata/i);
      expect(metadataInput.tagName).toBe('TEXTAREA');
      expect(metadataInput).toHaveAttribute('data-json-type', 'object');
    });

    it('should handle array type with JSON textarea', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      const tagsInput = screen.getByLabelText(/tags/i);
      expect(tagsInput.tagName).toBe('TEXTAREA');
      expect(tagsInput).toHaveAttribute('data-json-type', 'array');
    });

    it('should mark required parameters with asterisk', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // name and age are required
      const nameLabel = screen.getByText(/name \*/);
      const ageLabel = screen.getByText(/age \*/);
      expect(nameLabel).toBeInTheDocument();
      expect(ageLabel).toBeInTheDocument();
      
      // active is not required
      expect(screen.queryByText(/active \*/)).not.toBeInTheDocument();
    });

    it('should pre-populate default values', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const withDefaultsButton = screen.getByTestId('command-withDefaults');
      fireEvent.click(withDefaultsButton);
      
      const timeoutInput = screen.getByLabelText(/timeout/i) as HTMLInputElement;
      const debugInput = screen.getByLabelText(/debug/i) as HTMLInputElement;
      
      expect(timeoutInput.value).toBe('30');
      expect(debugInput.checked).toBe(false);
    });

    it('should not show parameter inputs when no command is selected', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      // No command selected initially
      expect(screen.queryByTestId('parameter-inputs')).not.toBeInTheDocument();
    });

    it('should not show parameter inputs for command with no schema', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      const simpleCommandButton = screen.getByTestId('command-simpleCommand');
      fireEvent.click(simpleCommandButton);
      
      // No parameter inputs should be shown
      expect(screen.queryByTestId('parameter-inputs')).not.toBeInTheDocument();
    });

    it('should clear parameter inputs when command selection changes', () => {
      render(<MCPPanel servers={mockServers} commands={commandsWithSchema} />);
      
      // Select first command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      expect(screen.getByTestId('parameter-inputs')).toBeInTheDocument();
      
      // Select second command
      const simpleCommandButton = screen.getByTestId('command-simpleCommand');
      fireEvent.click(simpleCommandButton);
      
      // Parameter inputs should be cleared
      expect(screen.queryByTestId('parameter-inputs')).not.toBeInTheDocument();
    });
  });

  describe('Tool Parameter Input - Phase 3: Parameter Collection and Execution', () => {
    const commandsWithSchema = {
      TestServer: [
        {
          name: 'createUser',
          description: 'Create a new user',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'User name' },
              age: { type: 'number', description: 'Age in years' },
              active: { type: 'boolean', description: 'Active status' },
              metadata: { type: 'object', description: 'User metadata' },
              tags: { type: 'array', description: 'User tags' }
            },
            required: ['name', 'age']
          }
        },
        {
          name: 'simpleCommand',
          description: 'Command with no parameters'
        }
      ]
    };

    const testServers = [
      { name: 'TestServer', host: '127.0.0.1', port: 8080 }
    ];

    it('should collect parameter values from input fields', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command with parameters
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Fill in parameters
      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      const ageInput = screen.getByLabelText(/age/i) as HTMLInputElement;
      const activeInput = screen.getByLabelText(/active/i) as HTMLInputElement;
      
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      fireEvent.click(activeInput);
      
      expect(nameInput.value).toBe('John Doe');
      expect(ageInput.value).toBe('25');
      expect(activeInput.checked).toBe(true);
    });

    it('should send parameters with executeCommand message', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Fill in parameters
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      const activeInput = screen.getByLabelText(/active/i);
      
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      fireEvent.click(activeInput);
      
      // Execute
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Verify message was sent with parameters
      expect(mockVscode.postMessage).toHaveBeenCalledWith({
        type: 'executeCommand',
        server: 'TestServer',
        command: 'createUser',
        parameters: {
          name: 'John Doe',
          age: 25,
          active: true
        }
      });
    });

    it('should validate required parameters are filled', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Try to execute without filling required fields
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Should show validation error
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/age is required/i)).toBeInTheDocument();
      
      // Should not send message
      expect(mockVscode.postMessage).not.toHaveBeenCalled();
    });

    it('should validate number types', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Fill in name (required)
      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'John' } });
      
      // Fill in age with invalid value
      const ageInput = screen.getByLabelText(/age/i);
      fireEvent.change(ageInput, { target: { value: 'not-a-number' } });
      
      // Execute
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Should show validation error
      expect(screen.getByText(/age must be a valid number/i)).toBeInTheDocument();
      expect(mockVscode.postMessage).not.toHaveBeenCalled();
    });

    it('should validate JSON syntax for object types', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      
      // Fill in metadata with invalid JSON
      const metadataInput = screen.getByLabelText(/metadata/i);
      fireEvent.change(metadataInput, { target: { value: '{invalid json}' } });
      
      // Execute
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Should show validation error
      expect(screen.getByText(/metadata must be valid JSON/i)).toBeInTheDocument();
      expect(mockVscode.postMessage).not.toHaveBeenCalled();
    });

    it('should validate JSON syntax for array types', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      
      // Fill in tags with invalid JSON
      const tagsInput = screen.getByLabelText(/tags/i);
      fireEvent.change(tagsInput, { target: { value: '[invalid, array]' } });
      
      // Execute
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Should show validation error
      expect(screen.getByText(/tags must be valid JSON/i)).toBeInTheDocument();
      expect(mockVscode.postMessage).not.toHaveBeenCalled();
    });

    it('should handle empty parameters (tools with no inputs)', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command with no parameters
      const simpleCommandButton = screen.getByTestId('command-simpleCommand');
      fireEvent.click(simpleCommandButton);
      
      // Execute
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Should send message with empty parameters
      expect(mockVscode.postMessage).toHaveBeenCalledWith({
        type: 'executeCommand',
        server: 'TestServer',
        command: 'simpleCommand',
        parameters: {}
      });
    });

    it('should parse and send valid JSON for object parameters', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      
      // Fill in valid JSON for metadata
      const metadataInput = screen.getByLabelText(/metadata/i);
      fireEvent.change(metadataInput, { target: { value: '{"key": "value", "count": 42}' } });
      
      // Execute
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Should send parsed JSON
      expect(mockVscode.postMessage).toHaveBeenCalledWith({
        type: 'executeCommand',
        server: 'TestServer',
        command: 'createUser',
        parameters: {
          name: 'John',
          age: 25,
          active: false,
          metadata: { key: 'value', count: 42 }
        }
      });
    });

    it('should parse and send valid JSON for array parameters', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Fill in required fields
      const nameInput = screen.getByLabelText(/name/i);
      const ageInput = screen.getByLabelText(/age/i);
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(ageInput, { target: { value: '25' } });
      
      // Fill in valid JSON for tags
      const tagsInput = screen.getByLabelText(/tags/i);
      fireEvent.change(tagsInput, { target: { value: '["tag1", "tag2", "tag3"]' } });
      
      // Execute
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Should send parsed JSON
      expect(mockVscode.postMessage).toHaveBeenCalledWith({
        type: 'executeCommand',
        server: 'TestServer',
        command: 'createUser',
        parameters: {
          name: 'John',
          age: 25,
          active: false,
          tags: ['tag1', 'tag2', 'tag3']
        }
      });
    });

    it('should clear validation errors when input is corrected', () => {
      render(<MCPPanel servers={testServers} commands={commandsWithSchema} />);
      
      // Select command
      const createUserButton = screen.getByTestId('command-createUser');
      fireEvent.click(createUserButton);
      
      // Try to execute without required field
      const executeButton = screen.getByTestId('execute-button');
      fireEvent.click(executeButton);
      
      // Should show error
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      
      // Fill in the required field
      const nameInput = screen.getByLabelText(/name/i);
      fireEvent.change(nameInput, { target: { value: 'John' } });
      
      // Error should be cleared
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
    });
  });
});
