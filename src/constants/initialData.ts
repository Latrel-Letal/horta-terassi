import { Produto, Cliente, Pedido, Funcionario, PrecosOverrides, TransporteConfig } from '../types';

export const EMITENTE_INFO = {
  nome: 'FABRICIO INACIO TERASSI',
  cpf: '035.356.189-40',
  ie: '9593472202',
  cidade: 'Bela Vista do Paraíso/PR',
  endereco: 'Rua Agenor Terassi, 550',
  telefone: '(43) 9990-65961',
};

export const ADMIN_EMAILS = [
  'tanathus@horta.com',
  'tanathus@horta',
];

export const ALLOWED_LOGIN_EMAILS = [
  'tanathus@horta.com',
  'tanathus@horta',
  'fabricio@horta.com',
  'fabricio@horta',
];

export const DEFAULT_PRODUTOS: Produto[] = [
  { codigo: "0121.1050.02", descricao: "ALFACE CRESPA - HIDROPÔNICO", ncm: "07051900", cfop: "5101", unidade: "UN", valor: 4.00 },
  { codigo: "0121.1050.10", descricao: "ALFACE AMERICANA - HIDROPÔNICO", ncm: "07051900", cfop: "5101", unidade: "UN", valor: 4.50 },
  { codigo: "0121.1050.05", descricao: "ALFACE LISA", ncm: "07051900", cfop: "5101", unidade: "UN", valor: 4.00 },
  { codigo: "0121.1050.08", descricao: "ALFACE MIMOSA", ncm: "07051900", cfop: "5101", unidade: "UN", valor: 4.50 },
  { codigo: "0121.1020.01", descricao: "AGRIÃO - HIDROPÔNICO", ncm: "07099990", cfop: "5101", unidade: "UN", valor: 4.00 },
  { codigo: "0121.1010.00", descricao: "ALHO PORÓ", ncm: "07039000", cfop: "5101", unidade: "UN", valor: 5.00 },
  { codigo: "0121.1070.02", descricao: "ALMEIRÃO - HIDROPÔNICO", ncm: "07052100", cfop: "5101", unidade: "UN", valor: 3.50 },
  { codigo: "0121.1090.01", descricao: "BRÓCOLIS", ncm: "07049000", cfop: "5101", unidade: "UN", valor: 4.50 },
  { codigo: "0121.1160.00", descricao: "COUVE (MINEIRA/CRESPA/MANTEIGA)", ncm: "07049000", cfop: "5101", unidade: "UN", valor: 3.50 },
  { codigo: "0121.1120.01", descricao: "CEBOLINHA", ncm: "07039000", cfop: "5101", unidade: "UN", valor: 3.00 },
  { codigo: "0121.1140.00", descricao: "CHICÓRIA", ncm: "07051900", cfop: "5101", unidade: "UN", valor: 3.50 },
  { codigo: "0121.5130.01", descricao: "COENTRO - HIDROPÔNICO", ncm: "07099990", cfop: "5101", unidade: "UN", valor: 2.75 },
  { codigo: "0121.1270.01", descricao: "RÚCULA OU PINCHÃO - HIDROPÔNICO", ncm: "07051900", cfop: "5101", unidade: "UN", valor: 4.50 },
  { codigo: "0121.1250.00", descricao: "RABANETE", ncm: "07069000", cfop: "5101", unidade: "UN", valor: 4.00 },
  { codigo: "0121.1290.01", descricao: "SALSA", ncm: "07099990", cfop: "5101", unidade: "UN", valor: 2.75 },
  { codigo: "0121.5210.00", descricao: "HORTELÃ-PIMENTA OU MENTA (FOLHA)", ncm: "12119090", cfop: "5101", unidade: "UN", valor: 2.75 },
  { codigo: "0121.1310.00", descricao: "SERRALHA", ncm: "07099990", cfop: "5101", unidade: "UN", valor: 2.75 },
  { codigo: "0121.1180.00", descricao: "ESPINAFRE", ncm: "07051900", cfop: "5101", unidade: "UN", valor: 4.00 },
  { codigo: "0121.5230.01", descricao: "MANJERICÃO OU ALFAVACA - HIDROPÔNICO", ncm: "12119090", cfop: "5101", unidade: "UN", valor: 2.75 },
  { codigo: "0121.1110.00", descricao: "CATALÔNIA", ncm: "07051900", cfop: "5101", unidade: "UN", valor: 3.50 },
];

export const DEFAULT_CLIENTES: Cliente[] = [
  {
    id: "c1",
    apelido: "Muffato Duque",
    nome: "Irmãos Muffato & Cia Ltda",
    cnpj: "76.430.438/0030-06",
    endereco: "Avenida Duque de Caxias, 1200",
    bairro: "Igapó",
    municipio: "Londrina/PR",
    cep: "86015-000",
    ie: "9014488763",
    periodicidadeRelatorio: 15,
    ultimaRetiradaRelatorio: "2026-08-01",
  },
  {
    id: "c2",
    apelido: "Muffato Bela Suíça",
    nome: "Irmãos Muffato & Cia Ltda",
    cnpj: "76.430.438/0044-01",
    endereco: "Avenida Madre Leônia Milito, 1175",
    bairro: "Bela Suíça",
    municipio: "Londrina/PR",
    cep: "86050-270",
    ie: "9038892255",
    periodicidadeRelatorio: 7,
    ultimaRetiradaRelatorio: "2026-08-10",
  },
  {
    id: "c3",
    apelido: "Muffato Vivi Xavier",
    nome: "Irmãos Muffato & Cia Ltda",
    cnpj: "76.430.438/0035-10",
    endereco: "Avenida Saul Elkind, 2177",
    bairro: "Conjunto Vivi Xavier",
    municipio: "Londrina/PR",
    cep: "86082-000",
    ie: "9021445360",
    periodicidadeRelatorio: 30,
    ultimaRetiradaRelatorio: "2026-07-20",
  },
  {
    id: "c4",
    apelido: "Supermercado Musamar",
    nome: "Comercial de Alimentos Musamar Ltda",
    cnpj: "78.123.456/0001-88",
    endereco: "Rua Sergipe, 890",
    bairro: "Centro",
    municipio: "Londrina/PR",
    cep: "86010-380",
    ie: "9023451120",
    periodicidadeRelatorio: 15,
    ultimaRetiradaRelatorio: "2026-08-05",
  },
  {
    id: "c5",
    apelido: "Viscardi Tiradentes",
    nome: "Supermercados Viscardi Ltda",
    cnpj: "75.987.654/0012-90",
    endereco: "Avenida Tiradentes, 1450",
    bairro: "Jardim Shangri-lá",
    municipio: "Londrina/PR",
    cep: "86070-545",
    ie: "9012389471",
    periodicidadeRelatorio: 7,
    ultimaRetiradaRelatorio: "2026-08-22",
  }
];

export const DEFAULT_FUNCIONARIOS: Funcionario[] = [
  {
    id: "f1",
    nome: "João Silva",
    clientesIds: ["c1", "c2", "c4"],
  },
  {
    id: "f2",
    nome: "Carlos Eduardo",
    clientesIds: ["c3", "c5"],
  },
];

export const DEFAULT_PRECOS_OVERRIDES: PrecosOverrides = {
  c1: {
    "0121.1050.02": 3.80, // Alface crespa com preço especial
    "0121.1270.01": 4.20,
  },
  c2: {
    "0121.1050.10": 4.20,
  }
};

export const DEFAULT_TRANSPORTE: TransporteConfig = {
  placa: "BVT-4A12",
  uf: "PR",
};

export const DEFAULT_PEDIDOS: Pedido[] = [
  {
    id: "ped-101",
    clienteId: "c1",
    data: "2026-08-23",
    status: "pendente",
    itens: [
      { codigo: "0121.1050.02", quantidade: 30, precoUnit: 3.80 },
      { codigo: "0121.1050.10", quantidade: 20, precoUnit: 4.50 },
      { codigo: "0121.1270.01", quantidade: 15, precoUnit: 4.20 },
      { codigo: "0121.1160.00", quantidade: 12, precoUnit: 3.50 },
      { codigo: "0121.1120.01", quantidade: 25, precoUnit: 3.00 },
    ],
  },
  {
    id: "ped-102",
    clienteId: "c2",
    data: "2026-08-24",
    status: "pendente",
    itens: [
      { codigo: "0121.1050.02", quantidade: 40, precoUnit: 4.00 },
      { codigo: "0121.1050.10", quantidade: 25, precoUnit: 4.20 },
      { codigo: "0121.1020.01", quantidade: 15, precoUnit: 4.00 },
      { codigo: "0121.1090.01", quantidade: 10, precoUnit: 4.50 },
    ],
  },
  {
    id: "ped-103",
    clienteId: "c3",
    data: "2026-08-20", // > 3 dias (vai disparar o aviso visual na pasta!)
    status: "pendente",
    itens: [
      { codigo: "0121.1050.02", quantidade: 25, precoUnit: 4.00 },
      { codigo: "0121.1140.00", quantidade: 10, precoUnit: 3.50 },
      { codigo: "0121.1290.01", quantidade: 15, precoUnit: 2.75 },
    ],
  },
  {
    id: "ped-099",
    clienteId: "c1",
    data: "2026-08-22",
    dataEntrega: "2026-08-22",
    status: "entregue",
    notaNumero: "4168490",
    notaChave: "41260876430438003006550010004168490123456789",
    itens: [
      { codigo: "0121.1050.02", quantidade: 35, precoUnit: 3.80 },
      { codigo: "0121.1050.10", quantidade: 20, precoUnit: 4.50 },
      { codigo: "0121.1270.01", quantidade: 15, precoUnit: 4.20 },
      { codigo: "0121.1160.00", quantidade: 10, precoUnit: 3.50 },
    ],
    devolucoes: {
      "0121.1050.02": 3,
      "0121.1270.01": 1,
    }
  },
  {
    id: "ped-098",
    clienteId: "c4",
    data: "2026-08-21",
    dataEntrega: "2026-08-21",
    status: "entregue",
    notaNumero: "4168482",
    notaChave: "41260878123456000188550010004168482987654321",
    itens: [
      { codigo: "0121.1050.02", quantidade: 25, precoUnit: 4.00 },
      { codigo: "0121.1020.01", quantidade: 15, precoUnit: 4.00 },
      { codigo: "0121.1120.01", quantidade: 20, precoUnit: 3.00 },
      { codigo: "0121.5130.01", quantidade: 10, precoUnit: 2.75 },
    ],
    devolucoes: {
      "0121.1020.01": 2,
    }
  },
  {
    id: "ped-097",
    clienteId: "c5",
    data: "2026-08-19",
    dataEntrega: "2026-08-19",
    status: "entregue",
    itens: [
      { codigo: "0121.1050.02", quantidade: 50, precoUnit: 4.00 },
      { codigo: "0121.1050.10", quantidade: 30, precoUnit: 4.50 },
      { codigo: "0121.1010.00", quantidade: 12, precoUnit: 5.00 },
    ],
    devolucoes: {
      "0121.1050.02": 4,
    }
  }
];
