import React, { useState } from 'react';
import { Plus, Search, DollarSign, Edit3, Trash2, CheckCircle2, Building2, MapPin } from 'lucide-react';
import { Cliente } from '../types';
import { hojeISO } from '../utils/formatters';

interface ClientesTabProps {
  clientes: Cliente[];
  onAdicionarCliente: () => void;
  onEditarCliente: (cliente: Cliente) => void;
  onExcluirCliente: (clienteId: string) => void;
  onOpenPrecosCliente: (clienteId: string) => void;
  onUpdateClienteField: (clienteId: string, updates: Partial<Cliente>) => void;
}

export const ClientesTab: React.FC<ClientesTabProps> = ({
  clientes,
  onAdicionarCliente,
  onEditarCliente,
  onExcluirCliente,
  onOpenPrecosCliente,
  onUpdateClienteField,
}) => {
  const [busca, setBusca] = useState('');

  const listaFiltrada = clientes
    .filter(
      c =>
        (c.apelido || '').toLowerCase().includes(busca.toLowerCase()) ||
        (c.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (c.bairro || '').toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a, b) => (a.apelido || a.nome || '').localeCompare(b.apelido || b.nome || '', 'pt-BR'));

  const handleMarcarRetiradoHoje = (clienteId: string) => {
    const hoje = hojeISO();
    onUpdateClienteField(clienteId, { ultimaRetiradaRelatorio: hoje });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#D8D9C9] pb-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0">
            Clientes cadastrados
          </h2>
          <p className="text-xs text-[#4B564C] mt-0.5">
            Gerencie os mercados, endereços para nota fiscal e lembretes de retirada de relatório.
          </p>
        </div>

        <button
          onClick={onAdicionarCliente}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs md:text-sm font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] rounded-xl transition-all shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#5E8F52]" />
          Adicionar cliente
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#4B564C] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por apelido, razão social ou bairro..."
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
        />
      </div>

      {/* Clients Cards / Table */}
      {listaFiltrada.length === 0 ? (
        <div className="bg-white border border-[#D8D9C9] rounded-xl p-8 text-center text-[#4B564C] shadow-sm">
          <Building2 className="w-8 h-8 text-[#4B564C]/50 mx-auto mb-2" />
          <p className="font-semibold text-[#132A1D]">Nenhum cliente encontrado</p>
          <p className="text-xs mt-1">Cadastre seu primeiro mercado no botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listaFiltrada.map(c => (
            <div
              key={c.id}
              className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm hover:border-[#1F3D2B]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#132A1D] m-0">
                      {c.apelido || c.nome}
                    </h3>
                    {c.nome && c.apelido && (
                      <div className="text-xs text-[#4B564C]">{c.nome}</div>
                    )}
                  </div>
                  {c.cnpj && (
                    <span className="font-mono text-[11px] bg-[#EEF1E9] text-[#4B564C] px-2 py-0.5 rounded border border-[#D8D9C9]">
                      {c.cnpj}
                    </span>
                  )}
                </div>

                {/* Address info */}
                <div className="text-xs text-[#4B564C] space-y-1 mb-4">
                  {(c.endereco || c.bairro) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#5E8F52] shrink-0" />
                      <span>
                        {[c.endereco, c.bairro, c.municipio].filter(Boolean).join(' — ')}
                      </span>
                    </div>
                  )}
                  {c.ie && <div>Inscrição Estadual: <strong className="font-mono">{c.ie}</strong></div>}
                </div>

                {/* Reminder Settings */}
                <div className="bg-[#EEF1E9]/40 border border-[#D8D9C9] rounded-lg p-3 space-y-2 mb-4">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#4B564C] uppercase tracking-wider">
                      Lembrete de relatório:
                    </span>
                    <select
                      value={c.periodicidadeRelatorio || ''}
                      onChange={e =>
                        onUpdateClienteField(c.id, {
                          periodicidadeRelatorio: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="px-2 py-1 text-xs bg-white border border-[#D8D9C9] rounded font-semibold focus:outline-none focus:ring-1 focus:ring-[#5E8F52]"
                    >
                      <option value="">Sem lembrete</option>
                      <option value="7">A cada 7 dias</option>
                      <option value="15">A cada 15 dias</option>
                      <option value="30">A cada 30 dias</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#4B564C]">Última retirada:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={c.ultimaRetiradaRelatorio || ''}
                        onChange={e =>
                          onUpdateClienteField(c.id, {
                            ultimaRetiradaRelatorio: e.target.value,
                          })
                        }
                        className="px-2 py-1 text-xs bg-white border border-[#D8D9C9] rounded font-mono"
                      />
                      {c.periodicidadeRelatorio && (
                        <button
                          type="button"
                          onClick={() => handleMarcarRetiradoHoje(c.id)}
                          title="Marcar como retirado hoje"
                          className="p-1 text-[#5E8F52] hover:bg-[#5E8F52]/10 rounded transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#D8D9C9]/60">
                <button
                  onClick={() => onOpenPrecosCliente(c.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#1F3D2B] bg-[#EEF1E9] hover:bg-[#D8D9C9] rounded-lg transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Tabela de Preços
                </button>

                <button
                  onClick={() => onEditarCliente(c)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] bg-white hover:bg-[#EEF1E9] border border-[#D8D9C9] rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </button>

                <button
                  onClick={() => onExcluirCliente(c.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#A6432F] hover:bg-[#FDF4F2] border border-[#A6432F]/30 rounded-lg transition-colors ml-auto"
                  title="Excluir cliente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
