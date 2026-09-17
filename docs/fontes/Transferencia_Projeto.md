# Transferência de Projeto — Sistema de Gestão das Clínicas-Escola

## Finalidade deste arquivo
Este arquivo foi preparado para ser enviado/aberto no aplicativo do ChatGPT e permitir a continuação do projeto com o contexto essencial já organizado.

## Projeto
**Hackathon Ciência da Computação 2026.2 — Anhanguera Guarapari**

**Tema escolhido:** Desafio 2 — Sistema de Gestão das Clínicas-Escola  
Áreas citadas no documento: Odontologia, Fisioterapia, Nutrição e Psicologia.

## Orientação principal do usuário
Antes de começar a programar, o projeto deve passar por uma **revisão completa de requisitos**.

**Não criar código ainda.**

A etapa atual é entender:
- como o sistema deverá funcionar;
- quais usuários existirão;
- quais cadastros serão necessários;
- quais regras de negócio deverão ser aplicadas;
- como controlar disponibilidade e compatibilidade de horários;
- como serão feitos agendamentos;
- como funcionarão confirmação e cancelamento;
- como serão tratados avisos, atualizações e mudanças de disponibilidade;
- como tornar o sistema configurável para diferentes semestres.

O trabalho deve ser conduzido passo a passo, junto com o usuário, antes da implementação.

---

# 1. Contexto do problema

As clínicas-escola permitem que estudantes realizem atendimentos à comunidade sob supervisão de professores e/ou preceptores.

A organização dos atendimentos depende simultaneamente de:
- disponibilidade dos estudantes;
- horários acadêmicos;
- disponibilidade dos professores/preceptores;
- limite de supervisão;
- capacidade física da clínica;
- quantidade de consultórios/salas;
- equipamentos disponíveis;
- documentação obrigatória;
- horários oferecidos à comunidade.

Essas condições podem mudar a cada semestre. Portanto, o sistema deve ser **configurável e adaptável**.

---

# 2. Objetivo central

Desenvolver um sistema integrado para organizar:

- estudantes;
- professores;
- preceptores;
- documentos;
- clínicas;
- ambientes;
- consultórios;
- disponibilidade;
- supervisão;
- agendamentos da comunidade.

---

# 3. Perfis de usuário que devem ser analisados

## 3.1 Aluno
Deve possuir cadastro com:
- nome;
- matrícula;
- curso;
- período;
- contato;
- disciplina ou estágio;
- disponibilidade;
- documentação obrigatória.

Deve poder:
- enviar documentos;
- acompanhar aprovação ou pendências;
- consultar horários permitidos;
- selecionar horários compatíveis;
- visualizar seus agendamentos/atividades, se essa função for adotada.

## 3.2 Professor / Preceptor
Cadastro com:
- nome;
- área/curso;
- dias disponíveis;
- horários disponíveis;
- ambiente de supervisão;
- limite máximo de alunos supervisionados simultaneamente.

Pode também participar da:
- validação documental;
- supervisão dos alunos;
- gestão dos horários vinculados a sua atuação.

## 3.3 Comunidade / Paciente
Deve poder:
- consultar horários disponíveis;
- realizar agendamento;
- confirmar consulta;
- cancelar consulta.

O agendamento só poderá existir quando houver simultaneamente:
- aluno habilitado;
- professor/preceptor disponível;
- capacidade de supervisão;
- clínica/consultório disponível;
- capacidade física disponível.

## 3.4 Perfil Master / Administrador
Deve poder:
- alterar configurações e capacidades;
- cadastrar/remover usuários;
- editar alunos, professores e preceptores;
- cadastrar cursos;
- cadastrar disciplinas;
- cadastrar clínicas;
- cadastrar ambientes;
- cadastrar consultórios;
- administrar permissões;
- consultar dados gerais.

---

# 4. Documentação obrigatória

O sistema deverá permitir:

1. envio digital de documentos pelo aluno;
2. análise por professor ou responsável;
3. aprovação do documento;
4. recusa do documento;
5. indicação do que deve ser corrigido;
6. bloqueio do acesso aos agendamentos enquanto existirem pendências.

Possíveis estados para análise:
- pendente;
- em análise;
- aprovado;
- recusado;
- correção solicitada.

Essa modelagem deverá ser revisada antes da implementação.

---

# 5. Disponibilidade e compatibilidade de horários

Esta é uma das regras centrais do sistema.

Um horário só deve ser oferecido quando existir compatibilidade entre:

- disponibilidade do aluno;
- horário acadêmico da turma/disciplina/estágio;
- disponibilidade do professor/preceptor;
- limite de supervisão;
- clínica;
- consultório/sala;
- capacidade máxima de atendimento;
- capacidade máxima de estudantes;
- período de funcionamento configurado para o semestre.

O sistema deverá impedir conflitos.

Exemplos de conflito que precisam ser tratados:
- aluno possui aula em outro local;
- professor não está disponível;
- limite de alunos do supervisor já foi atingido;
- todos os consultórios estão ocupados;
- clínica atingiu a capacidade máxima;
- aluno possui documentação pendente;
- aluno já está alocado em outro atendimento naquele horário.

---

# 6. Capacidade de supervisão

Cada professor/preceptor poderá possuir um limite de alunos simultaneamente.

Regra obrigatória:
**quando o limite de estudantes supervisionados naquele horário for atingido, novas inscrições devem ser bloqueadas.**

Exemplo:
Professor A:
- 08:00 às 10:00;
- máximo de 4 alunos.

Com 4 alunos já vinculados ao horário, a vaga deve deixar de estar disponível.

---

# 7. Capacidade física da clínica

O sistema deve permitir configurar:
- quantidade de consultórios/salas;
- quantidade de equipamentos;
- capacidade máxima de atendimentos simultâneos;
- capacidade máxima de estudantes.

A disponibilidade de um horário deve considerar esses limites.

---

# 8. Configuração por semestre

O sistema deverá permitir reconfiguração por semestre.

Itens que podem variar:
- número de alunos;
- turmas;
- períodos;
- disciplinas;
- estágios;
- horários;
- professores;
- preceptores;
- disponibilidade dos supervisores;
- limite de supervisão;
- capacidade da clínica;
- consultórios disponíveis;
- ambientes;
- capacidade de atendimento;
- regras de funcionamento.

A solução não deve depender de horários fixos escritos diretamente no código.

---

# 9. Agendamento pela comunidade

Fluxo básico proposto para análise:

1. pessoa acessa o sistema;
2. escolhe o serviço/área;
3. sistema consulta vagas realmente possíveis;
4. mostra somente horários válidos;
5. pessoa informa dados necessários;
6. confirma solicitação;
7. sistema registra o agendamento;
8. horário/capacidade é atualizado;
9. sistema permite confirmação ou cancelamento posterior.

Regra principal:
**não basta o consultório estar livre. É necessário haver aluno, supervisor e espaço físico disponíveis simultaneamente.**

---

# 10. Confirmação e cancelamento

O documento exige possibilidade de confirmação e cancelamento.

Durante a revisão de requisitos, definir estados como:
- solicitado;
- agendado;
- aguardando confirmação;
- confirmado;
- cancelado pelo paciente;
- cancelado pela instituição;
- realizado;
- não compareceu.

Também deve ser decidido:
- até quando a pessoa pode cancelar;
- se uma vaga cancelada volta imediatamente para disponibilidade;
- se haverá fila de espera;
- se haverá aviso automático;
- quem pode cancelar administrativamente.

---

# 11. Avisos, lembretes e atualizações

O usuário pediu que sejam considerados avisos e mudanças de disponibilidade.

Possíveis eventos que devem ser analisados:
- consulta criada;
- consulta confirmada;
- consulta cancelada;
- alteração de horário;
- professor indisponível;
- mudança de consultório;
- documento aprovado;
- documento recusado;
- documentação prestes a vencer, caso sejam usados documentos com validade;
- vaga liberada;
- inclusão em fila de espera.

O documento cita lembretes automáticos como diferencial, portanto devem ser priorizados somente depois que o fluxo principal estiver funcional.

---

# 12. Filtros e consultas

Durante a modelagem, avaliar filtros para:

## Alunos
- curso;
- período;
- disciplina;
- estágio;
- situação documental;
- disponibilidade;
- status.

## Professores / Preceptores
- curso/área;
- dia;
- horário;
- ambiente;
- capacidade;
- disponibilidade.

## Agendamentos
- data;
- horário;
- clínica;
- curso;
- aluno;
- supervisor;
- paciente;
- status.

## Clínicas / Ambientes
- unidade;
- tipo;
- capacidade;
- disponibilidade.

---

# 13. Segurança, privacidade e LGPD

O documento geral da Hackathon exige:
- autenticação;
- validação de dados;
- proteção contra acessos indevidos;
- controle de acesso por perfil;
- cuidado com informações pessoais;
- adequação à LGPD;
- uso de dados fictícios ou anonimizados na demonstração.

Como o sistema lida com estudantes e pacientes, deve-se evitar exposição desnecessária de dados.

---

# 14. Requisitos gerais para a solução

O projeto deve buscar:
- interface clara;
- simplicidade;
- responsividade;
- funcionamento em computador, tablet e smartphone;
- banco de dados coerente;
- controle de acesso;
- segurança;
- privacidade;
- organização dos dados.

---

# 15. Funcionalidades opcionais / diferenciais

Depois do MVP, poderão ser analisados:
- fila de espera;
- lista de presença;
- lembretes automáticos;
- relatórios;
- indicadores por curso;
- dashboard;
- avaliação da experiência da comunidade;
- chatbot inteligente.

O chatbot é **opcional** e não substitui os requisitos principais.

---

# 16. Prioridade do MVP

A Hackathon valoriza primeiro o funcionamento do fluxo principal.

Uma prioridade sugerida para o MVP é:

1. autenticação e perfis;
2. cadastro de alunos;
3. cadastro de professores/preceptores;
4. cadastro de clínicas/ambientes/consultórios;
5. configuração de horários;
6. documentação dos alunos;
7. validação documental;
8. regra de disponibilidade;
9. regra de limite de supervisão;
10. regra de capacidade física;
11. geração de vagas válidas;
12. agendamento da comunidade;
13. confirmação/cancelamento;
14. painel administrativo básico.

Somente depois:
- notificações avançadas;
- fila de espera;
- dashboards sofisticados;
- chatbot;
- recursos de inteligência artificial.

---

# 17. Entregas obrigatórias da Hackathon

O projeto final deverá conter:
- protótipo funcional (MVP);
- código-fonte organizado;
- repositório;
- README com instruções;
- descrição resumida do problema e requisitos;
- tecnologias utilizadas;
- modelo/estrutura do banco de dados;
- representação do fluxo principal;
- apresentação final.

---

# 18. Critérios de avaliação

Pontuação total: 100 pontos.

- atendimento ao problema e requisitos: 20;
- funcionamento do protótipo: 20;
- qualidade técnica: 15;
- usabilidade e experiência do usuário: 15;
- criatividade e inovação: 10;
- segurança, privacidade e organização dos dados: 10;
- viabilidade e continuidade: 5;
- apresentação e demonstração: 5.

Isso indica que o projeto deve priorizar **requisitos + funcionamento + usabilidade**, e não apenas quantidade de funcionalidades.

---

# 19. Estratégia para continuar a conversa no ChatGPT

Ao abrir este arquivo em outra conversa, usar a seguinte orientação:

> Estou desenvolvendo o Tema 2 da Hackathon Ciência da Computação 2026.2 da Anhanguera Guarapari: Sistema de Gestão das Clínicas-Escola.
>
> O arquivo contém o contexto e os requisitos levantados até agora.
>
> Não quero programar ainda.
>
> Quero continuar a revisão de requisitos passo a passo, tomando decisões comigo antes de definir banco de dados, arquitetura ou código.
>
> Comece pela definição dos usuários/perfis e depois avance para cadastros, documentação, disponibilidade, regras de horários, capacidade de supervisão, capacidade física, agendamento, confirmação/cancelamento, notificações e configuração por semestre.
>
> Sempre diferencie:
> 1. requisito obrigatório do documento;
> 2. decisão de projeto que ainda precisamos tomar;
> 3. funcionalidade opcional/diferencial.

---

# 20. Registro da conversa relevante

## Mensagem anterior do usuário
“eu lhe forneci um documento com instruções e requisitos para um projeto. Preciso fazer um sistema de gestão de atendimento. No caso meu trabalho é o tema 2.

Antes de começarmos a codar, preciso antes fazer uma revisão de requisitos para entender como será feito, quais as necessidades, e qual a estratégia. Então chat, preciso que você, junto comigo, revisemos passo a passo todas as necessidades do sistema, e o que devo incluir. Como opções de cadastro; filtragem; agendamento disponível; compatibilidade de horários entre alunos, professores e ambientes de trabalho; confirmação ou cancelamento de consultas; e avisos e atualizações. O sistema deve ser configurável, dependendo das mudanças de horários e disponibilidade.

Não crie código ainda, vamos revisar e montar nossa estratégia para executá-la.”

## Solicitação atual
“preciso que passe esse projeto para o aplicativo do chat. Crie um arquivo com a conversa para que eu possa trasferir para o app”

---

## Fonte principal
Documento: **Hackathon Ciência da Computação 2026.2 — Anhanguera Guarapari**  
Trechos principais utilizados: Desafio 2 (páginas 6 a 9), requisitos gerais (página 12), cronograma e entregas (páginas 13 e 14), critérios de avaliação (página 15) e princípios/resultados esperados (páginas 15 e 16).

