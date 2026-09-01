import React from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Cliente, LembreteRetirada } from '../types';

interface LembretesBannerProps {
  clientes: Cliente[];
  onMarcarRetiradoHoje: (clienteId: string) => void;
}

export const LembretesBanner: React.FC<LembretesBannerProps> = ({ clientes, onMarcarRetiradoHoje }) => {
  const hoje = new Date().toISOString().slice(0, 10);

  const lembretes: LembreteRetirada[] = clientes
    .filter(c => c.periodicidadeRelatorio)
    .map(c => {
      let proxima = hoje;
      if (c.ultimaRetiradaRelatorio) {
        const d = new Date(c.ultimaRetiradaRelatorio + 'T00:00:00');
        d.setDate(d.getDate() + (c.periodicidadeRelatorio || 0));
        proxima = d.toISOString().slice(0, 10);
      }
      const atrasoDias = Math.round(
        (new Date(hoje + 'T00:00:00').getTime() - new Date(proxima + 'T00:00:00').getTime()) / 86400000
      );
      return { cliente: c, proxima, atrasoDias };
    })
    .filter(x => x.proxima <= hoje)
    .sort((a, b) => b.atrasoDias - a.atrasoDias);

  if (lembretes.length === 0) return null;

  return (
    <div
      id="bannerLembretes"
      className="bg-gradient-to-r from-[#FDECE8] to-[#FBDCD3] border-2 border-[#A6432F] rounded-xl p-4 sm:p-5 mb-6 shadow-md animate-lembrete-pulso"
    >
      <div className="flex items-center gap-2 font-extrabold text-[#A6432F] text-base mb-3 tracking-wide">
        <AlertTriangle className="w-5 h-5 text-[#A6432F] animate-bounce shrink-0" />
        <span>
          Relatório pra retirar — {lembretes.length} cliente{lembretes.length > 1 ? 's' : ''} pendente{lembretes.length > 1 ? 's' : ''}!
        </span>
      </div>

      <ul className="space-y-2.5 m-0 p-0 list-none">
        {lembretes.map(({ cliente, atrasoDias }) => (
          <li
            key={cliente.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2.5 border-t border-[#A6432F]/20 text-sm font-semibold text-[#6b241a]"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#132A1D] text-base">
                {cliente.apelido || cliente.nome}
              </span>
              {cliente.ultimaRetiradaRelatorio ? (
                <span
                  className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full text-white inline-flex items-center gap-1 ${
                    atrasoDias <= 3 ? 'bg-[#C08A2E]' : 'bg-[#A6432F]'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  vencido há {atrasoDias} dia{atrasoDias === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#A6432F] text-white">
                  nunca retirado
                </span>
              )}
            </div>

            <button
              onClick={() => onMarcarRetiradoHoje(cliente.id)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#A6432F] hover:bg-[#7d3222] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar retirado hoje
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
