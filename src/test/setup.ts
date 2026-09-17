import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cada teste monta sua própria árvore; sem isso, o DOM do teste anterior
// sobrevive e as queries do Testing Library passam a achar dois elementos.
afterEach(() => {
  cleanup();
});
