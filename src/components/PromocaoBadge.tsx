import React from 'react';
import { Tag } from 'lucide-react';

interface PromocaoBadgeProps {
  label?: string; // texto do selo, ex: "Promoção" ou "Promoção aplicada"
  title?: string; // tooltip com detalhes (mercado, preço, validade...)
}

export const PromocaoBadge: React.FC<PromocaoBadgeProps> = ({ label = 'Promoção', title }) => (
  <span
    title={title}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C08A2E]/15 text-[#C08A2E] border border-[#C08A2E]/40 whitespace-nowrap"
  >
    <Tag className="w-3 h-3" />
    {label}
  </span>
);