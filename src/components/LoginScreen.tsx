import React, { useState } from 'react';
import { Leaf, Lock, Mail, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { EMITENTE_INFO } from '../constants/initialData';
import { auth, isEmailAllowed, isEmailAdmin } from '../services/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; name: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !senha) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }

    // Validação estrita de autorização
    if (!isEmailAllowed(cleanEmail)) {
      setErro('E-mail não autorizado a acessar este sistema.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, senha);
      const loggedEmail = userCredential.user.email || cleanEmail;

      if (!isEmailAllowed(loggedEmail)) {
        await signOut(auth);
        setErro('E-mail não autorizado a acessar este sistema.');
        setLoading(false);
        return;
      }

      const isAdmin = isEmailAdmin(loggedEmail);
      const name = isAdmin ? 'Administrador (Tanathus)' : 'Fabricio Inacio Terassi';

      onLoginSuccess({
        email: loggedEmail,
        name
      });
    } catch (firebaseErr: any) {
      console.error('Erro de autenticação:', firebaseErr);
      const errorCode = firebaseErr?.code;
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setErro('E-mail ou senha incorretos.');
      } else if (errorCode === 'auth/too-many-requests') {
        setErro('Muitas tentativas sem sucesso. Aguarde um instante e tente novamente.');
      } else if (errorCode === 'auth/network-request-failed') {
        setErro('Erro de conexão com o Firebase. Verifique sua internet.');
      } else {
        setErro('Não foi possível entrar. Verifique os dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#EEF1E9]">
      <div className="bg-white border border-[#D8D9C9] rounded-2xl shadow-xl p-8 max-w-md w-full space-y-6 relative overflow-hidden">
        {/* Top green accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-[#1F3D2B]" />

        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1F3D2B] text-[#5E8F52] flex items-center justify-center mx-auto shadow-lg shadow-[#1F3D2B]/15">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-[#132A1D] tracking-tight m-0 font-serif">
            Horta Terassi
          </h1>
          <p className="text-xs text-[#4B564C] max-w-xs mx-auto">
            Painel de pedidos, talão de entrega e emissão de notas fiscais do produtor
          </p>
        </div>

        <div className="font-mono text-[11px] text-[#4B564C] text-center bg-[#EEF1E9]/60 p-2.5 rounded-xl border border-[#D8D9C9] leading-relaxed">
          <div className="font-bold text-[#132A1D]">{EMITENTE_INFO.nome}</div>
          <div>CPF {EMITENTE_INFO.cpf} · IE {EMITENTE_INFO.ie}</div>
          <div>{EMITENTE_INFO.cidade}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#5E8F52]" />
              E-mail
            </label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full px-4 py-3 text-sm bg-white border border-[#D8D9C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#5E8F52]" />
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-sm bg-white border border-[#D8D9C9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              required
              autoComplete="current-password"
            />
          </div>

          {erro && (
            <div className="text-xs font-semibold text-[#A6432F] bg-[#FDF4F2] p-2.5 rounded-lg border border-[#A6432F]/20 text-center flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#1F3D2B] hover:bg-[#132A1D] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Autenticando no Firebase...' : 'Entrar no painel'}</span>
            <ArrowRight className="w-4 h-4 text-[#5E8F52]" />
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[11px] text-[#4B564C]">
            🔒 Acesso restrito via Firebase Authentication com credenciais autorizadas.
          </p>
        </div>
      </div>
    </div>
  );
};
