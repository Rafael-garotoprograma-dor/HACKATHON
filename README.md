# Integra — Clínicas-Escola

Sistema da Hackathon Ciência da Computação 2026.2, Anhanguera Guarapari, **Tema 2**. Organiza supervisão, turmas, documentação e consultas da comunidade, com seis perfis de acesso.

## Documentação da entrega

| Material | Acesso |
|---|---|
| Explicação do problema, solução e tecnologias | [Apresentação do projeto](docs/apresentacao.md) |
| Fluxograma do funcionamento | [Fluxo principal](docs/fluxo-principal.md) |
| Estrutura do sistema e suas conexões | [Arquitetura](docs/arquitetura.md) |
| Diagrama e descrição das tabelas | [Modelo do banco de dados](docs/banco-de-dados.md) |
| SQL para criar a estrutura do banco | [schema.sql](database/schema.sql) |
| Requisitos | [Requisitos do sistema](docs/requisitos.md) |
| Testes realizados e limites | [Verificação](docs/verificacao.md) |

Os diagramas Mermaid nos documentos são exibidos como gráficos pelo GitHub.

## Organização do código

```text
app/          Páginas, estilos e API do servidor
components/   Componentes da interface
lib/          Regras de negócio, autenticação e acesso aos dados
database/     Estrutura SQL do PostgreSQL
scripts/      Inicialização, lembretes, backup e verificações
tests/        Testes automatizados
docs/         Documentação da entrega
```

`Dockerfile` e `compose.yaml` configuram a execução. `package.json` e `package-lock.json` descrevem as dependências. `render.yaml` prepara a hospedagem; a publicação no Render ainda está pendente. A estrutura SQL e o gerador de dados fictícios são versionados; o banco com os dados de uso e seus backups ficam fora do GitHub.

## Executar com Docker

Requisitos: Docker Desktop iniciado, com contêineres Linux / WSL 2.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Se `.env` já existir, preserve suas configurações. Abra **http://localhost:3000**. O PostgreSQL fica em uma rede interna; não é necessário instalar o banco no Windows. A aplicação aguarda a verificação de saúde do banco antes de iniciar.

O Compose inicia:

| Serviço | Responsabilidade |
|---|---|
| app | Next.js: páginas e API, porta 3000 |
| db | PostgreSQL 17 com volume persistente |
| worker | Fila de e-mails e lembretes |
| mailpit | Caixa de e-mails local da demonstração em http://localhost:8025 |

```powershell
docker compose ps
docker compose logs --tail=80 app worker
docker compose stop
docker compose start
```

Para atualizar o código: `docker compose up --build -d`. O volume `postgres_data` preserva os dados. **Não use `docker compose down -v` se quiser manter o banco**: a opção remove os volumes.

## Acessos fictícios

Com `DEMO_SEED=true`, o primeiro início em um banco vazio cria as contas abaixo. A senha é o valor de `DEMO_PASSWORD` no `.env`; o exemplo usa **DemoClinica2026!**. É possível entrar pelo CPF ou pelo e-mail.

| Perfil | E-mail | CPF fictício de demonstração |
|---|---|---|
| Master | master@clinica.test | 11144477735 |
| Secretaria | secretaria@clinica.test | 52998224725 |
| Professor | professor@clinica.test | 12345678909 |
| Preceptor | preceptor@clinica.test | 98765432100 |
| Aluno | aluno@clinica.test | 39053344705 |
| Paciente | paciente@clinica.test | 86288366757 |

Esses registros são sintéticos, sem relação pretendida com pessoas reais. O seed é idempotente: não sobrescreve um banco já preenchido. Alterar `DEMO_PASSWORD` depois da primeira carga não altera senhas existentes.

## Fluxo principal

1. Master configura semestre, cursos, documentos, salas e capacidades.
2. Preceptor oferece dias, horários, sala e limites de supervisão.
3. Professor cria turma com essa disponibilidade, cursos/períodos e pré-requisitos.
4. Aluno cadastra dados e envia documentos; professor autorizado pelo curso valida.
5. Aluno escolhe uma turma elegível e se inscreve para o semestre.
6. Paciente ou Secretaria agenda apenas em encontros com estudante habilitado, supervisão e espaço.
7. Paciente confirma/cancela; Secretaria acompanha as consultas que precisam de reagendamento.

## Recursos implementados

- Login com senha derivada por scrypt, sessão com cookie HttpOnly, recuperação por e-mail e cadastro público restrito a aluno/paciente.
- Permissões no servidor; arquivos privados servidos mediante autorização.
- Configuração por semestre, cursos e documentos; cadastro de salas e usuários.
- Validação documental por curso, comentários e reenvio.
- Turmas recorrentes, inscrição e limites acadêmicos, físicos e de supervisão.
- Agenda de consultas, cadastro de responsável/acompanhado, confirmação/cancelamento e histórico.
- Relatórios com arquivo, prazo, comentários, registro de ausências e identificação de atendimentos realizados.
- Cancelamento de encontros, bloqueio de sala, ausência/substituição do preceptor, troca de professor e acesso ao histórico.
- Pedidos de transferência encaminhados pelo professor e efetivados em lote pelo Master; falhas desfazem toda a operação.
- Mensagens, avisos, ocorrências e histórico administrativo.
- Worker com e-mails de recuperação, agendamento, cancelamento e lembretes 72/24/5 horas antes. O Mailpit captura os e-mails; não envia para endereços reais.

## Banco e arquivos

- `database/schema.sql`: estrutura PostgreSQL, chaves, índices e restrições.
- `lib/seed.ts`: dados fictícios reproduzíveis e calendário relativo ao primeiro início.
- `lib/domain.ts`: regras e operações em transações.
- `lib/state.ts`: dados filtrados por perfil e acesso aos arquivos.
- `docs/requisitos.md`: problema, atores e requisitos funcionais/não funcionais.
- `docs/fluxo-principal.md`: representação Mermaid do fluxo principal e da sequência de segurança.
- `docs/arquitetura.md`: modelo de dados, decisões e limites.
- `docs/lgpd.md`: medidas de proteção de dados e pendências institucionais para produção.
- Documentos e relatórios de até 5 MB ficam no banco, em `bytea`, simplificando a persistência e o backup do MVP.

## Desenvolvimento sem Docker

Node.js 22 recomendado. A instalação das dependências usa o lockfile.

```powershell
npm ci
npm run dev
```

Sem `DATABASE_URL`, o modo de desenvolvimento usa PGlite, um PostgreSQL embutido com dados em `.data/clinica`. O `.env.local` de desenvolvimento pode conter `DEMO_SEED=true` e `DEMO_PASSWORD=DemoClinica2026!`. Esse arquivo não é versionado. **O banco local é separado do banco Docker.** Não rode app e worker simultaneamente sobre o mesmo diretório PGlite; o worker é destinado ao PostgreSQL do Compose.

```powershell
npm run typecheck
npm test
npm run build
```

Os testes utilizam um banco isolado em diretório temporário. Não alteram os dados da demonstração.

Para os testes integrados, com o Docker iniciado:

```powershell
docker compose exec -T app node --import tsx scripts/smoke.ts
docker compose exec -T app node --import tsx scripts/security-smoke.ts
```

Esses dois testes criam registros fictícios identificados no banco da demonstração. O primeiro inclui concorrência pela última vaga; o segundo usa uma conta exclusiva para verificar recuperação e revogação de acesso. Resultados e limites estão em `docs/verificacao.md`.

## Backup e retomada

Para congelar as alterações e conferir uma cópia restaurada em um banco temporário:

```powershell
docker compose stop app worker
node scripts/backup.mjs --verify
docker compose start
```

O arquivo `.dump` é salvo em `backups/`, fora do versionamento e da imagem Docker. Contém todos os dados, incluindo arquivos enviados. O teste de restauração nunca sobrescreve o banco principal. Guarde uma cópia desse arquivo e do `.env` em local privado. Para apenas encerrar o ambiente, use `docker compose stop`; para continuar, `docker compose start`.

## Publicação

### GitHub

O repositório local já está organizado para receber o código-fonte, documentação, estrutura do banco, fontes e testes. Antes do primeiro `push`, confirme que `.env`, `.env.local`, `backups/`, `.data/` e os volumes do Docker não fazem parte do commit:

```powershell
git status --short
git add .
git commit -m "Documenta entrega e publicação do MVP"
git branch -M main
git remote add origin https://github.com/Rafael-garotoprograma-dor/HACKATHON.git
git push -u origin main
```

Repositório desta entrega: https://github.com/Rafael-garotoprograma-dor/HACKATHON

### Render

O arquivo `render.yaml` é um Blueprint pronto para conectar o repositório a um serviço web Docker, um worker de lembretes e um PostgreSQL gerenciado. No painel do Render, use **New > Blueprint**, selecione o repositório e revise os valores marcados como `sync: false` antes de aplicar:

1. `APP_ORIGIN`: URL HTTPS pública do serviço web.
2. `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`: servidor SMTP institucional.
3. Confirme o plano do worker e do banco conforme o orçamento da equipe; o worker precisa permanecer ligado para os lembretes.

O Render fornece o `DATABASE_URL` privado a partir do banco definido no Blueprint. A imagem usa o `CMD` do `Dockerfile` para o site e `npm run worker` para o worker. O endpoint `/api/health` é usado para a verificação de saúde. O filesystem do serviço é efêmero, portanto os dados devem ficar no PostgreSQL e os backups devem ser exportados regularmente.

Docker prepara a execução local, mas não publica o site sozinho. Em produção, mantenha HTTPS, `COOKIE_SECURE=true`, `DEMO_SEED=false`, SMTP real e backups protegidos. Remova as contas de demonstração e não exponha o Mailpit.

O projeto contém código de MVP para avaliação e continuidade. Leia as decisões e limites em `docs/arquitetura.md` antes de usar em operação institucional.
