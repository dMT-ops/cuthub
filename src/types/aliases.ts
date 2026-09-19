import type { Database } from './database.types';

/**
 * Atalhos para as linhas do schema que o projeto realmente importa.
 *
 * Moram aqui, e não no fim de `database.types.ts`, porque aquele arquivo é
 * **gerado** por `supabase gen types` e era reescrito inteiro a cada
 * regeneração, levando estes aliases junto e quebrando o build.
 *
 * Nasceram oito; seis nunca foram importados por ninguém e foram podados na
 * F10.4. O padrão do projeto para um tipo de uso pontual é escrever
 * `Database['public']['Tables'][...]` no próprio arquivo — só entra aqui o que
 * aparece em mais de um lugar.
 */

export type Cliente = Database['public']['Tables']['cliente']['Row'];
export type ClienteInsert = Database['public']['Tables']['cliente']['Insert'];
