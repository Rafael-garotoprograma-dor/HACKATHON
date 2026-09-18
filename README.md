# Integra-Clinica-Anhanguera

**Acesse o sistema publicado no Render:** [https://integra-clinica-anhanguera.onrender.com](https://integra-clinica-anhanguera.onrender.com)

Para avaliar o projeto, abra o link público acima. A aplicação e o banco já estão hospedados no Render; não é necessário instalar Docker, Node.js ou PostgreSQL no computador de quem apenas vai usar a demonstração.

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

`render.yaml` registra a configuração da demonstração publicada no Render. A estrutura SQL e o gerador de dados fictícios são versionados; o banco com os dados de uso e seus backups ficam fora do GitHub.

## Acesso pela demonstração publicada

1. Abra [https://integra-clinica-anhanguera.onrender.com](https://integra-clinica-anhanguera.onrender.com).
2. Escolha um dos perfis fictícios na tela de login.
3. Use a senha de demonstração informada na seção [Contas fictícias](#contas-fictícias-da-demonstração).

O Render pode levar alguns segundos para reativar a aplicação depois de um período sem acesso. O banco da demonstração já está configurado no próprio serviço.

## Contas fictícias da demonstração

As contas abaixo são fictícias e podem ser usadas na demonstração publicada. A senha atual do Render é **DemoClinica2026!**; em outra instalação, a senha inicial será o valor de `DEMO_PASSWORD`. É possível entrar pelo CPF ou pelo e-mail.

| Perfil | E-mail | CPF fictício de demonstração |
|---|---|---|
| Master | marina.azevedo@clinica.test | 11144477735 |
| Secretaria | camila.ferreira@clinica.test | 52998224725 |
| Professor | andre.ribeiro@clinica.test | 12345678909 |
| Preceptor | beatriz.cardoso@clinica.test | 98765432100 |
| Aluno | lucas.santos@alunos.test | 39053344705 |
| Paciente | helena.nascimento@example.test | 86288366757 |

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
- Código preparado para fila de e-mails de recuperação, agendamento, cancelamento e lembretes 72/24/5 horas antes; esses envios não ficam ativos no serviço gratuito publicado.

## Banco e arquivos

Veja [como abrir e entender o banco](docs/consultar-banco.md). Os cadastros-base com nome, CPF, telefone, e-mail e nascimento estão em [lib/demo-people.ts](lib/demo-people.ts).

- `database/schema.sql`: estrutura PostgreSQL, chaves, índices e restrições.
- `lib/seed.ts`: dados fictícios reproduzíveis e calendário relativo ao primeiro início.
- `lib/domain.ts`: regras e operações em transações.
- `lib/state.ts`: dados filtrados por perfil e acesso aos arquivos.
- `docs/requisitos.md`: problema, atores e requisitos funcionais/não funcionais.
- `docs/fluxo-principal.md`: representação Mermaid do fluxo principal e da sequência de segurança.
- `docs/arquitetura.md`: modelo de dados, decisões e limites.
- `docs/lgpd.md`: medidas de proteção de dados e pendências institucionais para produção.
- Documentos e relatórios de até 5 MB ficam no banco, em `bytea`, simplificando a persistência e o backup do MVP.

## Publicação

### GitHub

Código-fonte e documentação desta entrega: [repositório HACKATHON no GitHub](https://github.com/Rafael-garotoprograma-dor/HACKATHON).

### Render

Para esta implantação, `APP_ORIGIN` é `https://integra-clinica-anhanguera.onrender.com`, sem barra final. O serviço publicado usa as contas e a senha indicadas em [Contas fictícias da demonstração](#contas-fictícias-da-demonstração). Em uma nova implantação com banco vazio, `DEMO_PASSWORD` define a senha inicial.

O plano gratuito pode colocar o site em repouso após um período sem acesso; basta aguardar alguns segundos ao abrir o link. A demonstração usa dados fictícios e não deve receber dados reais de pacientes.

O projeto contém código de MVP para avaliação e continuidade. Leia as decisões e limites em `docs/arquitetura.md` antes de usar em operação institucional.
