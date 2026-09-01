import React, { useState, useEffect } from 'react';
import { X, Copy, Printer, Check, Truck, FileText, Receipt } from 'lucide-react';
import { Cliente, Pedido, PrecosOverrides, Produto, TransporteConfig } from '../types';
import {
  calcularTotalPedido,
  gerarComprovanteHTML,
  gerarTextoFichaNFe
} from '../utils/formatters';

interface ModalFichaNotaProps {
  pedidoId: string | null;
  pedidos: Pedido[];
  clientes: Cliente[];
  produtos: Produto[];
  precosOverrides: PrecosOverrides;
  transporteConfig: TransporteConfig;
  onSaveTransporte: (transporte: TransporteConfig) => void;
  onSaveNotaDados: (pedidoId: string, notaNumero: string, notaChave: string) => void;
  onClose: () => void;
  onPrintThermal: (html: string) => void;
  showToast: (msg: string) => void;
}

export const ModalFichaNota: React.FC<ModalFichaNotaProps> = ({
  pedidoId,
  pedidos,
  clientes,
  produtos,
  precosOverrides,
  transporteConfig,
  onSaveTransporte,
  onSaveNotaDados,
  onClose,
  onPrintThermal,
  showToast,
}) => {
  if (!pedidoId) return null;

  const pedido = pedidos.find(p => p.id === pedidoId);
  const cliente = pedido ? clientes.find(c => c.id === pedido.clienteId) : null;

  const [placa, setPlaca] = useState(transporteConfig.placa || '');
  const [uf, setUf] = useState(transporteConfig.uf || 'PR');
  const [notaNumero, setNotaNumero] = useState(pedido?.notaNumero || '');
  const [notaChave, setNotaChave] = useState(pedido?.notaChave || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (pedido) {
      setNotaNumero(pedido.notaNumero || '');
      setNotaChave(pedido.notaChave || '');
    }
  }, [pedido]);

  if (!pedido || !cliente) return null;

  const currentTransporte: TransporteConfig = { placa, uf };
  const textoFicha = gerarTextoFichaNFe(pedido, cliente, produtos, currentTransporte, precosOverrides);
  const comprovanteHTML = gerarComprovanteHTML(pedido, cliente, produtos, precosOverrides);

  const handleTransporteChange = (newPlaca: string, newUf: string) => {
    setPlaca(newPlaca);
    setUf(newUf);
    onSaveTransporte({ placa: newPlaca, uf: newUf });
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textoFicha);
      setCopied(true);
      showToast('Texto da ficha copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('Selecione e copie manualmente o texto.');
    }
  };

  const handleSaveNota = () => {
    onSaveNotaDados(pedido.id, notaNumero.trim(), notaChave.trim());
    showToast('Dados da nota fiscal salvos com sucesso!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#132A1D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-[#D8D9C9] max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between border-b border-[#D8D9C9] pb-3">
          <div>
            <h3 className="font-serif font-bold text-xl text-[#132A1D] m-0">
              Ficha para emissão da NFP-e
            </h3>
            <p className="text-xs text-[#4B564C] mt-0.5">
              Portal Receita Estadual/PR · Produtor Rural
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#4B564C] hover:text-[#132A1D] hover:bg-[#EEF1E9] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transport Vehicle Settings */}
        <div className="bg-[#EEF1E9]/40 border border-[#D8D9C9] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F3D2B]">
            <Truck className="w-4 h-4 text-[#5E8F52]" />
            Transporte (veículo próprio na entrega)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#4B564C] mb-1">
                Placa do veículo
              </label>
              <input
                type="text"
                value={placa}
                onChange={e => handleTransporteChange(e.target.value.toUpperCase(), uf)}
                placeholder="ABC1D23"
                className="w-full px-3 py-1.5 text-sm font-mono uppercase bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#4B564C] mb-1">
                UF do veículo
              </label>
              <input
                type="text"
                maxLength={2}
                value={uf}
                onChange={e => handleTransporteChange(placa, e.target.value.toUpperCase())}
                placeholder="PR"
                className="w-full px-3 py-1.5 text-sm font-mono uppercase bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
          </div>
        </div>

        {/* Formatted Textarea for NFP-e Portal */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B564C] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#1F3D2B]" />
              Dados formatados para preencher no Portal da Receita
            </label>
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1 text-xs font-bold text-[#1F3D2B] hover:text-[#5E8F52] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#5E8F52]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar texto'}
            </button>
          </div>
          <textarea
            readOnly
            value={textoFicha}
            className="w-full h-48 p-3 text-xs font-mono bg-[#EEF1E9]/30 border border-[#D8D9C9] rounded-xl focus:outline-none resize-y leading-relaxed text-[#1B2420]"
          />
        </div>

        {/* Non-fiscal thermal slip preview & print */}
        <div className="border-t border-[#D8D9C9] pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B564C] flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-[#1F3D2B]" />
              Comprovante não fiscal (Bobina 80mm)
            </label>
            <button
              onClick={() => onPrintThermal(comprovanteHTML)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir comprovante
            </button>
          </div>

          <div
            className="bg-white border border-[#D8D9C9] rounded-xl p-4 shadow-inner max-h-48 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: comprovanteHTML }}
          />
        </div>

        {/* Save Issued Invoice Data */}
        <div className="border-t border-[#D8D9C9] pt-4 space-y-3">
          <h4 className="font-serif font-bold text-sm text-[#132A1D] m-0">
            Registrar nota emitida no Portal da Receita
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#4B564C] mb-1">
                Número da nota emitida
              </label>
              <input
                type="text"
                value={notaNumero}
                onChange={e => setNotaNumero(e.target.value)}
                placeholder="Ex: 4168490"
                className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#4B564C] mb-1">
                Chave de acesso (44 dígitos)
              </label>
              <input
                type="text"
                value={notaChave}
                onChange={e => setNotaChave(e.target.value)}
                placeholder="412608..."
                className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveNota}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#5E8F52] hover:bg-[#1F3D2B] rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Salvar dados da nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
