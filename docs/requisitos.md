# Problema e requisitos do Tema 2

## Problema resumido

A clínica-escola precisa organizar, em um único fluxo, a habilitação de estudantes, a disponibilidade de preceptores, a criação de turmas pelos professores e o agendamento de pacientes. O processo deve manter as regras acadêmicas e de capacidade, evitar conflitos de horário e preservar os registros de atendimento.

## Atores e responsabilidades

| Perfil | Responsabilidades principais |
|---|---|
| Master | Configura semestre, cursos, períodos, salas, capacidades, horários, permissões e substituições. Consulta pendências e efetiva transferências. |
| Secretaria | Acompanha pacientes, confirma ou reagenda consultas, comunica cancelamentos e administra o atendimento administrativo. |
| Professor | Valida documentos do estudante vinculado à área, cria encontros a partir de uma disponibilidade de preceptor, escolhe sala/dia/horário, avalia relatórios e registra faltas. |
| Preceptor | Informa disponibilidade e limite de supervisão por sala, acompanha a turma, registra presença/ausência, envia relatório da turma e comunica problemas ao Master. |
| Aluno | Preenche cadastro, envia documentos, escolhe uma vaga em turma compatível e envia relatório de cada aula dentro do prazo. |
| Paciente | Cria acesso por CPF e e-mail, agenda, confirma ou cancela consulta e consulta seu histórico e os dados de localização da clínica. |

## Requisitos funcionais essenciais

- Regras acadêmicas, horários, salas, limites e prazos são configuráveis por perfis autorizados.
- O professor só cria um encontro quando há preceptor, sala e horário disponíveis; o aluno visualiza somente turmas compatíveis com seu curso e período.
- Inscrições são para o semestre. Transferências e desistências passam pelo professor e são efetivadas pelo Master, sem novas inscrições após o fechamento das turmas.
- Consultas ocupam vagas reais e respeitam capacidade da turma, sala e supervisão. Cancelamentos institucionais geram aviso e reagendamento pela Secretaria.
- Relatórios de alunos e preceptores ficam ligados ao encontro e ao professor responsável. O aluno pode reenviar antes do prazo; depois do prazo o arquivo fica imutável.
- Documentos acadêmicos, relatórios e dados de pacientes são exibidos somente para perfis autorizados.
- O paciente pode agendar para si ou para um acompanhado, com identificação de responsável e lembretes de 72, 24 e 5 horas.

## Requisitos não funcionais

- Persistência PostgreSQL, transações para concorrência e backup restaurável.
- Autenticação por sessão, senhas derivadas, limitação de tentativas, autorização no servidor e arquivos privados.
- Interface responsiva para celular, tablet e computador.
- Execução reproduzível com Docker e documentação de instalação, testes, banco e fluxo.

As decisões detalhadas e os limites conhecidos estão em [arquitetura.md](arquitetura.md) e as fontes fornecidas para a Hackathon estão em [fontes](fontes/).
