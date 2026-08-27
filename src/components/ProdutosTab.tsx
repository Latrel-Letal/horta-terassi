import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Sprout, CheckCircle2, RotateCcw } from 'lucide-react';
import { Produto } from '../types';
import { fmtMoeda } from '../utils/formatters';

interface ProdutosTabProps {
  produtos: Produto[];
  onSalvarProduto: (produto: Produto) => void;
  onExcluirProduto: (codigo: string) => void;
}

export const ProdutosTab: React.FC<ProdutosTabProps> = ({
  produtos,
  onSalvarProduto,
  onExcluirProduto,
}) => {
  const [editingCodigo, setEditingCodigo] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ncm, setNcm] = useState('');
  const [cfop, setCfop] = useState('5101');
  const [unidade, setUnidade] = useState('UN');
  const [valor, setValor] = useState('');

  const handleIniciarEdicao = (p: Produto) => {
    setEditingCodigo(p.codigo || `DESC:${p.descricao}`);
    setCodigo(p.codigo.startsWith('AVUL.') ? '' : p.codigo);
    setDescricao(p.descricao);
    setNcm(p.ncm || '');
    setCfop(p.cfop || '5101');
    setUnidade(p.unidade || 'UN');
    setValor(String(p.valor));

    // Scroll to form smoothly
    const el = document.getElementById('formProduto');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelarEdicao = () => {
    setEditingCodigo(null);
    setCodigo('');
    setDescricao('');
    setNcm('');
    setCfop('5101');
    setUnidade('UN');
    setValor('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valNum = parseFloat(valor);
    if (!descricao.trim() || isNaN(valNum)) {
      alert('Preencha ao menos a descrição e o valor padrão.');
      return;
    }

    const codFinal = codigo.trim() || editingCodigo || `0121.${Math.floor(1000 + Math.random() * 9000)}.00`;

    onSalvarProduto({
      codigo: codFinal,
      descricao: descricao.trim().toUpperCase(),
      ncm: ncm.trim() || '07051900',
      cfop: cfop.trim() || '5101',
      unidade: unidade.trim() || 'UN',
      valor: valNum,
    });

    handleCancelarEdicao();
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: PRODUTOS CADASTRADOS */}
      <div>
        <div className="border-b border-[#D8D9C9] pb-3 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0">
            Produtos cadastrados
          </h2>
          <p className="text-xs text-[#4B564C] mt-0.5">
            O preço aqui é o padrão, usado quando o cliente não tiver um preço específico definido na tabela.
          </p>
        </div>

        <div className="bg-white border border-[#D8D9C9] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#EEF1E9] border-b-2 border-[#1F3D2B] text-xs uppercase font-bold text-[#4B564C] tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Descrição da Espécie</th>
                  <th className="py-3 px-4">NCM</th>
                  <th className="py-3 px-4">CFOP</th>
                  <th className="py-3 px-4 text-center">Un.</th>
                  <th className="py-3 px-4 text-right">Preço padrão</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D9C9]">
                {produtos.map(p => (
                  <tr key={p.codigo || p.descricao} className="hover:bg-[#EEF1E9]/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#4B564C]">
                      {p.codigo || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#132A1D]">
                      {p.descricao}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#4B564C]">
                      {p.ncm || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#4B564C]">
                      {p.cfop || '5101'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs">
                      {p.unidade}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#1F3D2B]">
                      {fmtMoeda(p.valor)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleIniciarEdicao(p)}
                          className="p-1.5 text-[#1F3D2B] hover:bg-[#EEF1E9] rounded-lg transition-colors"
                          title="Editar produto"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onExcluirProduto(p.codigo || `DESC:${p.descricao}`)}
                          className="p-1.5 text-[#A6432F] hover:bg-[#FDF4F2] rounded-lg transition-colors"
                          title="Excluir produto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: ADICIONAR / EDITAR PRODUTO */}
      <div id="formProduto">
        <div className="border-b border-[#D8D9C9] pb-3 mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#132A1D] m-0">
              {editingCodigo ? 'Editar produto' : 'Adicionar novo produto'}
            </h2>
            <p className="text-xs text-[#4B564C] mt-0.5">
              Cadastre espécies hidropônicas ou de terra para o talão de pedidos e notas fiscais.
            </p>
          </div>

          {editingCodigo && (
            <button
              onClick={handleCancelarEdicao}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#4B564C] hover:text-[#A6432F] bg-white border border-[#D8D9C9] rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Código interno
              </label>
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Ex: 0121.1050.02"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Descrição da hortaliça
              </label>
              <input
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: ALFACE CRESPA - HIDROPÔNICO"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                NCM
              </label>
              <input
                type="text"
                value={ncm}
                onChange={e => setNcm(e.target.value)}
                placeholder="07051900"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                CFOP
              </label>
              <input
                type="text"
                value={cfop}
                onChange={e => setCfop(e.target.value)}
                placeholder="5101"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Unidade
              </label>
              <input
                type="text"
                value={unidade}
                onChange={e => setUnidade(e.target.value)}
                placeholder="UN"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Preço padrão (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="4.00"
                className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#5E8F52]" />
              <span>{editingCodigo ? 'Atualizar produto' : 'Salvar produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
