export interface Produto {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  valor: number;
}

export interface Cliente {
  id: string;
  apelido: string;
  nome: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  municipio: string;
  cep: string;
  ie: string;
  periodicidadeRelatorio?: number | null; // ex: 7, 15, 30 dias
  ultimaRetiradaRelatorio?: string; // YYYY-MM-DD
}

export interface ItemPedido {
  codigo: string; // código do produto ou 'DESC:...'
  quantidade: number;
  precoUnit?: number; // Preço congelado no momento do lançamento
  emPromocao?: boolean; // true quando precoUnit veio de uma promoção ativa do dia
}

export interface Pedido {
  id: string;
  clienteId: string;
  data: string; // YYYY-MM-DD
  itens: ItemPedido[];
  status: 'pendente' | 'entregue';
  notaNumero?: string;
  notaChave?: string;
  dataEntrega?: string; // YYYY-MM-DD
  devolucoes?: Record<string, number>; // { [codigoProduto]: quantidadeDevolvida }
}

export interface Funcionario {
  id: string;
  nome: string;
  clientesIds: string[];
}

export type PrecosOverrides = Record<string, Record<string, number>>; // { [clienteId]: { [codigoOuDesc]: valor } }

export interface TransporteConfig {
  placa: string;
  uf: string;
}

export interface LembreteRetirada {
  cliente: Cliente;
  proxima: string;
  atrasoDias: number;
}

export interface RelatorioVendasProdutoItem {
  codigo: string;
  descricao: string;
  qtd: number;
  unit: number;
  vlrVen: number;
  desconto: number;
  liquido: number;
}

export interface RelatorioVendasClienteGrupo {
  clienteId: string;
  clienteNome: string;
  produtos: RelatorioVendasProdutoItem[];
  totalLiquido: number;
}

// Promoção lançada pelo bot de WhatsApp, gravada na coleção "promocoes"
export interface Promocao {
  id: string;
  mercado: string; // nome do cliente/mercado, igual ao cadastro em "Clientes"
  produto: string; // descrição do produto, igual ao cadastro em "Produtos"
  preco: number;
  validade: any; // Firestore Timestamp
  validadeTexto?: string;
  criadoEm?: any;
  ativa: boolean;
}
