# Como abrir e entender o banco

## Arquivos e dados

- `database/schema.sql` é a planta do banco: cria as tabelas e suas relações, mas não contém a lista de usuários cadastrados.
- `lib/demo-people.ts` contém os cadastros fictícios legíveis: nome, perfil, CPF, e-mail, telefone, nascimento e sexo.
- `lib/seed.ts` insere essas pessoas, salas, turmas e uma consulta em um banco vazio com demonstração habilitada.
- O banco em uso fica no volume PostgreSQL do Docker. Cadastros feitos pelo site vão para esse banco, não para os arquivos do GitHub.

Os nomes são inventados; os CPFs são exemplos com dígitos verificadores, não identidades verificadas. Telefones são ilustrativos, e os e-mails `.test` não são caixas reais. Não contate essas identidades.

## Abrir pelo terminal

Com Docker Desktop iniciado, abra o terminal na pasta do projeto:

```powershell
docker compose start
docker compose exec db psql -U clinica -d clinica
```

Dentro do PostgreSQL, `\dt` lista as tabelas, `\d users` mostra as colunas dos usuários e `\q` sai. Consultas SQL terminam com ponto e vírgula.

```sql
-- Pessoas cadastradas, sem exibir senhas ou tokens
SELECT id, name AS nome, role AS perfil, email, cpf,
       phone AS telefone, birth AS nascimento,
       course AS curso, period AS periodo, approved AS aprovado
FROM users ORDER BY role, name;

-- Aluno e turma: os IDs conectam as tabelas
SELECT u.name AS aluno, c.name AS turma, e.status AS inscricao
FROM enrollments e
JOIN users u ON u.id = e.student_id
JOIN classes c ON c.id = e.class_id;

-- Consulta, paciente, titular, turma e sala
SELECT b.id, b.patient->>'name' AS paciente, u.name AS titular,
       c.name AS turma, m.day AS dia, b.slot AS horario,
       r.name AS sala, b.status AS situacao
FROM bookings b
JOIN users u ON u.id = b.owner_id
JOIN meetings m ON m.id = b.meeting_id
JOIN classes c ON c.id = m.class_id
JOIN rooms r ON r.id = m.room_id;
```

`users` contém todos os perfis; `role` identifica cada função. `classes` são turmas; `meetings` são suas aulas em datas concretas; `enrollments` liga alunos às turmas; `bookings` liga consultas aos encontros. O titular da reserva pode ser o responsável por outra pessoa, por isso o paciente também é armazenado em `patient`. Veja o [modelo completo](banco-de-dados.md).

## Atualizar uma demonstração já existente

A carga inicial não sobrescreve um banco preenchido. Para substituir os cadastros sintéticos antigos, primeiro faça backup e depois execute a rotina específica:

```powershell
docker compose stop app worker
node scripts/backup.mjs --verify
docker compose up -d --build
docker compose exec -T app node --import tsx scripts/refresh-demo-people.ts
```

A rotina exige `DEMO_SEED=true`. Ela substitui os nomes e contatos dos perfis-base reconhecidos e dos cadastros criados pelos scripts de teste, preservando IDs, CPFs, senhas, inscrições e consultas. Não apaga cadastros externos a esses critérios. Os testes automatizados continuam usando dados artificiais próprios; não é necessário excluir seus arquivos para apresentar o sistema.
