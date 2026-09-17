---
name: foco-mvp
description: Conter o escopo e orientar entregas funcionais simples no MVP de Clínicas-Escola, priorizando requisitos mínimos e evitando funcionalidades e abstrações especulativas.
---

# Foco no MVP

Use o `../../AGENTS.md` e `../../docs/escopo.md` para escolher a próxima entrega. Esta skill orienta prioridades; não autoriza descartar requisitos expressos do usuário.

Antes de implementar, identifique o requisito atendido, o comportamento observável e o critério de conclusão. Se a mudança não atender a requisito, defeito ou dependência necessária, registre-a como sugestão e não a implemente automaticamente.

Entregue o menor fluxo completo com persistência e validações reais. Prefira a estrutura existente e funções claras. Extraia abstrações quando houver repetição relevante ou complexidade concreta, não por previsão de crescimento. Não adicione microserviços, frameworks ou dependências sem benefício necessário à entrega atual.

Preserve autenticação, autorização, integridade e tratamento de falhas essenciais. Simplificar não significa fazer apenas uma interface com dados simulados ou aceitar reservas inconsistentes.

Conclua e verifique a etapa atual antes de ampliar o produto. Faça testes de comportamento e riscos relevantes; evite testes que apenas repetem a implementação. Depois de verificações suficientes, avance sem polimento indefinido.

Mantenha recursos adicionais solicitados no backlog e informe o adiamento. Não peça aprovação repetida para decisões pequenas e reversíveis. Uma solicitação explícita posterior pode alterar a prioridade; atualize os documentos nesse caso.
