import { materialQuantity } from './materials.ts';

type ApprovedItem = {
  material_name: string;
  material_variant: string | null;
  quantity: number;
  measure: string;
};

export function formatApprovedPurchase(items: ApprovedItem[]) {
  return items.map(item => {
    const name = [item.material_name, item.material_variant].filter(Boolean).join(' - ');
    return `• ${name} — ${materialQuantity.format(item.quantity)} ${item.measure}`;
  }).join('\n');
}

export const iFoodHome = 'https://www.ifood.com.br/inicio';
const iFoodHosts = new Set(['ifood.com.br', 'www.ifood.com.br', 'i.ifood.com.br']);

export function getIFoodMarketLink(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !iFoodHosts.has(url.hostname) || url.username || url.password || url.port) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}
