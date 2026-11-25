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

## Operação de peças adicionada em 25/11/2026

- Banco com cinco laboratórios nomeados pela equipe e peças isoladas por clínica/laboratório.
- Cadastro manual real de peças via painel `/painel/pecas`, com paciente, procedimento, dente/arcada, unidade, laboratório, prioridade e próxima consulta.
- Movimentações persistentes: envio, confirmação no laboratório, início de produção, despacho, chegada física à clínica, entrega ao paciente, revisão, reenvio e cancelamento.
- Estorno auditado de recebimento e entrega equivocados, com justificativa obrigatória. Histórico com usuário, perfil, status anterior e novo, horário e observação.
- Página de detalhe de peça em `/painel/pecas/[id]` e etiqueta para impressão de 60 × 40 mm em `/etiquetas/[id]`, com três datas: envio, chegada à clínica e entrega ao paciente.
- Controle de permissões no banco: funções privilegiadas em schema privado, RPCs invocadoras e políticas RLS para leitura por laboratório.
- Migrações aplicadas ao Supabase STERYA e versionadas em `supabase/migrations/`.
- Pipeline `Verificar STERYA` no GitHub Actions para typecheck, lint, testes e build. Validação de fluxo no Supabase realizada dentro de transação com rollback, sem registros sintéticos remanescentes.

**Não concluído:** sincronização com Clinicorp, compra e controle de materiais real, geração automática de ficha/OS, testes físicos da impressora, testes de navegador publicados, cadastro de usuários individuais dos laboratórios e publicação Vercel confirmada. O painel de materiais ainda é uma tela em preparação, enquanto a beta segue fictícia.

**Precificação permanece suspensa:** normalmente manual por etapa-peça, mas deve-se consultar a Ellis sobre a planilha de valores fixos antes de desenvolver qualquer cálculo ou campo financeiro.

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
