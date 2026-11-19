import { Brand, Mark } from '@/components/brand';
export function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="auth-layout">
    <section className="auth-brand-panel" aria-label="CEO Club CPE">
      <Brand />
      <div className="auth-manifesto"><span className="eyebrow light">Uma rotina mais conectada</span><h1>Cada etapa<br />no lugar<br />certo<span>.</span></h1><p>Acompanhe peças, laboratórios<br className="desktop-break" /> e materiais em uma única rotina.</p></div>
      <Mark className="brand-watermark" />
      <p className="auth-brand-footer">CONTROLE DE PROCESSOS DA ESTERILIZAÇÃO</p>
    </section>
    <section className="auth-form-panel"><div className="auth-form-wrap">{children}</div><span className="auth-footnote"><span className="tiny-dot" /> Seu cuidado começa na organização.</span></section>
  </main>;
}
