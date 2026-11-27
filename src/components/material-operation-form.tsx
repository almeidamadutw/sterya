'use client';

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Result = { error?: string; message?: string; href?: string; reset?: boolean };

export function MaterialOperationForm({ action, children, label }: {
  action: (form: FormData) => Promise<Result>;
  children: ReactNode;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result>({});
  const operation = useRef<{ id: string; payload: string } | null>(null);
  const submitting = useRef(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = JSON.stringify(Array.from(data.entries()));
    if (!operation.current || operation.current.payload !== payload) {
      operation.current = { id: crypto.randomUUID(), payload };
    }
    data.set('operation', operation.current.id);
    setResult({});
    startTransition(async () => {
      try {
        const response = await action(data);
        setResult(response);
        if (response.error) return;
        operation.current = null;
        if (response.href) {
          router.push(response.href);
        } else {
          if (response.reset) form.reset();
          router.refresh();
        }
      } catch {
        setResult({ error: 'A conexão falhou. Tente salvar novamente.' });
      } finally {
        submitting.current = false;
      }
    });
  }

  return <form method="post" onSubmit={submit} className="material-operation-form">
    <fieldset disabled={pending} className="material-fieldset">
      {children}
      <button type="submit" className="button primary">{pending ? 'Salvando…' : label}</button>
    </fieldset>
    {result.error && <p className="notice error" role="alert">{result.error}</p>}
    {result.message && <p className="notice success" role="status">{result.message}</p>}
  </form>;
}
