import React, { useEffect, useState, useCallback } from 'react';
import {
  LogIn,
  PlusCircle,
  Pencil,
  Trash2,
  ShieldAlert,
  Calendar,
  RefreshCw,
  Package,
  Users,
  Sprout,
  Truck,
} from 'lucide-react';
import { loadLogsPorData, LogAcesso } from '../services/firebase';

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatarHora(timestamp: any): string {
  if (!timestamp) return '--:--';
  try {
    const data = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '--:--';
  }
}

const TIPO_CONFIG: Record<LogAcesso['tipo'], { label: string; icon: React.ReactNode; cor: string }> = {
  login: { label: 'Login', icon: <LogIn className="w-4 h-4" />, cor: '#1F3D2B' },
  criacao: { label: 'Criação', icon: <PlusCircle className="w-4 h-4" />, cor: '#5E8F52' },
  edicao: { label: 'Edição', icon: <Pencil className="w-4 h-4" />, cor: '#C08A2E' },
  exclusao: { label: 'Exclusão', icon: <Trash2 className="w-4 h-4" />, cor: '#A6432F' },
};

const ENTIDADE_ICON: Record<string, React.ReactNode> = {
  pedido: <Package className="w-3.5 h-3.5" />,
  cliente: <Users className="w-3.5 h-3.5" />,
  produto: <Sprout className="w-3.5 h-3.5" />,
  funcionario: <Truck className="w-3.5 h-3.5" />,
};

export const RegistroAcessoTab: React.FC = () => {
  const [dataSelecionada, setDataSelecionada] = useState<string>(hojeISO());
  const [logs, setLogs] = useState<LogAcesso[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarLogs = useCallback(async (dataISO: string) => {
    setLoading(true);
    setErro(null);
    try {
      const resultado = await loadLogsPorData(dataISO);
      setLogs(resultado);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível carregar os registros de acesso.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarLogs(dataSelecionada);
  }, [dataSelecionada, carregarLogs]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#1F3D2B]" />
          <h2 className="text-lg font-bold font-serif text-[#132A1D] m-0">
            Registro de Acesso
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-[#D8D9C9] rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-[#4B564C]" />
            <input
              type="date"
              value={dataSelecionada}
              max={hojeISO()}
              onChange={e => setDataSelecionada(e.target.value)}
              className="bg-transparent text-sm font-semibold text-[#1B2420] outline-none"
            />
          </div>
          <button
            onClick={() => carregarLogs(dataSelecionada)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1F3D2B] text-white hover:bg-[#1F3D2B]/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-[#D8D9C9] rounded-2xl overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-sm text-[#4B564C]">
            Carregando registros...
          </div>
        )}

        {!loading && erro && (
          <div className="p-8 text-center text-sm text-[#A6432F] font-semibold">
            {erro}
          </div>
        )}

        {!loading && !erro && logs.length === 0 && (
          <div className="p-8 text-center text-sm text-[#4B564C]">
            Nenhum registro de acesso encontrado para esta data.
          </div>
        )}

        {!loading && !erro && logs.length > 0 && (
          <ul className="divide-y divide-[#EEF1E9]">
            {logs.map(log => {
              const tipoInfo = TIPO_CONFIG[log.tipo] || TIPO_CONFIG.edicao;
              return (
                <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${tipoInfo.cor}1A`, color: tipoInfo.cor }}
                  >
                    {tipoInfo.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-[#132A1D]">
                        {log.apelido || log.email}
                      </span>
                      <span
                        className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: tipoInfo.cor }}
                      >
                        {tipoInfo.label}
                      </span>
                      {log.entidade && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#4B564C] bg-[#EEF1E9] px-2 py-0.5 rounded-full">
                          {ENTIDADE_ICON[log.entidade]}
                          {log.entidade}
                        </span>
                      )}
                    </div>
                    {log.descricao && (
                      <p className="text-xs text-[#4B564C] mt-1 m-0">{log.descricao}</p>
                    )}
                    <p className="text-[11px] text-[#8A907E] mt-1 m-0">{log.email}</p>
                  </div>

                  <span className="text-xs font-mono text-[#4B564C] shrink-0">
                    {formatarHora(log.timestamp)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-[#8A907E] text-center">
        Esta aba é visível apenas para administradores. Registros não podem ser editados ou excluídos.
      </p>
    </div>
  );
};
