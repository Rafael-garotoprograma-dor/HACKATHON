# Projeto: Gestão das Clínicas-Escola

## Objetivo e escopo
Entregar o MVP funcional do Tema 2 da Hackathon Anhanguera Guarapari 2026.2. Priorizar o fluxo completo, segurança e clareza. Não ampliar funcionalidades para demonstrar tecnologias.

## Skills deste projeto
Antes de implementar ou revisar código, leia e aplique:
- `skills/clinicas-escola/SKILL.md`: regras e validação do domínio.
- `skills/foco-mvp/SKILL.md`: controle de escopo e simplicidade.
Esses arquivos são skills locais referenciadas por estas instruções; não dependem de instalação global ou de aparecer no seletor de skills.

## Fontes e decisões
- Consulte `docs/escopo.md` para prioridades, regras essenciais e pendências.
- O PDF orientador é a fonte dos requisitos mínimos. A conversa fornece decisões adicionais; propostas não confirmadas não são decisões.
- Instruções atuais do usuário prevalecem sobre este arquivo. Preserve requisitos adicionais no backlog; adiar não significa excluir.

## Ordem de implementação
1. Persistência, autenticação e permissões dos seis perfis.
2. Configurações por semestre, clínica, salas, equipamentos e capacidades.
3. Disponibilidade do preceptor e criação de turmas pelo professor.
4. Documentos, validação por curso e inscrição acadêmica compatível.
5. Vagas reais, agendamento, confirmação e cancelamento pelo paciente ou Secretaria.
6. Verificação de ponta a ponta, dados fictícios, README, estrutura do banco e fluxo para demonstração.
Depois do núcleo funcional: relatórios acadêmicos, mensagens, transferências encadeadas, lembretes e demais complementos solicitados.

## Critérios de trabalho
- Cada alteração deve atender a um requisito ou corrigir um defeito demonstrado.
- Faça uma etapa funcional por vez. Não adicione dependências, camadas ou serviços sem necessidade concreta.
- Código curto não justifica remover validação, segurança, integridade ou legibilidade. Não imponha limites artificiais de linhas.
- Horários, limites, períodos e regras acadêmicas devem ser dados configuráveis pelos perfis autorizados, não constantes de negócio espalhadas no código.
- Valide permissões e disponibilidade no servidor; não confie apenas nos filtros da interface.
- Teste os riscos reais: acesso indevido, conflito de agenda, última vaga concorrente, documentação pendente e capacidade excedida.
- Use somente dados fictícios na demonstração. Não registre senhas ou documentos pessoais em logs.
- Registre suposições pequenas e reversíveis; não interrompa o desenvolvimento para cada variável. Pergunte apenas quando a resposta mudar materialmente o fluxo ou a segurança.
- Ao concluir, informe o que funciona, o que foi verificado e o que ainda falta. Não declare o sistema completo com fluxos simulados ou persistência ausente.

## Conclusão do núcleo
É possível configurar a clínica, confirmar supervisão, criar turma, validar e inscrever aluno, agendar paciente e confirmar/cancelar a consulta com persistência real e restrições aplicadas. Instruções de execução e demonstração devem ser reproduzíveis. Concluir o núcleo não conclui automaticamente os complementos solicitados.
