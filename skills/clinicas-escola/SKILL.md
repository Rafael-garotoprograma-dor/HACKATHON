---
name: clinicas-escola
description: Implementar e revisar os fluxos do projeto Clínicas-Escola do Tema 2, respeitando permissões, supervisão, configuração por semestre e disponibilidade real de atendimentos.
---

# Clínicas-Escola

Leia `../../docs/escopo.md` antes de alterar o domínio. Consulte apenas a parte relevante dos requisitos e o PDF quando precisar verificar uma exigência original.

## Regras de implementação
- Preserve os seis perfis: Master, Secretaria, professor, preceptor, aluno e paciente.
- A cadeia é Master configura funcionamento e salas; preceptor oferece supervisão e capacidade por sala; professor forma turma dentro dessa disponibilidade; aluno validado escolhe turma; paciente agenda uma vaga realmente viável.
- Validação documental ocorre na fila do curso por professor autorizado pelo Master. Não vincula o aluno à turma do avaliador. O vínculo acadêmico surge na inscrição.
- Não confunda turma sem avaliador com encontro sem preceptor. Professor pode faltar pontualmente; preceptor é obrigatório e não supervisiona turmas simultâneas.
- Cursos, períodos, capacidades, horários e inscrições são configurações administráveis. Estar em período avançado não dispensa pré-requisitos confirmados.
- Ao reservar, valide novamente aluno habilitado, supervisor, sala, equipamentos e capacidades. Impeça dupla ocupação e excesso de vagas mesmo com solicitações concorrentes.
- Autorização deve ser aplicada no servidor e por vínculo quando necessário, inclusive em downloads. Não exponha documentos por URL pública.
- Preserve histórico ao substituir responsáveis, transferir alunos ou encerrar vínculos. Não exclua dados históricos para liberar vaga.

## Verificação proporcional
Para o fluxo alterado, verifique um caso válido e os bloqueios relevantes. Em agendas e inscrições, verifique conflito ou concorrência; em documentos, acesso e habilitação. Não implemente módulos adicionais apenas para testar o módulo atual.

Registre ambiguidades como suposições ou pendências, sem transformar recomendações antigas em requisitos aprovados.
