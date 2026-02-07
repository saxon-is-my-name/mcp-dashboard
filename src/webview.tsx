import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import MCPPanel from './panel';

// Mock data for servers and commands
const servers = [
  { name: 'Server1', host: '127.0.0.1', port: 8080 },
  { name: 'Server2', host: '192.168.1.1', port: 9090 }
];

const commands = {
  Server1: [
    { name: 'status', description: 'Get status' },
    { name: 'restart', description: 'Restart server' }
  ],
  Server2: [
    { name: 'deploy', description: 'Deploy app' }
  ]
};

// Wait for DOM to be ready
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <MCPPanel servers={servers} commands={commands} />
    </React.StrictMode>
  );
}
