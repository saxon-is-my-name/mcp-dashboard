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
        command: 'status'
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
});
