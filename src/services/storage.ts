import { Cliente, Funcionario, Pedido, PrecosOverrides, Produto, TransporteConfig } from '../types';
import {
  DEFAULT_CLIENTES,
  DEFAULT_FUNCIONARIOS,
  DEFAULT_PEDIDOS,
  DEFAULT_PRECOS_OVERRIDES,
  DEFAULT_PRODUTOS,
  DEFAULT_TRANSPORTE
} from '../constants/initialData';

const KEYS = {
  PRODUTOS: 'horta_terassi_produtos',
  CLIENTES: 'horta_terassi_clientes',
  PEDIDOS: 'horta_terassi_pedidos',
  FUNCIONARIOS: 'horta_terassi_funcionarios',
  PRECOS: 'horta_terassi_precos',
  TRANSPORTE: 'horta_terassi_transporte',
  AUTH_USER: 'horta_terassi_auth_user',
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Erro lendo ${key} do localStorage`, e);
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erro gravando ${key} no localStorage`, e);
  }
}

export const StorageService = {
  getProdutos(): Produto[] {
    return getLocal<Produto[]>(KEYS.PRODUTOS, DEFAULT_PRODUTOS);
  },
  saveProdutos(data: Produto[]): void {
    setLocal(KEYS.PRODUTOS, data);
  },

  getClientes(): Cliente[] {
    return getLocal<Cliente[]>(KEYS.CLIENTES, DEFAULT_CLIENTES);
  },
  saveClientes(data: Cliente[]): void {
    setLocal(KEYS.CLIENTES, data);
  },

  getPedidos(): Pedido[] {
    return getLocal<Pedido[]>(KEYS.PEDIDOS, DEFAULT_PEDIDOS);
  },
  savePedidos(data: Pedido[]): void {
    setLocal(KEYS.PEDIDOS, data);
  },

  getFuncionarios(): Funcionario[] {
    return getLocal<Funcionario[]>(KEYS.FUNCIONARIOS, DEFAULT_FUNCIONARIOS);
  },
  saveFuncionarios(data: Funcionario[]): void {
    setLocal(KEYS.FUNCIONARIOS, data);
  },

  getPrecosOverrides(): PrecosOverrides {
    return getLocal<PrecosOverrides>(KEYS.PRECOS, DEFAULT_PRECOS_OVERRIDES);
  },
  savePrecosOverrides(data: PrecosOverrides): void {
    setLocal(KEYS.PRECOS, data);
  },

  getTransporte(): TransporteConfig {
    return getLocal<TransporteConfig>(KEYS.TRANSPORTE, DEFAULT_TRANSPORTE);
  },
  saveTransporte(data: TransporteConfig): void {
    setLocal(KEYS.TRANSPORTE, data);
  },

  getAuthUser(): { email: string; name: string } | null {
    return getLocal<{ email: string; name: string } | null>(KEYS.AUTH_USER, {
      email: 'fabricio@hortaterassi.com.br',
      name: 'Fabricio Terassi'
    });
  },
  saveAuthUser(user: { email: string; name: string } | null): void {
    setLocal(KEYS.AUTH_USER, user);
  },

  resetAllToDefault(): void {
    setLocal(KEYS.PRODUTOS, DEFAULT_PRODUTOS);
    setLocal(KEYS.CLIENTES, DEFAULT_CLIENTES);
    setLocal(KEYS.PEDIDOS, DEFAULT_PEDIDOS);
    setLocal(KEYS.FUNCIONARIOS, DEFAULT_FUNCIONARIOS);
    setLocal(KEYS.PRECOS, DEFAULT_PRECOS_OVERRIDES);
    setLocal(KEYS.TRANSPORTE, DEFAULT_TRANSPORTE);
  },

  exportDatabaseJSON(): string {
    const data = {
      timestamp: new Date().toISOString(),
      produtos: this.getProdutos(),
      clientes: this.getClientes(),
      pedidos: this.getPedidos(),
      funcionarios: this.getFuncionarios(),
      precos: this.getPrecosOverrides(),
      transporte: this.getTransporte(),
    };
    return JSON.stringify(data, null, 2);
  }
};
