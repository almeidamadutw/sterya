# Arquitetura da primeira entrega

## Aplicação

Next.js 16.4.6, React 19.3.1, TypeScript e CSS responsivo. As ações de login e gerenciamento executam no servidor. `@supabase/ssr` mantém a sessão em cookies. O proxy atualiza tokens; cada página privada e cada ação privilegiada também verificam identidade e perfil. O proxy sozinho não é a autorização.

O Supabase é a fonte de verdade. Dados de negócio, perfis, permissões e códigos não ficam em localStorage. A aplicação não utiliza cookies fictícios para liberar o painel.

## Modelo

| Objeto | Finalidade |
| --- | --- |
| `tenants` | Clínicas/clientes com isolamento próprio |
| `units` | Unidades de cada clínica |
| `laboratories` | Laboratórios vinculados à clínica |
| `profiles` | Nome, usuário, perfil, clínica, laboratório e situação de acesso |
| `pieces` | Base de acompanhamento individual de peças |
| `private.access_codes` | Somente hashes dos códigos, validade, finalidade e consumo |
| `private.audit_events` | Emissão e utilização de códigos |
| `private.rate_limits` | Contagem de tentativas por janela de 15 minutos |

Foi criada a clínica Casal Odonto com unidades Sorocaba e Salto. Não há pacientes importados nesta entrega. Usuários são globalmente únicos; para múltiplos clientes, pode-se usar `clinica.usuario` sem alterar a tela de acesso.

## Autorizações

| Perfil | Escopo nesta entrega |
| --- | --- |
| Suporte | Dados da própria clínica e emissão de códigos para seus perfis |
| Gestor | Dados da própria clínica e emissão de códigos para gestão/equipe/laboratório |
| Equipe | Peças e laboratórios da própria clínica; somente o próprio perfil |
| Laboratório | Somente as peças atribuídas a seu laboratório e o próprio cadastro |

Gestores não emitem nem recuperam acessos de suporte. Nenhum usuário promove seu próprio perfil diretamente pela API. O suporte também fica limitado à clínica à qual pertence. A separação é aplicada por RLS no banco, inclusive quando a API é chamada diretamente.

As tabelas de negócio possuem acesso de leitura por RLS. O CRUD operacional de peças e laboratórios será adicionado por migrações específicas na próxima etapa, sem abrir gravação genérica para usuários autenticados.

## Acessos e códigos

O identificador visível é um usuário, com sufixo comercial `@cpe.ceoclub`. O identificador simples e o sufixo anterior `@ceoclubcpe` continuam aceitos para compatibilidade. Internamente, o Supabase Auth utiliza um identificador de e-mail técnico; não envia e-mail de ativação ou recuperação. A identidade real é confirmada pela senha e pelo código emitido pelo responsável.

Os códigos têm 128 bits aleatórios, são armazenados somente como SHA-256, vinculados a usuário/clínica/perfil/finalidade e utilizados mediante reserva atômica. A reemissão revoga o código anterior da mesma finalidade. Ativação dura 24 horas; recuperação dura 15 minutos. Tentativas de resgate são limitadas a 12 por janela de 15 minutos por origem identificada pelo gateway.

`cpe-access` aceita ativação/recuperação antes do login e faz sua própria verificação. Por isso, a checagem JWT do gateway fica desligada exclusivamente nesta função. A ação administrativa `issue` exige JWT validado com `getUser`, perfil ativo e sessão aceita pelo RLS antes de executar as rotinas privilegiadas. As RPCs de códigos são inacessíveis aos papéis `anon` e `authenticated`.

Após recuperação, `sessions_valid_after` bloqueia imediatamente os dados para sessões antigas, inclusive tokens de acesso ainda não expirados. A pessoa precisa entrar novamente. Perfis e permissões vêm de tabela protegida, nunca de `user_metadata` editável.

As tabelas privadas têm RLS sem políticas públicas e sem grants para clientes; o acesso exclusivo pelo backend é intencional. O aviso informativo de RLS sem policy nessas tabelas não indica necessidade de abri-las. A função de evento criada pelo Supabase para ativar RLS automaticamente não deve ser executável pela API pública.

## Operação

Nunca registre senha, código em texto puro, token de sessão ou chave privilegiada em logs. Códigos em texto puro aparecem apenas no retorno de sua geração e na entrega direta à pessoa autorizada. Dados de teste usados na validação são sintéticos e removidos ao final. Esta versão não persiste informações médicas no repositório.
