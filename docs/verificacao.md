# Verificação do MVP — 17/09/2026

## Atualizações de 18/09/2026

- Cadastro local: seis perfis-base e 14 cadastros sintéticos atualizados; dois cadastros fora dos testes preservados. Mantidos 22 usuários, 6 inscrições e 9 consultas.
- Backup anterior à atualização: `backups/clinica-20260918043957.dump`, com restauração verificada. SHA-256: `2cb052f9e6f13aefb5e94de60951701aeba9b48f687ee05335dab34dbf82e2ea`.
- TypeScript e 29 testes passaram após a revisão dos cadastros. Build Docker concluído e saúde local retornou HTTP 200.
- Render conectado ao repositório HACKATHON, branch main; novo serviço gratuito implantado a partir do commit `37d24fb` e observado como Live. Tela pública e login do professor foram verificados em https://integra-clinica-anhanguera.onrender.com.
- O fluxo público completo ainda não foi exercitado em todos os perfis. E-mails automáticos e recuperação por e-mail estão indisponíveis nesta configuração sem worker/SMTP. O banco hospedado é independente do local.

Os resultados abaixo registram a verificação local original, não testes completos no Render.

## Resultado dos testes

| Verificação | Resultado |
|---|---|
| TypeScript (`npm run typecheck`) | Passou |
| Build de produção Linux no Docker | Passou |
| Testes automatizados isolados | 29 testes, 29 passaram, zero falhas (contagem inclui o agrupamento de domínio) |
| Fluxo integrado dos seis perfis no PostgreSQL | Passou |
| Duas reservas simultâneas da última vaga no PostgreSQL | Uma aceita e uma rejeitada |
| Troca encadeada entre turmas lotadas | Passou; falha em um destino desfaz a operação |
| Relatórios distintos de aluno e preceptor no mesmo encontro | Passou |
| Prazo de aluno e primeira entrega tardia do preceptor | Passou |
| Autorização, origem HTTP, arquivos privados e corpos inválidos | Passou nos casos exercitados |
| Recuperação por e-mail, token de uso único e revogação de sessões | Passou |
| Limitação de tentativas de login | HTTP 429 após o limite |
| Auditoria npm das dependências de execução | Zero vulnerabilidades conhecidas na consulta realizada |
| Interface do paciente | Login, agendamento, histórico e cancelamento verificados no navegador |
| SMTP de demonstração | Worker executado com Mailpit local |
| Backup integral e restauração isolada | Passou; contagens e bytes dos arquivos conferidos |

Os testes de domínio usam PGlite isolado. `scripts/smoke.ts` e `scripts/security-smoke.ts` usam a API de produção e PostgreSQL no Docker. Os registros desses testes têm nomes/e-mails identificados como fictícios e foram preservados. Nenhuma pessoa real foi contatada.

## Correções encontradas durante a revisão

- Inscrições, consultas e relatórios passaram a gerar IDs próprios, permitindo vários registros na mesma turma/encontro.
- Alunos recebem identificadores de atendimento sem CPF ou nome de paciente; Secretaria não recebe CPF/documentação dos alunos.
- Leitura do corpo HTTP limita os bytes reais, inclusive sem Content-Length; JSON inválido e tipos inesperados geram erro de validação.
- Recuperação de senha não publica seu link nas notificações internas; alteração revoga sessões e o token só funciona uma vez.
- Alterações de credenciais/perfil pelo Master revogam sessões. Desativação de responsável gera a pendência operacional correspondente.
- Bloqueios e ausências atuam nos encontros atuais/futuros; substituição de preceptor não reabre cancelamentos por outros motivos.
- Saúde da aplicação verifica a conexão com o banco; lembretes retomam a etapa ainda útil após uma parada.
- Aplicação e Mailpit ficam acessíveis somente pelo próprio computador na configuração de demonstração.
- Cadastro e edição de senha não reutilizam autofill de CPF e têm controle de visualização; conta do usuário, endereço da clínica e telefone da Secretaria foram verificados na interface.
- Consulta já existente pode ser confirmada ou cancelada mesmo quando a representação de vagas está cheia; a reserva duplicada continua bloqueada.

## Limites da entrega

Esta verificação cobre os cenários acima; não é certificação de ausência de vulnerabilidades nem teste de carga institucional. A publicação externa ainda exige domínio/HTTPS, SMTP real e configuração de produção. Há limitações de modelo explicitadas em `arquitetura.md`: equipamentos por quantidade, calendário institucional único, ausência de fila automática para pacientes, falta de edição individual da agenda de encontros e de versionamento completo das configurações de semestres. Esses pontos permanecem registrados e não foram apresentados como funcionalidades concluídas.

Os arquivos do projeto e o banco são independentes: código no diretório do projeto, dados no volume PostgreSQL e cópia exportável em `backups/`. Use `node scripts/backup.mjs --verify` para repetir a exportação com teste de restauração.

Backup verificado nesta entrega: `backups/clinica-20260917131334.dump`.

SHA-256: `26769740df2248394527545d65d7bb7af7cd8638457d166c1bd0c761b004cae5`.

A cópia restaurada preservou 20 usuários, 6 turmas, 6 inscrições, 6 consultas e 4 documentos (202 bytes). Relatórios foram exercitados nos bancos isolados dos testes; o banco da demonstração ainda não possui relatórios enviados. A restauração ocorreu em banco temporário removido ao fim; o banco original permaneceu intacto.
