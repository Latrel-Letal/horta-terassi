import React from 'react';
import { Leaf, LogOut, Download, Wrench, ShieldCheck } from 'lucide-react';
import { EMITENTE_INFO } from '../constants/initialData';
import { StorageService } from '../services/storage';

interface HeaderProps {
  user: { email: string; name: string } | null;
  isAdmin: boolean;
  manutencaoAtiva: boolean;
  loadingData?: boolean;
  pedidosCount?: number;
  onToggleManutencao: () => void;
  onLogout: () => void;
  showToast: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  user, 
  isAdmin, 
  manutencaoAtiva,
  loadingData = false,
  pedidosCount = 0,
  onToggleManutencao,
  onLogout, 
  showToast 
}) => {
  const handleExportBackup = () => {
    if (!isAdmin) {
      showToast('Acesso negado: apenas administradores podem exportar backup.');
      return;
    }
    const jsonStr = StorageService.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_horta_terassi_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup do banco exportado com sucesso!');
  };

  return (
    <header className="border-b-2 border-[#1F3D2B] pb-4 mb-6 pt-2 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#1F3D2B] text-[#EEF1E9] flex items-center justify-center shadow-md shadow-[#1F3D2B]/10 shrink-0">
          <Leaf className="w-7 h-7 text-[#5E8F52]" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold text-[#132A1D] tracking-tight m-0">
              Horta Terassi
            </h1>
            <span className="bg-[#5E8F52]/15 text-[#1F3D2B] text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#5E8F52]/30">
              Produtor Rural
            </span>
            {isAdmin && (
              <span className="flex items-center gap-1 bg-[#1F3D2B] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                <ShieldCheck className="w-3 h-3 text-[#5E8F52]" />
                Admin
              </span>
            )}
            <span 
              title="Status de sincronização com o banco de dados Firebase (horta-f30f3)"
              className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-medium px-2 py-0.5 rounded-full border border-emerald-300"
            >
              <span className={`w-2 h-2 rounded-full ${loadingData ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span>{loadingData ? 'Sincronizando...' : `Firebase Conectado (${pedidosCount} pedidos)`}</span>
            </span>
          </div>
          <p className="text-xs font-medium text-[#4B564C] uppercase tracking-wider mt-0.5">
            Painel de pedidos, talão de entrega &amp; notas fiscais
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full md:w-auto justify-between md:justify-end">
        <div className="font-mono text-[11px] text-[#4B564C] text-left md:text-right leading-relaxed bg-[#FFFFFF]/60 p-2 rounded-lg border border-[#D8D9C9]">
          <div className="font-semibold text-[#132A1D]">{EMITENTE_INFO.nome} · CPF {EMITENTE_INFO.cpf}</div>
          <div>IE {EMITENTE_INFO.ie} · {EMITENTE_INFO.cidade}</div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleExportBackup}
                title="Exportar backup completo em JSON (Modo Admin)"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1F3D2B] bg-[#FFFFFF] hover:bg-[#EEF1E9] border border-[#5E8F52]/40 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#5E8F52]" />
                <span className="hidden sm:inline">Backup</span>
              </button>

              <button
                onClick={onToggleManutencao}
                title="Alternar Modo Manutenção"
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer border ${
                  manutencaoAtiva 
                    ? 'bg-[#A6432F] text-white border-[#A6432F] hover:bg-[#7d3222]' 
                    : 'bg-[#FFFFFF] text-[#4B564C] border-[#D8D9C9] hover:border-[#1F3D2B]'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{manutencaoAtiva ? 'Desativar Manutenção' : 'Manutenção'}</span>
              </button>
            </>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#132A1D] bg-[#FFFFFF] hover:bg-[#1F3D2B] hover:text-white border border-[#1F3D2B] rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};
