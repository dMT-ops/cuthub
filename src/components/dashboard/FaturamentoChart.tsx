import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatarMoeda } from '@/lib/utils';
import type { PontoFaturamento } from '@/services/dashboard.service';

interface FaturamentoChartProps {
  dados: PontoFaturamento[];
}

export function FaturamentoChart({ dados }: FaturamentoChartProps) {
  const temMovimento = dados.some((ponto) => ponto.valor > 0);

  if (!temMovimento) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Nenhuma entrada registrada no caixa neste período.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="dia"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          // Com 30 dias, rotular todos embola o eixo
          interval={Math.max(0, Math.floor(dados.length / 8) - 1)}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(valor: number) => `R$ ${valor}`}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            fontSize: '0.8rem',
          }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          formatter={(valor) => [formatarMoeda(Number(valor ?? 0)), 'Entradas']}
        />
        <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
