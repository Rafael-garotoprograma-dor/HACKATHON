# LGPD e proteção de dados

O MVP foi estruturado para aplicar minimização, controle de acesso e rastreabilidade, mas a operação real ainda depende de uma definição institucional de controlador, encarregado, bases legais, retenção e atendimento aos titulares.

## Medidas implementadas

- CPF, e-mail e dados de saúde ficam restritos ao fluxo que precisa deles; relatórios acadêmicos não usam CPF como identificador de aluno.
- Dados acadêmicos, documentos, relatórios e pacientes têm autorização no servidor por perfil e vínculo.
- Senhas são armazenadas somente como derivação scrypt; sessões e tokens de recuperação são armazenados como hash.
- Arquivos têm limite de tamanho, tipos permitidos e rota privada. O sistema não registra senhas ou documentos pessoais em logs.
- Há trilha de auditoria para alterações administrativas e backup restaurável para preservar histórico.
- O ambiente de demonstração usa apenas dados fictícios, Mailpit local e contas de senha compartilhada intencionalmente.

## Pendências para produção

- Formalizar aviso de privacidade, finalidade, base legal, prazos de retenção e procedimento de eliminação/correção.
- Definir perfis institucionais, revisão periódica de acessos e responsável pelo tratamento de incidentes.
- Configurar HTTPS, SMTP institucional, backup protegido, gestão de segredos e antivírus para arquivos enviados.
- Definir se documentos clínicos e relatórios precisam de assinatura, prontuário ou integração com sistema acadêmico.
