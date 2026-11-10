import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const elementoRaiz = document.getElementById('root');
if (!elementoRaiz) {
  throw new Error('No se encontro el elemento #root en index.html');
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <App />
  </StrictMode>
);
