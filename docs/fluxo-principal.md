# Fluxo principal do sistema

```mermaid
flowchart TD
  M[Master configura semestre, regras, salas e capacidades] --> P[Preceptor informa disponibilidade, sala e limite]
  P --> T[Professor cria encontro com preceptor confirmado]
  T --> A[Aluno aprovado vê somente turmas do seu curso/período]
  A --> I[Aluno escolhe vaga e permanece inscrito no semestre]
  I --> V[Encontro fica aberto para agendamento]
  V --> C[Paciente cadastra-se e agenda para si ou acompanhado]
  C --> R[Paciente confirma ou cancela dentro do prazo]
  R --> E[Aluno e preceptor realizam atendimento e enviam relatórios]
  E --> F[Professor avalia, comenta e solicita reenvio dentro do prazo]
  E --> H[Secretaria acompanha cancelamentos e reagenda pacientes]
  P -. ausência .-> X[Master analisa pendência e designa substituto]
  X --> T
```

## Sequência de segurança

1. A interface filtra as opções para orientar o usuário, mas a API repete a autorização, compatibilidade acadêmica, capacidade e conflito de agenda.
2. A reserva é confirmada em transação; duas pessoas disputando a última vaga não conseguem ocupá-la ao mesmo tempo.
3. Arquivos são armazenados no banco e baixados por uma rota privada que verifica a sessão e o vínculo com o registro.
4. O worker processa os lembretes e mensagens pendentes sem expor tokens de recuperação em notificações internas.
