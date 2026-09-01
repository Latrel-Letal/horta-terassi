import React, { useState } from 'react';
import { Truck, Plus, Edit3, Trash2, CheckCircle2, User, Search, RotateCcw } from 'lucide-react';
import { Cliente, Funcionario, Pedido } from '../types';

interface EntregadoresTabProps {
  funcionarios: Funcionario[];
  clientes: Cliente[];
  pedidos: Pedido[];
  onSalvarFuncionario: (func: Funcionario) => void;
  onExcluirFuncionario: (id: string) => void;
}

export const EntregadoresTab: React.FC<EntregadoresTabProps> = ({
  funcionarios,
  clientes,
  pedidos,
  onSalvarFuncionario,
  onExcluirFuncionario,
}) => {
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [mercadosSelecionados, setMercadosSelecionados] = useState<string[]>([]);
  const [buscaMercadoForm, setBuscaMercadoForm] = useState('');

  // Analytics Filter State
  const [entregDe, setEntregDe] = useState('');
  const [entregAte, setEntregAte] = useState('');
  const [filtroMercadosCheck, setFiltroMercadosCheck] = useState<string[]>([]);
  const [buscaMercadoFiltro, setBuscaMercadoFiltro] = useState('');
  const [filtroEntregador, setFiltroEntregador] = useState('');
  const [ordemMercado, setOrdemMercado] = useState<'desc' | 'asc' | 'alfa'>('desc');
  const [ordemFunc, setOrdemFunc] = useState<'desc' | 'asc' | 'alfa'>('desc');

  const getClienteNome = (id: string) => {
    const c = clientes.find(x => x.id === id);
    return c ? (c.apelido || c.nome) : '(removido)';
  };

  const handleIniciarEdicao = (f: Funcionario) => {
    setEditingId(f.id);
    setNome(f.nome);
    setMercadosSelecionados(f.clientesIds || []);

    const el = document.getElementById('formEntregador');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelarEdicao = () => {
    setEditingId(null);
    setNome('');
    setMercadosSelecionados([]);
    setBuscaMercadoForm('');
  };

  const handleToggleMercadoForm = (clienteId: string) => {
    setMercadosSelecionados(prev =>
      prev.includes(clienteId) ? prev.filter(id => id !== clienteId) : [...prev, clienteId]
    );
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Preencha o nome do entregador.');
      return;
    }

    onSalvarFuncionario({
      id: editingId || `f_${Date.now().toString(36)}`,
      nome: nome.trim(),
      clientesIds: mercadosSelecionados,
    });

    handleCancelarEdicao();
  };

  // Deliveries calculation based on delivered orders
  const pedidosEntregues = pedidos.filter(p => {
    if (p.status !== 'entregue') return false;
    const dataRef = p.dataEntrega || p.data;
    if (entregDe && dataRef < entregDe) return false;
    if (entregAte && dataRef > entregAte) return false;
    if (filtroMercadosCheck.length > 0 && !filtroMercadosCheck.includes(p.clienteId)) return false;
    return true;
  });

  const porMercado: Record<string, number> = {};
  pedidosEntregues.forEach(p => {
    porMercado[p.clienteId] = (porMercado[p.clienteId] || 0) + 1;
  });

  // Sort Deliveries per market
  let idsMercado = Object.keys(porMercado);
  if (ordemMercado === 'alfa') {
    idsMercado.sort((a, b) => getClienteNome(a).localeCompare(getClienteNome(b)));
  } else if (ordemMercado === 'asc') {
    idsMercado.sort(
      (a, b) => porMercado[a] - porMercado[b] || getClienteNome(a).localeCompare(getClienteNome(b))
    );
  } else {
    idsMercado.sort(
      (a, b) => porMercado[b] - porMercado[a] || getClienteNome(a).localeCompare(getClienteNome(b))
    );
  }

  // Sort Deliveries per driver
  const funcionariosParaExibir = filtroEntregador
    ? funcionarios.filter(f => f.id === filtroEntregador)
    : funcionarios;

  let linhasFunc = funcionariosParaExibir.map(f => {
    const total = (f.clientesIds || []).reduce((s, cid) => s + (porMercado[cid] || 0), 0);
    return { id: f.id, nome: f.nome, total };
  });

  if (ordemFunc === 'alfa') {
    linhasFunc.sort((a, b) => a.nome.localeCompare(b.nome));
  } else if (ordemFunc === 'asc') {
    linhasFunc.sort((a, b) => a.total - b.total || a.nome.localeCompare(b.nome));
  } else {
    linhasFunc.sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
  }

  return (
    <div className="space-y-8">
      {/* SECTION 1: FUNCIONÁRIOS CADASTRADOS */}
      <div>
        <div className="border-b border-[#D8D9C9] pb-3 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0">
            Funcionários / Entregadores
          </h2>
          <p className="text-xs text-[#4B564C] mt-0.5">
            Cadastre quem faz as entregas de cada rota e quais mercados estão associados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {funcionarios.map(f => (
            <div
              key={f.id}
              className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm hover:border-[#1F3D2B]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#1F3D2B] text-[#5E8F52] flex items-center justify-center font-bold text-xs">
                      {f.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <h3 className="font-serif font-bold text-lg text-[#132A1D] m-0">
                      {f.nome}
                    </h3>
                  </div>
                  <span className="font-mono text-xs bg-[#EEF1E9] text-[#4B564C] px-2 py-0.5 rounded-full border border-[#D8D9C9]">
                    {(f.clientesIds || []).length} mercado(s)
                  </span>
                </div>

                <div className="text-xs text-[#4B564C] mb-4">
                  <span className="font-bold text-[#132A1D] block mb-1">Mercados atendidos:</span>
                  <div className="flex flex-wrap gap-1">
                    {(f.clientesIds || []).length === 0 ? (
                      <span className="italic text-[#4B564C]">Nenhum mercado associado ainda.</span>
                    ) : (
                      f.clientesIds.map(cid => (
                        <span
                          key={cid}
                          className="bg-[#EEF1E9] border border-[#D8D9C9] px-2 py-0.5 rounded text-[11px] font-medium text-[#132A1D]"
                        >
                          {getClienteNome(cid)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8D9C9]/60">
                <button
                  onClick={() => handleIniciarEdicao(f)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] bg-white hover:bg-[#EEF1E9] border border-[#D8D9C9] rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => onExcluirFuncionario(f.id)}
                  className="p-1.5 text-[#A6432F] hover:bg-[#FDF4F2] border border-[#A6432F]/30 rounded-lg transition-colors"
                  title="Excluir funcionário"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: ADICIONAR / EDITAR FUNCIONÁRIO */}
      <div id="formEntregador">
        <div className="border-b border-[#D8D9C9] pb-3 mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#132A1D] m-0">
              {editingId ? 'Editar funcionário' : 'Adicionar funcionário'}
            </h2>
            <p className="text-xs text-[#4B564C] mt-0.5">
              Associe os mercados em que o entregador é responsável pela entrega.
            </p>
          </div>

          {editingId && (
            <button
              onClick={handleCancelarEdicao}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#4B564C] hover:text-[#A6432F] bg-white border border-[#D8D9C9] rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitForm} className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
              Nome do funcionário
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Carlos Eduardo"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
              Mercados que entrega
            </label>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-[#4B564C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaMercadoForm}
                onChange={e => setBuscaMercadoForm(e.target.value)}
                placeholder="Filtrar mercados na lista..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5E8F52]"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-[#D8D9C9] rounded-lg p-3 space-y-2 bg-[#EEF1E9]/20 divide-y divide-[#D8D9C9]/50">
              {clientes
                .filter(c =>
                  (c.apelido || c.nome).toLowerCase().includes(buscaMercadoForm.toLowerCase())
                )
                .map(c => {
                  const checked = mercadosSelecionados.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2.5 pt-1.5 cursor-pointer select-none text-xs font-medium text-[#132A1D]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleMercadoForm(c.id)}
                        className="w-4 h-4 accent-[#1F3D2B] rounded"
                      />
                      <span>{c.apelido || c.nome}</span>
                      {c.bairro && <span className="text-[#4B564C] text-[11px]">({c.bairro})</span>}
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#5E8F52]" />
              <span>{editingId ? 'Atualizar funcionário' : 'Salvar funcionário'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3: RELATÓRIO DE ENTREGAS POR MERCADO E ENTREGADOR */}
      <div>
        <div className="border-b border-[#D8D9C9] pb-3 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0">
            Entregas por mercado e por entregador
          </h2>
          <p className="text-xs text-[#4B564C] mt-0.5">
            Considera pedidos já marcados como entregues no período selecionado.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#D8D9C9] rounded-xl p-4 shadow-sm mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                De
              </label>
              <input
                type="date"
                value={entregDe}
                onChange={e => setEntregDe(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Até
              </label>
              <input
                type="date"
                value={entregAte}
                onChange={e => setEntregAte(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Entregador
              </label>
              <select
                value={filtroEntregador}
                onChange={e => setFiltroEntregador(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              >
                <option value="">Todos os entregadores</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setEntregDe('');
                  setEntregAte('');
                  setFiltroMercadosCheck([]);
                  setFiltroEntregador('');
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] bg-[#EEF1E9] hover:bg-[#D8D9C9] rounded-lg transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Results Dual Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Deliveries per Market */}
          <div className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#D8D9C9]">
              <h3 className="font-serif font-bold text-base text-[#132A1D] m-0">
                Entregas por mercado
              </h3>
              <select
                value={ordemMercado}
                onChange={e => setOrdemMercado(e.target.value as any)}
                className="text-xs px-2 py-1 bg-[#EEF1E9] border border-[#D8D9C9] rounded font-semibold"
              >
                <option value="desc">Maior → menor</option>
                <option value="asc">Menor → maior</option>
                <option value="alfa">Ordem alfabética</option>
              </select>
            </div>

            {idsMercado.length === 0 ? (
              <p className="text-xs text-[#4B564C] text-center py-6">
                Nenhum pedido entregue no período/filtro.
              </p>
            ) : (
              <div className="divide-y divide-[#EEF1E9]">
                {idsMercado.map(cid => (
                  <div key={cid} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#132A1D]">{getClienteNome(cid)}</span>
                    <span className="font-mono font-bold bg-[#EEF1E9] text-[#1F3D2B] px-2.5 py-0.5 rounded-full text-xs">
                      {porMercado[cid]} entrega(s)
                    </span>
                  </div>
                ))}
                <div className="pt-3 flex items-center justify-between font-bold text-sm text-[#1F3D2B] border-t-2 border-[#1F3D2B]">
                  <span>Total</span>
                  <span className="font-mono">{pedidosEntregues.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* Deliveries per Driver */}
          <div className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#D8D9C9]">
              <h3 className="font-serif font-bold text-base text-[#132A1D] m-0">
                Entregas por entregador
              </h3>
              <select
                value={ordemFunc}
                onChange={e => setOrdemFunc(e.target.value as any)}
                className="text-xs px-2 py-1 bg-[#EEF1E9] border border-[#D8D9C9] rounded font-semibold"
              >
                <option value="desc">Maior → menor</option>
                <option value="asc">Menor → maior</option>
                <option value="alfa">Ordem alfabética</option>
              </select>
            </div>

            {linhasFunc.length === 0 ? (
              <p className="text-xs text-[#4B564C] text-center py-6">
                Nenhum entregador cadastrado.
              </p>
            ) : (
              <div className="divide-y divide-[#EEF1E9]">
                {linhasFunc.map(f => (
                  <div key={f.id} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#132A1D]">{f.nome}</span>
                    <span className="font-mono font-bold bg-[#5E8F52]/15 text-[#1F3D2B] px-2.5 py-0.5 rounded-full text-xs">
                      {f.total} entrega(s)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
