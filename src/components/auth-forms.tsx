'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { signIn, activate, recover } from '@/app/actions/auth';
import { Icon } from '@/components/icon';
import type { ActionState } from '@/lib/validation';

function Password({ name = 'password', label = 'Senha', newPassword = false }: { name?: string; label?: string; newPassword?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div className="field"><label htmlFor={name}>{label}</label><div className="password-input"><input id={name} name={name} type={visible ? 'text' : 'password'} autoComplete={newPassword ? 'new-password' : 'current-password'} required minLength={newPassword ? 8 : undefined} maxLength={128} placeholder={newPassword ? 'Crie uma senha segura' : 'Sua senha'} /><button type="button" className="reveal-password" onClick={() => setVisible(!visible)} aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`} aria-pressed={visible}><Icon name="eye" /></button></div></div>;
}
function Feedback({ state }: { state: ActionState }) { return state.error ? <div className="notice error" role="alert">{state.error}</div> : null; }
export function LoginForm({ success }: { success?: string }) {
  const [state, action, pending] = useActionState(signIn, {});
  return <><span className="eyebrow">CEO CLUB CPE</span><h2>Bem-vindo de volta.</h2><p className="auth-subtitle">Acesse sua conta para continuar.</p>
    {success && <div className="notice success" role="status">{success}</div>}
    <form action={action} className="auth-form" aria-busy={pending}>
      <div className="field"><label htmlFor="username">Usuário</label><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={53} placeholder="Seu usuário" /></div>
      <Password /><div className="recovery-link"><Link href="/recuperar">Recuperar acesso</Link></div>
      <Feedback state={state} /><button className="button primary full" disabled={pending} type="submit"><span>{pending ? 'Entrando…' : 'Entrar'}</span><Icon name="arrow" /></button>
    </form>
    <div className="auth-secondary">Primeiro acesso? <Link href="/ativar">Ativar com código</Link></div>
    <Link href="/beta" className="beta-entry"><Icon name="grid" size={17} /><span>Explorar versão beta<small>Sem senha · dados de demonstração</small></span><Icon name="arrow" size={17} /></Link>
  </>;
}
export function CodeForm({ kind }: { kind: 'activate' | 'reset' }) {
  const isActivation = kind === 'activate';
  const [state, action, pending] = useActionState(isActivation ? activate : recover, {});
  return <><Link className="back-link" href="/login">← Voltar para o login</Link><span className="eyebrow">{isActivation ? 'PRIMEIRO ACESSO' : 'RECUPERAR ACESSO'}</span><h2>{isActivation ? 'Sua rotina começa aqui.' : 'Vamos renovar seu acesso.'}</h2><p className="auth-subtitle">{isActivation ? 'Use o usuário e o código enviados pelo suporte para criar sua senha.' : 'Peça um código de recuperação ao suporte e escolha sua nova senha.'}</p>
    <form action={action} className="auth-form code-form" aria-busy={pending}>
      <div className="field"><label htmlFor="username">Usuário</label><input name="username" id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Seu usuário" required maxLength={53} /></div>
      <div className="field"><label htmlFor="code">Código {isActivation ? 'de ativação' : 'de recuperação'}</label><input name="code" id="code" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} placeholder="Cole aqui o código recebido" required maxLength={80} /><small>{isActivation ? 'Válido por 24 horas. Uso único.' : 'Válido por 15 minutos. Uso único.'}</small></div>
      <Password label="Nova senha" newPassword /><small className="password-hint">Pelo menos 8 caracteres, com letras e números.</small><Password name="confirmation" label="Confirmar senha" newPassword />
      <Feedback state={state} /><button className="button primary full" disabled={pending}><span>{pending ? 'Concluindo…' : isActivation ? 'Ativar minha conta' : 'Salvar nova senha'}</span><Icon name="arrow" /></button>
    </form>
  </>;
}
