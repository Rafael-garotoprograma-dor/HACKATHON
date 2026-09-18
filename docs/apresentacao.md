# Integra — Gestão das Clínicas-Escola

## O problema

As clínicas-escola permitem que estudantes atendam à comunidade sob supervisão acadêmica. Para organizar esses atendimentos, a instituição precisa conciliar horários, formação dos estudantes, documentação obrigatória, disponibilidade dos responsáveis e capacidade das salas. Uma consulta só pode ser oferecida quando essas condições são atendidas simultaneamente.

Informações dispersas dificultam a verificação de documentos, favorecem conflitos de agenda e tornam cancelamentos e substituições mais difíceis de acompanhar. Além disso, cursos, períodos, horários e capacidades podem mudar a cada semestre, exigindo um sistema configurável.

## A solução desenvolvida

O Integra centraliza a gestão acadêmica e os agendamentos em um sistema web com seis perfis: Master, Secretaria, professor, preceptor, aluno e paciente. Cada perfil acessa as informações e operações necessárias à sua função.

O Master configura as regras de funcionamento. O preceptor oferece horários, salas e limites de supervisão; o professor cria turmas a partir dessa disponibilidade. O aluno envia documentos para validação por professor autorizado no curso e, após aprovação, escolhe uma turma compatível e com vaga. Essa validação inicial não obriga o aluno a escolher a turma do professor avaliador.

O paciente ou a Secretaria agenda consultas nos encontros disponíveis. O sistema verifica permissões, compatibilidade acadêmica, conflitos e capacidade no servidor, inclusive quando duas pessoas disputam a última vaga. O paciente acompanha suas consultas, confirma ou cancela conforme os prazos e consulta o endereço e telefone da clínica.

Alunos e preceptores enviam relatórios vinculados ao encontro; o professor avalia e comenta. O sistema também registra faltas, mensagens, ocorrências, cancelamentos e transferências. O Master pode substituir responsáveis e efetivar transferências preservando o histórico. Um processo em segundo plano cuida da fila de e-mails e lembretes.

As configurações e registros são persistidos no banco de dados. Assim, a instituição pode ajustar regras pelo próprio sistema e acompanhar o fluxo desde a habilitação acadêmica até o atendimento e a avaliação.

## Tecnologias e ferramentas utilizadas

| Tecnologia | Aplicação no projeto |
|---|---|
| TypeScript | Linguagem utilizada na interface, API, regras e scripts, com verificação de tipos. |
| React e Next.js | Componentes das telas, páginas e rotas HTTP da API na mesma aplicação. |
| CSS | Apresentação visual e adaptação das telas a diferentes larguras. |
| Node.js | Execução do servidor e do processo de lembretes. |
| SQL e PostgreSQL | Persistência relacional, chaves, restrições, índices e transações. |
| pg | Comunicação do servidor com PostgreSQL por consultas parametrizadas. |
| PGlite | Banco PostgreSQL embutido para desenvolvimento e testes isolados. |
| Nodemailer e Mailpit | Envio de e-mails e caixa local para conferir mensagens de demonstração. |
| Docker e Docker Compose | Ambiente reproduzível com aplicação, banco, worker e caixa de e-mails. |
| Node Test Runner e tsx | Testes automatizados de regras, permissões e integridade. |
| Git e GitHub | Histórico de versões e disponibilização do código e documentação. |
| Mermaid | Diagramas de fluxo, arquitetura e relacionamentos do banco. |

O código separa componentes visuais, rotas da API, regras de negócio, autenticação, acesso aos dados e scripts operacionais. As páginas chamam a API; ela verifica a sessão e aplica as regras antes de consultar ou alterar o banco. Senhas são protegidas com scrypt e arquivos são acessados por rotas privadas.

## Resultado e limites

Foi desenvolvido um MVP com persistência real, execução por Docker, dados fictícios reproduzíveis e testes automatizados. A publicação no GitHub está concluída; há uma configuração preparada para o Render, mas a hospedagem ainda está pendente.

O sistema é uma ferramenta de gestão acadêmica e agendamento. Não inclui prontuário clínico completo, assinatura digital nem fila automática de pacientes. Os resultados de testes e demais limites estão em [verificacao.md](verificacao.md) e [arquitetura.md](arquitetura.md).
