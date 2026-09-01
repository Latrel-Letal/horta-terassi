import React from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Users,
  Sprout,
  Truck,
  TrendingDown,
  FileBarChart2,
  FileSpreadsheet,
  Upload,
  KeyRound
} from 'lucide-react';

export type TabType =
  | 'pedidos'
  | 'novo'
  | 'clientes'
  | 'produtos'
  | 'entregadores'
  | 'perdas'
  | 'relatorio'
  | 'relprodutos'
  | 'importar'
  | 'registroAcesso';

interface TabsNavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pedidosPendentesCount: number;
  isAdmin?: boolean;
}

export const TabsNavigation: React.FC<TabsNavigationProps> = ({
  activeTab,
  onSelectTab,
  pedidosPendentesCount,
  isAdmin = false,
}) => {
  const allTabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number; adminOnly?: boolean }[] = [
    {
      id: 'pedidos',
      label: 'Pedidos',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: pedidosPendentesCount > 0 ? pedidosPendentesCount : undefined,
    },
    {
      id: 'novo',
      label: 'Novo pedido',
      icon: <PlusCircle className="w-4 h-4" />,
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'produtos',
      label: 'Produtos',
      icon: <Sprout className="w-4 h-4" />,
    },
    {
      id: 'entregadores',
      label: 'Entregadores',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      id: 'perdas',
      label: 'Perdas & Arrecadação',
      icon: <TrendingDown className="w-4 h-4" />,
    },
    {
      id: 'relatorio',
      label: 'Relatório Mercado',
      icon: <FileBarChart2 className="w-4 h-4" />,
    },
    {
      id: 'relprodutos',
      label: 'Rel. Produtos',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'importar',
      label: 'Importar',
      icon: <Upload className="w-4 h-4" />,
      adminOnly: true,
    },
    {
      id: 'registroAcesso',
      label: 'Registro de Acesso',
      icon: <KeyRound className="w-4 h-4" />,
      adminOnly: true,
    },
  ];

  const tabs = allTabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <nav className="flex flex-wrap gap-2 mb-6 border-b border-[#D8D9C9] pb-3">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-[#1F3D2B] text-white shadow-sm ring-2 ring-[#1F3D2B]/30'
                : 'bg-[#FFFFFF] text-[#132A1D] hover:bg-[#1F3D2B]/10 border border-[#D8D9C9]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-2 py-0.5 text-[11px] font-mono font-bold rounded-full ${
                  isActive
                    ? 'bg-[#5E8F52] text-white'
                    : 'bg-[#C08A2E] text-white'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
