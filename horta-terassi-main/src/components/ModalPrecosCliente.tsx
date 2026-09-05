import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle2, RotateCcw } from 'lucide-react';
import { Cliente, PrecosOverrides, Produto } from '../types';
import { fmtMoeda } from '../utils/formatters';

interface ModalPrecosClienteProps {
  clienteId: string | null;
  clientes: Cliente[];
  produtos: Produto[];
  precosOverrides: PrecosOverrides;
  onSalvarPrecos: (clienteId: string, overrides: Record<string, number>) => void;
  onClose: () => void;
}

export const ModalPrecosCliente: React.FC<ModalPrecosClienteProps> = ({
  clienteId,
  clientes,
  produtos,
  precosOverrides,
  onSalvarPrecos,
  onClose,
}) => {
  if (!clienteId) return null;

  const cliente = clientes.find(c => c.id === clienteId);
  const [valores, setValores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (clienteId) {
      const overrides = precosOverrides[clienteId] || {};
      const stateInit: Record<string, string> = {};
      produtos.forEach(p => {
        const key = p.codigo || `DESC:${p.descricao}`;
        if (overrides[key] != null && overrides[key] !== undefined) {
          stateInit[key] = String(overrides[key]);
        }
      });
      setValores(stateInit);
    }
  }, [clienteId, precosOverrides, produtos]);

  if (!cliente) return null;

  const handlePriceChange = (key: string, val: string) => {
    setValores(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleClearAllOverrides = () => {
    setValores({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalOverrides: Record<string, number> = {};
    Object.entries(valores).forEach(([key, valStr]) => {
      const num = parseFloat(String(valStr));
      if (!isNaN(num) && num > 0) {
        finalOverrides[key] = num;
      }
    });

    onSalvarPrecos(cliente.id, finalOverrides);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#132A1D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#D8D9C9] max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-[#D8D9C9] pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#1F3D2B]" />
            <div>
              <h3 className="font-serif font-bold text-lg text-[#132A1D] m-0">
                Preços especiais — {cliente.apelido || cliente.nome}
              </h3>
              <p className="text-xs text-[#4B564C] mt-0.5">
                Deixe em branco para usar o preço padrão do produto. Preencha apenas o que for diferenciado para este mercado.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#4B564C] hover:text-[#132A1D] hover:bg-[#EEF1E9] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-80 overflow-y-auto border border-[#D8D9C9] rounded-xl p-2 divide-y divide-[#EEF1E9]">
            {produtos.map(p => {
              const key = p.codigo || `DESC:${p.descricao}`;
              const val = valores[key] || '';
              const isCustom = val.trim() !== '';

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-lg transition-colors ${
                    isCustom ? 'bg-[#5E8F52]/10 border border-[#5E8F52]/30' : 'hover:bg-[#EEF1E9]/30'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-semibold text-[#132A1D] block truncate">
                      {p.descricao}
                    </span>
                    <span className="text-[11px] text-[#4B564C] font-mono">
                      Preço padrão: {fmtMoeda(p.valor)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono text-[#4B564C]">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={p.valor.toFixed(2)}
                      value={val}
                      onChange={e => handlePriceChange(key, e.target.value)}
                      className={`w-20 px-2 py-1 text-right font-mono text-xs rounded border ${
                        isCustom
                          ? 'border-[#5E8F52] bg-white font-bold text-[#1F3D2B]'
                          : 'border-[#D8D9C9] bg-white text-[#4B564C]'
                      } focus:outline-none focus:ring-1 focus:ring-[#5E8F52]`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#D8D9C9]">
            <button
              type="button"
              onClick={handleClearAllOverrides}
              className="text-xs font-semibold text-[#4B564C] hover:text-[#A6432F] flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar todos para padrão
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#5E8F52]" />
                Salvar tabela
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
