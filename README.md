# Integra — Clínicas-Escola

Sistema da Hackathon Ciência da Computação 2026.2, Anhanguera Guarapari, **Tema 2**. Organiza supervisão, turmas, documentação e consultas da comunidade, com seis perfis de acesso.

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
- `docs/arquitetura.md`: modelo de dados, decisões e limites.
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

Docker prepara a execução, mas não publica o site sozinho. No servidor, configure domínio/HTTPS, `APP_ORIGIN`, `COOKIE_SECURE=true`, credenciais do banco e um SMTP real. Remova as contas de demonstração, desative `DEMO_SEED` e não exponha o Mailpit. Faça backups e defina a política institucional de acesso/retenção antes de inserir dados reais.

O projeto contém código de MVP para avaliação e continuidade. Leia as decisões e limites em `docs/arquitetura.md` antes de usar em operação institucional.
