import { useEffect, useMemo, useState } from 'react';
import { Cliente, Produto, Promocao } from '../types';
import { subscribePromocoesAtivas } from '../services/firebase';

function normalizarTexto(txt?: string): string {
  return (txt || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim();
}

// Uma promoção crua (só mercado/produto em texto), já ligada ao clienteId e
// ao itemKey (codigo do produto, ou "DESC:descricao") do cadastro do site,
// quando é possível encontrar a correspondência.
export interface PromocaoResolvida extends Promocao {
  clienteId: string | null;
  itemKey: string | null;
}

function resolverPromocao(promo: Promocao, clientes: Cliente[], produtos: Produto[]): PromocaoResolvida {
  const alvoMercado = normalizarTexto(promo.mercado);
  const cliente =
    clientes.find(c => normalizarTexto(c.apelido) === alvoMercado) ||
    clientes.find(c => normalizarTexto(c.nome) === alvoMercado) ||
    null;

  const alvoProduto = normalizarTexto(promo.produto);
  const produto = produtos.find(p => normalizarTexto(p.descricao) === alvoProduto) || null;
  const itemKey = produto ? produto.codigo || `DESC:${produto.descricao}` : null;

  return { ...promo, clienteId: cliente ? cliente.id : null, itemKey };
}

// Cruza as promoções ativas do dia (coleção "promocoes", gravadas pelo bot
// de WhatsApp) com os cadastros de Clientes e Produtos do site. Usada tanto
// pra exibir o selo de promoção (ProdutosTab) quanto pra aplicar o preço
// promocional automaticamente ao lançar um pedido (NovoPedidoTab) — assim o
// valor já sai congelado corretamente na nota, sem depender de digitação manual.
export function usePromocaoDoDia(clientes: Cliente[], produtos: Produto[]) {
  const [promocoesAtivas, setPromocoesAtivas] = useState<Promocao[]>([]);

  useEffect(() => {
    const unsubscribe = subscribePromocoesAtivas(setPromocoesAtivas);
    return unsubscribe;
  }, []);

  const resolvidas = useMemo<PromocaoResolvida[]>(
    () => promocoesAtivas.map(p => resolverPromocao(p, clientes, produtos)),
    [promocoesAtivas, clientes, produtos]
  );

  // Promoção ativa pra uma combinação exata de cliente + produto (usado no
  // lançamento de pedidos, onde o preço tem que ser aplicado automaticamente).
  function getPromocaoPara(clienteId: string, itemKey: string): PromocaoResolvida | null {
    if (!clienteId || !itemKey) return null;
    return resolvidas.find(p => p.clienteId === clienteId && p.itemKey === itemKey) || null;
  }

  // Todas as promoções ativas de um produto, independente do mercado (usado
  // na aba Produtos, que não tem um cliente selecionado).
  function getPromocoesDoProduto(itemKey: string): PromocaoResolvida[] {
    if (!itemKey) return [];
    return resolvidas.filter(p => p.itemKey === itemKey);
  }

  return { promocoesAtivas: resolvidas, getPromocaoPara, getPromocoesDoProduto };
}
