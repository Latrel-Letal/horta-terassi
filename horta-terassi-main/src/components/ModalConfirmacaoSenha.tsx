import React, { useState } from 'react';
import { AlertTriangle, Lock, Trash2, Loader2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

interface ModalConfirmacaoSenhaProps {
  isOpen: boolean;
  userEmail?: string;
  mensagem?: string;
  onConfirm?: () => void;
  onConfirmar?: () => void;
  onCancelar: () => void;
}

export const ModalConfirmacaoSenha: React.FC<ModalConfirmacaoSenhaProps> = ({
  isOpen,
  mensagem = 'Essa ação não pode ser desfeita.',
  onConfirm,
  onConfirmar,
  onCancelar,
}) => {
  if (!isOpen) return null;

  const callbackConfirm = onConfirm || onConfirmar;

  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirmar = async () => {
    const cleanSenha = senha.trim();
    if (!cleanSenha) {
      setErro('Digite sua senha para confirmar a exclusão.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        setErro('Sessão inválida. Faça login novamente.');
        return;
      }
      const credential = EmailAuthProvider.credential(auth.currentUser.email, cleanSenha);
      await reauthenticateWithCredential(auth.currentUser, credential);

      setSenha('');
      setErro('');
      if (callbackConfirm) {
        callbackConfirm();
      }
      onCancelar();
    } catch (e: any) {
      console.error('Erro na reautenticação:', e);
      setErro('Senha incorreta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmar();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#132A1D]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#D8D9C9] space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FDF4F2] text-[#A6432F] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-[#132A1D] m-0">
              Confirme sua senha
            </h3>
            <p className="text-xs text-[#4B564C] mt-1 leading-relaxed">
              {mensagem}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#4B564C]" />
            Senha do usuário
          </label>
          <input
            type="password"
            autoFocus
            value={senha}
            onChange={e => {
              setSenha(e.target.value);
              setErro('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua senha de login"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D9C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A6432F]"
          />
          {erro && <p className="text-xs font-semibold text-[#A6432F]">{erro}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8D9C9]">
          <button
            type="button"
            disabled={loading}
            onClick={onCancelar}
            className="px-4 py-2 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirmar}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#A6432F] hover:bg-[#7d3222] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{loading ? 'Verificando...' : 'Confirmar exclusão'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
