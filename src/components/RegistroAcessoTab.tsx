import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  UserCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { loadLogsPorData, LogAcesso, restaurarPedido, restaurarItemEmLista, marcarLogComoRecuperado } from '../services/firebase';

function hojeISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

const CHAVE_LISTA: Record<string, 'clientes' | 'produtos' | 'funcionarios'> = {
  cliente: 'clientes',
  produto: 'produtos',
  funcionario: 'funcionarios',
};

export const RegistroAcessoTab: React.FC = () => {
  const [dataSelecionada, setDataSelecionada] = useState<string>(hojeISO());
  const [logs, setLogs] = useState<LogAcesso[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [apelidoFiltro, setApelidoFiltro] = useState<string>('todos');
  const [recuperandoId, setRecuperandoId] = useState<string | null>(null);

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
    setApelidoFiltro('todos');
  }, [dataSelecionada, carregarLogs]);

  const apelidosDoDia: string[] = useMemo(() => {
    const unicos: string[] = Array.from(new Set(logs.map(l => l.apelido || l.email)));
    return unicos.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [logs]);

  const logsFiltrados = useMemo(() => {
    if (apelidoFiltro === 'todos') return logs;
    return logs.filter(l => (l.apelido || l.email) === apelidoFiltro);
  }, [logs, apelidoFiltro]);

  const handleRecuperar = async (log: LogAcesso) => {
    if (!log.id || !log.dadosAntes || !log.entidade) return;
    if (!window.confirm('Deseja restaurar este item excluído? Ele voltará a aparecer na lista correspondente.')) return;

    setRecuperandoId(log.id);
    try {
      const dados = JSON.parse(log.dadosAntes);
      if (log.entidade === 'pedido') {
        await restaurarPedido(dados);
      } else {
        const chave = CHAVE_LISTA[log.entidade];
        if (chave) await restaurarItemEmLista(chave, dados);
      }
      await marcarLogComoRecuperado(log.id);
      setLogs(prev => prev.map(l => (l.id === log.id ? { ...l, recuperado: true } : l)));
      alert('Item restaurado! Atualize a página (F5) para vê-lo de volta na lista.');
    } catch (e) {
      console.error(e);
      alert('Não foi possível restaurar este item.');
    } finally {
      setRecuperandoId(null);
    }
  };

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

        <div className="flex flex-wrap items-center gap-2">
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

          {apelidosDoDia.length > 1 && (
            <div className="flex items-center gap-2 bg-white border border-[#D8D9C9] rounded-xl px-3 py-2">
              <UserCircle className="w-4 h-4 text-[#4B564C]" />
              <select
                value={apelidoFiltro}
                onChange={e => setApelidoFiltro(e.target.value)}
                className="bg-transparent text-sm font-semibold text-[#1B2420] outline-none cursor-pointer"
              >
                <option value="todos">Todos</option>
                {apelidosDoDia.map(apelido => (
                  <option key={apelido} value={apelido}>{apelido}</option>
                ))}
              </select>
            </div>
          )}

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

        {!loading && !erro && logsFiltrados.length === 0 && (
          <div className="p-8 text-center text-sm text-[#4B564C]">
            Nenhum registro de acesso encontrado para esta data{apelidoFiltro !== 'todos' ? ' e pessoa selecionada' : ''}.
          </div>
        )}

        {!loading && !erro && logsFiltrados.length > 0 && (
          <ul className="divide-y divide-[#EEF1E9]">
            {logsFiltrados.map(log => {
              const tipoInfo = TIPO_CONFIG[log.tipo] || TIPO_CONFIG.edicao;
              const podeRecuperar = log.tipo === 'exclusao' && !!log.dadosAntes && !log.recuperado;
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
                      {log.recuperado && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#5E8F52] bg-[#5E8F52]/10 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" />
                          Recuperado
                        </span>
                      )}
                    </div>
                    {log.descricao && (
                      <p className="text-xs text-[#4B564C] mt-1 m-0">{log.descricao}</p>
                    )}
                    <p className="text-[11px] text-[#8A907E] mt-1 m-0">{log.email}</p>

                    {podeRecuperar && (
                      <button
                        onClick={() => handleRecuperar(log)}
                        disabled={recuperandoId === log.id}
                        className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#1F3D2B] border border-[#1F3D2B]/30 hover:bg-[#1F3D2B]/5 disabled:opacity-50 transition-colors"
                      >
                        <RotateCcw className={`w-3 h-3 ${recuperandoId === log.id ? 'animate-spin' : ''}`} />
                        Recuperar
                      </button>
                    )}
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
        Esta aba é visível apenas para administradores. Itens excluídos podem ser recuperados enquanto o log existir.
      </p>
    </div>
  );
};
