# Escopo e prioridades

Status em 17/09/2026: núcleo implementado e verificado com Docker/PostgreSQL. Relatórios, mensagens, ocorrências, transferências em lote e lembretes também possuem implementação persistente. Consulte `verificacao.md` para a cobertura dos testes e `arquitetura.md` para limites ainda existentes. Este documento resume o escopo, não substitui todos os detalhes da conversa.

## Fontes
- PDF: `C:/Users/boldr/OneDrive/Imagens/Documentos/Hackathon_Ciencia_da_Computacao_Anhanguera_Guarapari_2026_2.pdf`, Tema 2 nas páginas 6–9, requisitos gerais na 12, entregas na 14 e avaliação na 15.
- Transferência: `C:/Users/boldr/Downloads/Transferencia_Projeto_Clinicas_Escola_ChatGPT.md`.
- Decisões posteriores da conversa prevalecem sobre o resumo de transferência. O usuário já autorizou iniciar código.

## Núcleo prioritário
- Seis perfis com autenticação e permissões: Master, Secretaria, professor, preceptor, aluno, paciente.
- Master configura funcionamento, semestre, cursos, disciplinas, períodos, clínicas, salas, equipamentos, capacidades e permissões.
- Preceptor indica dias, horários, salas possíveis, limite de alunos por sala e capacidade de pacientes. Não supervisiona turmas simultaneamente.
- Professor cria turma/encontros sobre disponibilidade confirmada de preceptor, escolhe sala adequada, duração e cursos/períodos permitidos. Uma turma tem um professor responsável por vez.
- Aluno envia cadastro e documentos; professores autorizados validam na fila do curso. Recusa tem motivo; reenvio permitido durante inscrição. Aprovação não obriga a escolher turma do avaliador.
- Aluno escolhe turma formada e permitida, com vaga e sem conflito. Inscrição automática vale pelo semestre. Após fechamento, não há novas inscrições.
- Considerar matrícula, curso, período, contato, disciplinas/estágio, documentação e compatibilidade acadêmica. Não liberar automaticamente toda atividade inferior apenas pelo número do período.
- Disponibilidade de consulta exige aluno habilitado, preceptor, espaço, equipamento necessário e capacidades simultâneas. Capacidade de pacientes não equivale ao número de alunos; pode haver atendimento em grupo.
- Paciente cria conta com CPF e senha, nome, sexo, data de nascimento, e-mail obrigatório e telefone opcional; Secretaria também agenda. Recuperação usa e-mail.
- Permitir identificação de pessoa acompanhada separada do titular: nome, CPF, menor/idoso, parentesco e necessidade de acompanhamento para idoso. Adulto acompanhado não idoso é proposta ainda não confirmada.
- Paciente consulta vagas, agenda, confirma e cancela; Secretaria trata comunicação e reagendamento dos afetados por cancelamentos.
- Ausência de professor em encontro não cancela supervisão; turma sem avaliador gera pendência para Master. Falta de preceptor sem substituto cancela encontros; retomam-se apenas os próximos, sem reposição.
- Manter histórico, dados fictícios, banco coerente, interface clara e utilizável em diferentes telas, README, repositório, modelo do banco, fluxo principal e apresentação.

## Complementos solicitados: implementar após núcleo funcional
Não são descartados nem apresentados como exigências literais do PDF.
- Transferência: aluno procura professor, professor encaminha ao Master; efetivação depende de vaga e compatibilidade. Trocas encadeadas apenas com destino confirmado para todos e operação completa. Master encerra desistência sem apagar histórico.
- Relatório individual por encontro até 23h59 local; aluno substitui arquivo dentro do prazo; após isso bloqueio sem exceção. Falta informada pelo preceptor e registrada pelo professor dispensa entrega; registrar relatório ausente por falta.
- Preceptor presente no encontro envia relatório obrigatório da turma; atraso gera pendência apenas ao professor. Professor comenta ambos. Primeira entrega tardia foi permitida; alteração após prazo foi proibida. Confirmar a interação dessas regras ao implementar.
- Encontros cancelados não exigem relatórios. Professor substituto acessa relatórios e histórico da turma.
- Mensagens internas. Problema de sala gera pendência para Master avaliar eventual cancelamento. Professor seleciona encontro a cancelar; Secretaria trata pacientes afetados.
- E-mail/lembretes 3 dias e 5 horas antes; solicitação de confirmação 24 horas antes; recusa avisa Secretaria. Não resposta, agendamentos tardios e limite preciso de cancelamento permanecem em aberto.
- Prioridade de reagendamento em eventual fila de espera.
- Relatórios acadêmicos usam identificador do atendimento e informações necessárias, sem repetir CPF e contato. Documentos de alunos: Master e professores autorizados/vinculados conforme etapa.

## Propostas e decisões técnicas ainda não consolidadas
- Implementação adotada: Next.js, TypeScript e PostgreSQL no Docker; PGlite para testes isolados.
- Arquivamento preserva os registros no banco e bloqueia as operações acadêmicas principais. Backup integral pode ser exportado e restaurado. Não há visualizador separado de arquivo morto.
- Detalhes pequenos podem receber padrões configuráveis, identificados como suposições. Não afirmar que padrões são decisões do usuário.
- Mudanças de capacidade não expulsam alunos; preservar vínculos e exigir ajuste operacional compatível, sem ignorar limites.

## Fora da primeira entrega
Chatbot, inteligência artificial, dashboards sofisticados, análises preditivas e prontuário clínico completo. Não incluir sem necessidade e autorização de escopo.
