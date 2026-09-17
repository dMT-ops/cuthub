import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFavoritos } from '@/hooks/useFavoritos';
import type { AlvoFavorito } from '@/services/favoritos.service';

interface BotaoFavoritoProps {
  alvo: AlvoFavorito;
  /** Texto para leitor de tela — descreve o que está sendo favoritado. */
  rotulo: string;
  className?: string;
}

/**
 * Coração de favoritar, usado no catálogo, no perfil e no histórico.
 *
 * Só aparece para quem está logado como cliente — favoritar é um dado da conta,
 * e um visitante anônimo não tem onde guardar. Em vez de esconder e deixar a
 * pessoa sem saber que existe, o botão convida para o login.
 */
export function BotaoFavorito({ alvo, rotulo, className }: BotaoFavoritoProps) {
  const navigate = useNavigate();
  const { user, tipo } = useAuth();
  const { encontrar, alternar, isSalvando } = useFavoritos();

  const favoritado = !!user && !!encontrar(alvo);

  // Quem gerencia barbearia não favorita: favorito é da experiência do cliente.
  if (user && tipo && tipo !== 'cliente') return null;

  const aoClicar = async () => {
    if (!user) {
      toast.info('Entre na sua conta para salvar favoritos.');
      navigate('/login');
      return;
    }
    try {
      const agora = await alternar(alvo);
      toast.success(agora ? 'Salvo nos favoritos.' : 'Removido dos favoritos.');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível salvar o favorito');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      disabled={isSalvando}
      onClick={(e) => {
        // O coração costuma ficar dentro de um card clicável.
        e.preventDefault();
        e.stopPropagation();
        void aoClicar();
      }}
      aria-pressed={favoritado}
      aria-label={favoritado ? `Remover ${rotulo} dos favoritos` : `Favoritar ${rotulo}`}
      title={favoritado ? 'Remover dos favoritos' : 'Favoritar'}
    >
      <Heart
        className={`h-4 w-4 ${favoritado ? 'fill-primary text-primary' : ''}`}
        aria-hidden="true"
      />
    </Button>
  );
}
