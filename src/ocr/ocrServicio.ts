import { createWorker, type Worker } from 'tesseract.js';
import { extraerFechaHoraDeTexto, type ResultadoParseoOcr } from '../domain/ocr/parsearTexto';

/**
 * Tesseract.js corre su reconocimiento en su propio Web Worker internamente
 * (por eso la API se llama `createWorker`): no hace falta envolverlo en OTRO
 * worker manual, eso solo duplicaria la complejidad sin beneficio real.
 * Se reutiliza una sola instancia para no pagar el costo de inicializacion
 * (carga del modelo .traineddata) en cada foto.
 */
let instanciaWorker: Promise<Worker> | null = null;

async function obtenerWorker(): Promise<Worker> {
  if (!instanciaWorker) {
    instanciaWorker = createWorker('spa');
  }
  return instanciaWorker;
}

export interface ResultadoOcr extends ResultadoParseoOcr {
  textoCrudo: string;
}

export async function reconocerTextoDeImagen(imagen: Blob): Promise<ResultadoOcr> {
  const worker = await obtenerWorker();
  const { data } = await worker.recognize(imagen);
  const parseo = extraerFechaHoraDeTexto(data.text);
  return { ...parseo, textoCrudo: data.text };
}

export async function liberarOcr(): Promise<void> {
  if (instanciaWorker) {
    const worker = await instanciaWorker;
    await worker.terminate();
    instanciaWorker = null;
  }
}
