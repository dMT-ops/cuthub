import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatarMoeda } from '@/lib/utils';
import type { PontoFaturamento } from '@/services/dashboard.service';

interface FaturamentoChartProps {
  dados: PontoFaturamento[];
  /** Chamado ao clicar em um ponto do gráfico, com o rótulo do dia (dd/MM) */
  onPontoClick?: (dia: string) => void;
}

export function FaturamentoChart({ dados, onPontoClick }: FaturamentoChartProps) {
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
      <ComposedChart
        data={dados}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        onClick={(estado: any) => {
          const dia = estado?.activeLabel;
          if (dia && onPontoClick) onPontoClick(dia);
        }}
        className={onPontoClick ? 'cursor-pointer' : undefined}
      >
        <defs>
          {/* Preenchimento suave sob a linha, do tom da marca até transparente */}
          <linearGradient id="gradienteFaturamento" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>

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
          cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            fontSize: '0.8rem',
          }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          formatter={(valor) => [formatarMoeda(Number(valor ?? 0)), 'Entradas']}
        />

        <Area
          type="monotone"
          dataKey="valor"
          stroke="none"
          fill="url(#gradienteFaturamento)"
          isAnimationActive
          animationDuration={1500}
          animationEasing="ease-in-out"
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
          isAnimationActive
          animationDuration={1500}
          animationEasing="ease-in-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
