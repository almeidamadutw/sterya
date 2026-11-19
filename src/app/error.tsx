'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="standalone-state"><span className="eyebrow">CEO CLUB CPE</span><h1>Não conseguimos carregar agora.</h1><p>Tente novamente em alguns instantes.</p><button className="button primary" onClick={reset}>Tentar novamente</button></main>; }
