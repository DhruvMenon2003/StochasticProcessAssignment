
import React from 'react';
import ReactDOM from 'react-dom/client';
import StochasticAnalyzer from './components/StochasticAnalyzer';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <StochasticAnalyzer />
  </React.StrictMode>
);
