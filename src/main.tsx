import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { appliquer, lirePrefs } from './lib/confort';
import './styles.css';
import './styles.rosace.css';
appliquer(lirePrefs());
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
