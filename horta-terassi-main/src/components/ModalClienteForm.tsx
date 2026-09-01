import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Building2 } from 'lucide-react';
import { Cliente } from '../types';

interface ModalClienteFormProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  onSalvarCliente: (cliente: Cliente) => void;
}

export const ModalClienteForm: React.FC<ModalClienteFormProps> = ({
  cliente,
  isOpen,
  onClose,
  onSalvarCliente,
}) => {
  if (!isOpen) return null;

  const [apelido, setApelido] = useState('');
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('Londrina/PR');
  const [cep, setCep] = useState('');
  const [ie, setIe] = useState('');
  const [periodicidade, setPeriodicidade] = useState<string>('');
  const [ultimaRetirada, setUltimaRetirada] = useState('');

  useEffect(() => {
    if (cliente) {
      setApelido(cliente.apelido || '');
      setNome(cliente.nome || '');
      setCnpj(cliente.cnpj || '');
      setEndereco(cliente.endereco || '');
      setBairro(cliente.bairro || '');
      setMunicipio(cliente.municipio || 'Londrina/PR');
      setCep(cliente.cep || '');
      setIe(cliente.ie || '');
      setPeriodicidade(cliente.periodicidadeRelatorio ? String(cliente.periodicidadeRelatorio) : '');
      setUltimaRetirada(cliente.ultimaRetiradaRelatorio || '');
    } else {
      setApelido('');
      setNome('');
      setCnpj('');
      setEndereco('');
      setBairro('');
      setMunicipio('Londrina/PR');
      setCep('');
      setIe('');
      setPeriodicidade('');
      setUltimaRetirada('');
    }
  }, [cliente, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apelido.trim() && !nome.trim()) {
      alert('Preencha ao menos o Apelido ou Razão social.');
      return;
    }

    onSalvarCliente({
      id: cliente?.id || `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      apelido: apelido.trim() || nome.trim(),
      nome: nome.trim(),
      cnpj: cnpj.trim(),
      endereco: endereco.trim(),
      bairro: bairro.trim(),
      municipio: municipio.trim() || 'Londrina/PR',
      cep: cep.trim(),
      ie: ie.trim(),
      periodicidadeRelatorio: periodicidade ? Number(periodicidade) : null,
      ultimaRetiradaRelatorio: ultimaRetirada || '',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#132A1D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#D8D9C9] max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-[#D8D9C9] pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1F3D2B]" />
            <h3 className="font-serif font-bold text-xl text-[#132A1D] m-0">
              {cliente ? 'Editar cliente / mercado' : 'Adicionar novo cliente'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#4B564C] hover:text-[#132A1D] hover:bg-[#EEF1E9] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Apelido (como vocês chamam)
              </label>
              <input
                type="text"
                value={apelido}
                onChange={e => setApelido(e.target.value)}
                placeholder="Ex: Muffato Duque"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Razão social <span className="text-[10px] font-normal text-[#4B564C]">(opcional)</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Irmãos Muffato & Cia Ltda"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                CNPJ, CPF ou MEI
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Inscrição Estadual (IE)
              </label>
              <input
                type="text"
                value={ie}
                onChange={e => setIe(e.target.value)}
                placeholder="9014488763"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
              Endereço completo (Rua/Av, número)
            </label>
            <input
              type="text"
              value={endereco}
              onChange={e => setEndereco(e.target.value)}
              placeholder="Ex: Avenida Duque de Caxias, 1200"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Bairro
              </label>
              <input
                type="text"
                value={bairro}
                onChange={e => setBairro(e.target.value)}
                placeholder="Igapó"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Município / UF
              </label>
              <input
                type="text"
                value={municipio}
                onChange={e => setMunicipio(e.target.value)}
                placeholder="Londrina/PR"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                CEP
              </label>
              <input
                type="text"
                value={cep}
                onChange={e => setCep(e.target.value)}
                placeholder="86015-000"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#D8D9C9]/60">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Lembrete de retirada do relatório
              </label>
              <select
                value={periodicidade}
                onChange={e => setPeriodicidade(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              >
                <option value="">Sem lembrete</option>
                <option value="7">A cada 7 dias</option>
                <option value="15">A cada 15 dias</option>
                <option value="30">A cada 30 dias</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Última retirada
              </label>
              <input
                type="date"
                value={ultimaRetirada}
                onChange={e => setUltimaRetirada(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#D8D9C9]">
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
              Salvar cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
