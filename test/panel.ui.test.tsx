import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MCPPanel from '../src/panel';

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
});
