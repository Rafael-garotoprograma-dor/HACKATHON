import { AppError, requireThat } from './security';

/** Bound the actual stream, including requests without Content-Length. */
export async function readJson(request: Request, limit = 100_000): Promise<Record<string, any>> {
  requireThat(request.headers.get('content-type')?.split(';')[0] === 'application/json', 'Envie JSON válido.', 415);
  const reader = request.body?.getReader();
  requireThat(reader, 'Solicitação vazia.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      requireThat(size <= limit, 'Solicitação maior que o limite permitido.', 413);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  }
  let data: unknown;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AppError('JSON inválido.'); }
  requireThat(data && typeof data === 'object' && !Array.isArray(data), 'Formato inválido.');
  validateShape(data);
  return data as Record<string, any>;
}

export function validateShape(value: any, depth = 0): void {
  requireThat(depth <= 8, 'Estrutura de dados muito profunda.');
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    requireThat(value.length <= 500, 'Lista muito extensa.');
    value.forEach(v => validateShape(v, depth + 1));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    requireThat(!['__proto__', 'constructor', 'prototype'].includes(key), 'Campo inválido.');
    if (['periods','subjects','prerequisites','permissions','courses','documents','weekdays','ids','absent','attended'].includes(key)) {
      requireThat(Array.isArray(item) && item.every(v => typeof v === 'string' || typeof v === 'number'), `Lista inválida: ${key}.`);
    }
    if (['active','approved','archived','decline'].includes(key)) requireThat(typeof item === 'boolean', `Valor inválido: ${key}.`);
    validateShape(item, depth + 1);
  }
}
