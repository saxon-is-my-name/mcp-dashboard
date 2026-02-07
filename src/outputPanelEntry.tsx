import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import OutputPanel from './outputPanel';

// Wait for DOM to be ready
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <OutputPanel />
    </React.StrictMode>
  );
}
