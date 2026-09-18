import { Link, Navigate } from 'react-router-dom';
import { CalendarHeart, Scissors } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { rotaInicialDoPapel } from '@/lib/auth/areas';

/**
 * Escolha do "chapéu" depois do login.
 *
 * Existe porque uma mesma pessoa tem duas vidas no CutHub: o barbeiro corta
 * cabelo numa barbearia e agenda corte em outra; o dono agenda na própria.
 * Antes o login mandava direto para a área de trabalho e a vida de consumidor
 * ficava inacessível para quem trabalha.
 *
 * Quem só é cliente nunca chega aqui — o `Login` manda direto. Perguntar a
 * quem tem uma porta só é atrito.
 */
export default function EscolherAcesso() {
  const { perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const rotaDeTrabalho = rotaInicialDoPapel(perfil?.tipo);

  // Cliente puro não tem escolha a fazer. Se cair aqui por URL digitada, vai
  // para a conta dele em vez de encarar um card que não se aplica.
  if (!perfil || !rotaDeTrabalho || rotaDeTrabalho.startsWith('/minha-conta')) {
    return <Navigate to="/minha-conta" replace />;
  }

  const primeiroNome = perfil.nome?.split(' ')[0];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {primeiroNome ? `Olá, ${primeiroNome}.` : 'Olá.'} Como você quer acessar o CutHub hoje?
          </h1>
          <p className="text-sm text-muted-foreground">
            Você pode trocar a qualquer momento saindo e entrando de novo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CartaoDeAcesso
            para={rotaDeTrabalho}
            icone={<Scissors className="h-6 w-6" aria-hidden="true" />}
            titulo="Painel da barbearia"
            descricao={
              perfil.tipo === 'profissional'
                ? 'Sua agenda e os seus atendimentos.'
                : 'Agenda, equipe, catálogo e caixa da sua barbearia.'
            }
            rotulo="Entrar no painel"
          />

          <CartaoDeAcesso
            para="/minha-conta"
            icone={<CalendarHeart className="h-6 w-6" aria-hidden="true" />}
            titulo="Área do cliente"
            descricao="Seus agendamentos como cliente, favoritos e ofertas."
            rotulo="Entrar como cliente"
            variante="outline"
          />
        </div>
      </div>
    </div>
  );
}

function CartaoDeAcesso({
  para,
  icone,
  titulo,
  descricao,
  rotulo,
  variante,
}: {
  para: string;
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
  rotulo: string;
  variante?: 'outline';
}) {
  return (
    <Link
      to={para}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-6 transition-colors hover:border-primary/60"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icone}
      </span>
      <div className="flex-1 space-y-1">
        <h2 className="font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
      {/* `asChild` nao entra aqui: o card inteiro ja e o link, e um <a> dentro
          de outro <a> e HTML invalido. O botao e so a affordance visual. */}
      <Button variant={variante} className="w-full" tabIndex={-1} type="button">
        {rotulo}
      </Button>
    </Link>
  );
}
