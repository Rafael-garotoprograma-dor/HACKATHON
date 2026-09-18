# Roteiro de apresentação — Integra-Clinica-Anhanguera

Duração sugerida: 10 a 12 minutos. Use exclusivamente o ambiente com dados fictícios. Prepare contas dos seis perfis e uma turma com encontros futuros. Confira os horários antes de apresentar: uma consulta passada não pode ser confirmada.

## 1. Problema e proposta — 1 minuto

**Fala:** “As clínicas-escola conectam a formação dos estudantes ao atendimento da comunidade. Para uma consulta acontecer, precisamos conciliar documentação, formação acadêmica, supervisão, sala, horário e capacidade. Essas regras mudam a cada semestre. O Integra-Clinica-Anhanguera reúne essa organização em um sistema configurável, com seis perfis de acesso.”

**Mostrar:** página de entrada e o fluxograma da documentação.

## 2. Como foi construído — 1 minuto e meio

**Fala:** “Utilizamos TypeScript para escrever a interface e as regras do servidor. React organiza as telas em componentes, e Next.js reúne as páginas e a API. O CSS adapta a apresentação às larguras de tela. Node.js executa o servidor e o processo de lembretes. PostgreSQL armazena os dados e mantém as relações entre usuários, turmas e consultas.”

**Mostrar:** estrutura do repositório: `app` contém páginas e API; `components`, os componentes visuais; `lib`, regras e acesso aos dados; `database`, estrutura SQL; `tests`, testes automatizados; `docs`, documentação.

**Fala:** “Docker Compose inicia a aplicação, o banco, o worker de e-mails e o Mailpit, usado para conferir mensagens localmente. Usamos Git e GitHub para versionamento. A demonstração está publicada em https://clinica-escola-web.onrender.com, com site e banco gratuitos, sem envio automático de e-mails. Os testes isolados usam PGlite; o ambiente Docker usa PostgreSQL.”

## 3. Master — 1 minuto e meio

**Fala:** “O Master administra o funcionamento da clínica. Define semestre, cursos, documentos, horários, salas, capacidades e acessos. Trata pendências, ausências, substituições e transferências. As configurações podem ser alteradas pelo sistema.”

**Mostrar:** configurações, salas, pessoas e pendências. Explique uma substituição sem efetivá-la durante a apresentação se ela prejudicar os próximos exemplos.

**Capacidade:** acesso administrativo amplo; pode vincular permissões acadêmicas, designar responsáveis e efetivar transferências. A operação ainda respeita integridade e compatibilidade dos destinos.

## 4. Preceptor — 1 minuto

**Fala:** “O preceptor informa onde e quando pode supervisionar e quantos alunos e pacientes pode acompanhar. Sua presença é obrigatória. Ele registra o que ocorreu na aula, envia o relatório da turma e comunica problemas de sala.”

**Mostrar:** disponibilidade, sala e limites; encontros, envio de relatório e comunicação de ocorrência.

**Capacidade:** administra a própria oferta de supervisão e acompanha os encontros vinculados. Não pode supervisionar turmas simultâneas nem efetivar transferências de alunos.

## 5. Professor — 1 minuto e meio

**Fala:** “O professor cria turmas sobre uma disponibilidade de preceptor, define curso, períodos, pré-requisitos e duração. Também valida documentos dos cursos para os quais recebeu autorização. Depois da inscrição, acompanha seus alunos, avalia relatórios, comenta e confirma a frequência.”

**Mostrar:** criação de turma, validação documental e caixa de relatórios. Mostre o filtro de curso e o comentário de avaliação.

**Capacidade:** validação acadêmica autorizada, gestão das próprias turmas, avaliação e encaminhamento de transferências ao Master. A validação inicial não obriga o aluno a escolher a turma daquele avaliador. Uma ausência pontual do professor não impede aula com preceptor; uma turma sem avaliador exige providência administrativa.

## 6. Aluno — 1 minuto

**Fala:** “O aluno cadastra seus dados e envia os documentos. Após a aprovação, vê somente turmas compatíveis com sua formação e com vaga. Escolhe uma turma já formada, permanece inscrito no semestre e envia um relatório individual por encontro.”

**Mostrar:** documentos, turmas elegíveis, inscrição, agenda e envio de relatório.

**Capacidade:** acesso aos próprios documentos, vínculos e relatórios. Pode substituir seu relatório dentro do prazo; depois, a alteração é bloqueada. Não aprova a própria documentação nem altera horários ou capacidades. Para transferência, procura o professor; o Master efetiva a mudança.

## 7. Paciente — 1 minuto

**Fala:** “O paciente cria uma conta, consulta os horários disponíveis e agenda para si ou para uma pessoa acompanhada. Pode consultar seu histórico, confirmar a consulta ou cancelar conforme o prazo. Também encontra a localização e o contato da Secretaria.”

**Mostrar:** agendamento, identificação de acompanhado, consultas, Minha conta, localização e telefone.

**Capacidade:** administra os próprios agendamentos e identifica o acompanhado. Não acessa documentos acadêmicos, relatórios ou consultas de outros titulares. Os lembretes dependem do worker e de SMTP configurado; na demonstração, são recebidos pelo Mailpit.

## 8. Secretaria — 1 minuto

**Fala:** “A Secretaria faz a ponte entre a clínica e a comunidade: acompanha os agendamentos, ajuda a cadastrar e agendar pacientes e trata consultas canceladas que precisam ser remarcadas.”

**Mostrar:** agenda, consultas e pendências de reagendamento.

**Capacidade:** gestão administrativa dos atendimentos; não valida documentos de alunos nem avalia relatórios acadêmicos. O reagendamento é assistido pela Secretaria; não existe fila automática de pacientes nesta versão.

## 9. Segurança e encerramento — 1 minuto

**Fala:** “A interface orienta cada perfil, mas as permissões e as vagas são verificadas novamente no servidor. Senhas são armazenadas como derivação criptográfica, e arquivos têm acesso privado. A reserva é feita em transação para impedir que duas pessoas ocupem a última vaga. Testamos permissões, conflitos, documentação, prazos e concorrência.”

**Mostrar:** documento de verificação e modelo do banco. Destaque `users → enrollments → classes → meetings → bookings`, explicando que inscrições ligam alunos às turmas e consultas pertencem aos encontros.

**Encerramento:** “Entregamos um MVP funcional de gestão e agendamento com persistência, configurações por semestre, documentação e execução reproduzível. O uso institucional ainda exige definições de privacidade e retenção, serviços de produção e validação operacional. Não é um prontuário clínico completo.”

## Preparação da demonstração

1. Para apresentar a versão pública, abra https://clinica-escola-web.onrender.com com antecedência e confira o login. Para apresentar a versão local, inicie Docker Desktop e o projeto. Os bancos são independentes.
2. Use uma turma aprovada, preceptor confirmado e estudante habilitado para mostrar uma reserva válida.
3. Use outra conta de aluno ainda pendente para demonstrar a restrição acadêmica.
4. Para demonstrar relatórios, escolha encontro e horário dentro das regras de prazo.
5. Saia de uma conta antes de entrar na seguinte. Não mostre hashes, tokens ou variáveis secretas no projetor.
6. Abra os diagramas no modo de visualização do GitHub e o Mailpit se for demonstrar os e-mails.
7. Confira `docs/verificacao.md` e o estado real da hospedagem antes de falar sobre resultados e publicação.
