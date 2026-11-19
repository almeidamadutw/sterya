# CEO Club CPE · STERYA

Sistema de controle de processos da esterilização da Casal Odonto. Acompanha a organização de peças de laboratório e prepara o fluxo de pedidos de materiais.

**Nome original preservado:** STERYA. **Nome comercial:** CEO Club CPE.

## Primeira entrega

- Login responsivo baseado na proposta aprovada, em azul e branco.
- Autenticação real no Supabase, sessão em cookies, saída da conta e páginas protegidas.
- Primeiro acesso com código de uso único, válido por 24 horas.
- Recuperação sem e-mail, com código gerado por suporte/gestão, válido por 15 minutos.
- Área de usuários para emitir códigos de ativação e recuperação.
- Perfis suporte, gestor, equipe e laboratório; isolamento por clínica e por laboratório.
- Painel com indicadores reais do banco, listas de peças/laboratórios e estados vazios.
- Estrutura de dados para PPF/lente, PT, protocolo, PPR, onlay e PSI.
- Beta aberta em `/beta`, com dados fictícios e simulação local de peças, histórico, filtros, perfis e pedidos de materiais.

O acesso de suporte solicitado é `suporte@cpe.ceoclub`. A senha é definida com o código entregue ao responsável; nenhum código de ativação ou senha é versionado.

**Próximas etapas:** cadastro e movimentação de peças, etiquetas, tabela de valores de laboratórios, agenda/importação Clinicorp e pedidos/aprovações de materiais. As telas indicam o que ainda está em preparação. Esta entrega não realiza sincronização com o Clinicorp.

## Desenvolvimento

Requisitos: Node.js 24 e npm.

```bash
npm ci
cp .env.example .env.local
# Preencha somente a URL e a chave publicável do seu projeto Supabase.
npm run dev
```

Variáveis usadas:

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável do projeto, limitada pelas permissões/RLS |

A chave privilegiada não é necessária no Next.js. A função `cpe-access` utiliza a credencial disponibilizada pelo próprio ambiente de Edge Functions. Nunca a copie para variáveis `NEXT_PUBLIC_`, arquivos versionados ou mensagens de log.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

As migrações ficam em `supabase/migrations/`. O código do backend de acessos fica em `supabase/functions/cpe-access/`. Consulte a versão instalada da CLI com `--help` antes de aplicar migrações ou publicar funções. Use a mesma versão major da CLI da equipe; a v3 diferencia operações locais e remotas.

## Publicação

Importe este repositório na Vercel como Next.js e use Node.js 24. A primeira prévia já inclui a URL e a chave publicável do Supabase STERYA em `next.config.ts`, então pode ser publicada diretamente pela importação Git. São configurações públicas; a proteção dos dados continua aplicada no banco. Para outro ambiente/projeto, configure as duas variáveis acima para substituir esses valores. Nunca utilize uma chave privilegiada nessa configuração.

A publicação automática desta entrega foi bloqueada pela conexão Vercel com erro 403 (sem permissão para criar projeto). A CLI também não tem login válido e o navegador exibiu uma etapa de autenticação. A importação precisa ser concluída pelo titular da conta. A primeira publicação será uma prévia para revisão. Mudanças posteriores no código devem manter o mesmo projeto e a conexão Git existente.

## Documentação

- [Arquitetura e segurança](docs/arquitetura.md)
- [Como entrar e administrar usuários](docs/acessos.md)
- [Requisitos e próximas etapas](docs/requisitos.md)
- [Controle protético e laboratórios: fluxo, etiquetas e custos](docs/laboratorios-e-pecas.md)
- [Identidade e nomes originais](docs/identidade.md)
- [Validação da primeira entrega](docs/validacao.md)
