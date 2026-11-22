import { describe, expect, it } from 'vitest';
import { PASOS_GUIA, pasoDePestana } from './pasos';

describe('guia de la app', () => {
  it('cada paso tiene titulo, texto y al menos un consejo, con id unico', () => {
    expect(new Set(PASOS_GUIA.map((p) => p.id)).size).toBe(PASOS_GUIA.length);
    for (const p of PASOS_GUIA) {
      expect(p.titulo.length).toBeGreaterThan(3);
      expect(p.texto.length).toBeGreaterThan(20);
      expect(p.puntos.length).toBeGreaterThan(0);
    }
  });

  it('cubre todos los modulos: marcar, pago, registros y mas', () => {
    for (const pestana of ['marcar', 'pago', 'registros', 'mas'] as const) {
      expect(PASOS_GUIA[pasoDePestana(pestana)]!.pestana).toBe(pestana);
    }
  });

  it('explica los temas clave: asuetos, extras, reportes y respaldo', () => {
    const ids = PASOS_GUIA.map((p) => p.id);
    for (const id of ['asuetos', 'extras', 'reportes', 'datos', 'nocturno']) expect(ids).toContain(id);
  });
});
