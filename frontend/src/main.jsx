import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './landing.css';
import './console.css';
import './ingest.css';
import './accessibility.css';
import './content-refinement.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
