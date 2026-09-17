import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type BarbeariaPublica = Database['public']['Views']['barbearia_publica']['Row'];
type ServicoPublico = Database['public']['Views']['servico_publico']['Row'];
type ProfissionalPublico = Database['public']['Views']['profissional_publico']['Row'];
type ProdutoPublico = Database['public']['Views']['produto_publico']['Row'];

/** Marcas de acento da forma decomposta (NFD), para normalizar a busca. */
const DIACRITICOS = /[̀-ͯ]/g;

export interface FiltroCatalogo {
  busca?: string;
  cidade?: string;
  estado?: string;
}

export interface PerfilPublico {
  barbearia: BarbeariaPublica;
  servicos: ServicoPublico[];
  profissionais: ProfissionalPublico[];
  produtos: ProdutoPublico[];
}

/**
 * Tudo aqui lê **views públicas**, nunca as tabelas.
 *
 * As tabelas estão fechadas por RLS de barbearia e devolveriam zero linhas para
 * quem não pertence a ela — que é o caso de todo visitante e de todo cliente.
 * As views são o contrato: só colunas que podem ser públicas, só registros
 * ativos, e só de barbearias que optaram por estar no catálogo.
 */
export const catalogoService = {
  async listarBarbearias(filtro?: FiltroCatalogo): Promise<BarbeariaPublica[]> {
    let query = supabase
      .from('barbearia_publica')
      .select('*')
      // "Principais" = perfil mais completo. O banco não tem avaliação nem
      // contador de popularidade, e ordenar por movimento exporia o volume de
      // cada barbearia para a concorrente.
      .order('perfil_completude', { ascending: false })
      .order('nome');

    if (filtro?.busca) {
      const termo = filtro.busca.trim();
      if (termo) {
        // Busca no nome e no slug. O slug é a forma sem acento e em minúsculas
        // do nome (gerado pela `slugificar` no banco), então procurar "joao"
        // encontra "João" mesmo com o `ilike` sendo sensível a acento.
        const alvo = `%${termo}%`;
        const alvoSlug = `%${termo.normalize('NFD').replace(DIACRITICOS, '').toLowerCase()}%`;
        query = query.or(`nome.ilike.${alvo},slug.ilike.${alvoSlug}`);
      }
    }
    if (filtro?.cidade) {
      query = query.eq('cidade', filtro.cidade);
    }
    if (filtro?.estado) {
      query = query.eq('estado', filtro.estado);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Falha ao carregar o catálogo: ${error.message}`);
    return data ?? [];
  },

  /** Cidades que têm ao menos uma barbearia listada, para alimentar o filtro. */
  async listarCidades(): Promise<{ cidade: string; estado: string | null }[]> {
    const { data, error } = await supabase
      .from('barbearia_publica')
      .select('cidade, estado')
      .not('cidade', 'is', null)
      .order('cidade');

    if (error) throw new Error(`Falha ao carregar as cidades: ${error.message}`);

    const vistas = new Set<string>();
    const cidades: { cidade: string; estado: string | null }[] = [];
    for (const linha of data ?? []) {
      if (!linha.cidade) continue;
      const chave = `${linha.cidade}|${linha.estado ?? ''}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      cidades.push({ cidade: linha.cidade, estado: linha.estado });
    }
    return cidades;
  },

  async obterPerfil(slug: string): Promise<PerfilPublico | null> {
    const { data: barbearia, error } = await supabase
      .from('barbearia_publica')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw new Error(`Falha ao carregar a barbearia: ${error.message}`);
    // `null` aqui significa slug inexistente **ou** barbearia que saiu do
    // catálogo. A tela trata os dois como "não encontrada", de propósito: dizer
    // "existe mas saiu" contaria algo que a barbearia optou por não contar.
    if (!barbearia) return null;

    // Views geram colunas anulaveis na tipagem. `id` nunca e nulo aqui -- e a
    // chave primaria da tabela de origem --, mas o compilador nao sabe disso.
    const barbeariaId = barbearia.id as string;

    const [servicos, profissionais, produtos] = await Promise.all([
      supabase.from('servico_publico').select('*').eq('barbearia_id', barbeariaId).order('ordem').order('nome'),
      supabase.from('profissional_publico').select('*').eq('barbearia_id', barbeariaId).order('nome'),
      supabase.from('produto_publico').select('*').eq('barbearia_id', barbeariaId).order('ordem').order('nome'),
    ]);

    if (servicos.error) throw new Error(`Falha ao carregar os serviços: ${servicos.error.message}`);
    if (profissionais.error) throw new Error(`Falha ao carregar a equipe: ${profissionais.error.message}`);
    if (produtos.error) throw new Error(`Falha ao carregar os produtos: ${produtos.error.message}`);

    return {
      barbearia,
      servicos: servicos.data ?? [],
      profissionais: profissionais.data ?? [],
      produtos: produtos.data ?? [],
    };
  },
};
