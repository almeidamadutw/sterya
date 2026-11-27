'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { getIFoodMarketLink, iFoodHome } from '@/lib/assisted-purchase';

export function AssistedPurchase({ list }: { list: string }) {
  const [market, setMarket] = useState('');
  const [copyStatus, setCopyStatus] = useState<'ready' | 'copied' | 'manual'>('ready');
  const marketLink = getIFoodMarketLink(market);
  const invalid = Boolean(market.trim()) && !marketLink;

  async function copyList() {
    try {
      await navigator.clipboard.writeText(list);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('manual');
    }
  }

  return <section className="panel assisted-purchase" aria-labelledby="assisted-purchase-title">
    <div className="section-title"><h2 id="assisted-purchase-title">Comprar pelo iFood</h2></div>
    <p>Copie a lista aprovada. No iFood, confira os produtos, as quantidades e o frete antes de fechar a compra.</p>
    <div className="material-toolbar">
      <button type="button" className="button secondary" onClick={() => void copyList()}>
        <Icon name="copy" size={16} /> Copiar lista aprovada
      </button>
    </div>
    <p className="purchase-copy-status" role="status">
      {copyStatus === 'copied' && 'Lista copiada.'}
      {copyStatus === 'manual' && 'Selecione o texto abaixo para copiar a lista.'}
    </p>
    {copyStatus === 'manual' && <label className="field">Lista aprovada
      <textarea readOnly rows={Math.min(8, Math.max(3, list.split('\n').length))}
        value={list} onFocus={event => event.currentTarget.select()} />
    </label>}
    <div className="purchase-market-field">
      <label className="field">Link do mercado no iFood
        <input type="url" placeholder="Cole o link da loja" maxLength={2048} value={market}
          aria-invalid={invalid || undefined} aria-describedby="purchase-market-help"
          onChange={event => setMarket(event.target.value)} />
      </label>
      <p id="purchase-market-help">{invalid ? 'Cole um link HTTPS de uma loja do iFood.' : 'Use o link de compartilhamento do mercado ou procure a loja no iFood.'}</p>
    </div>
    <div className="material-toolbar">
      {marketLink ? <a className="button primary" href={marketLink} target="_blank" rel="noopener noreferrer">Abrir mercado</a>
        : <a className="button secondary" href={iFoodHome} target="_blank" rel="noopener noreferrer">Buscar mercado no iFood</a>}
    </div>
    <p className="purchase-market-return">Depois, volte aqui para registrar o código da compra.</p>
  </section>;
}
