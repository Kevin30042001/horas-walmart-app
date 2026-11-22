import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/manrope';
import './index.css';
import { iniciarActualizacionAutomatica } from './utils/actualizacion';

iniciarActualizacionAutomatica();

const elementoRaiz = document.getElementById('root');
if (!elementoRaiz) {
  throw new Error('No se encontro el elemento #root en index.html');
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <App />
  </StrictMode>
);
