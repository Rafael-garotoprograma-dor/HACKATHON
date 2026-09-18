import { transaction, closeDatabase } from '../lib/db';
import { demoPeople } from '../lib/demo-people';

// Atualiza apenas identidades sintéticas conhecidas; mantém IDs, senhas e vínculos.
async function main(){
 if(process.env.DEMO_SEED!=='true')throw new Error('Permitido somente no ambiente de demonstração.');
 await transaction(async db=>{
  for(const p of demoPeople){
   await db.query('UPDATE users SET name=$1,email=$2,phone=$3,birth=$4,sex=$5 WHERE id=$6 AND cpf=$7 AND (email=$8 OR email=$2)',[p.name,p.email,p.phone,p.birth,p.sex,p.id,p.cpf,`${p.role}@clinica.test`]);
  }
  const names=['Renata Oliveira Duarte','Gabriel Mendes Carvalho','Juliana Pereira Castro','Rafael Moreira Tavares','Laura Barbosa Freitas','Daniel Teixeira Moura','Ana Clara Nunes','Pedro Henrique Monteiro','Sofia Fernandes Reis','Mateus Ribeiro Dias','Clara Rodrigues Vieira','Bruno Carvalho Lopes','Isabela Santos Pires','Gustavo Almeida Cunha','Mariana Costa Farias','Felipe Souza Gomes'];
  const rows=(await db.query("SELECT id,name,email FROM users WHERE email ~ '^(aluno|paciente|concorrente|seguranca|professor|preceptor)-[0-9]+@example[.]test$' ORDER BY created_at,id")).rows;
  for(let i=0;i<rows.length;i++){
   const u=rows[i],name=names[i%names.length],email=`${name.toLowerCase().replaceAll(' ','.')}.${i+1}@example.test`;
   await db.query('UPDATE users SET name=$1,email=$2,phone=$3 WHERE id=$4',[name,email,`(27) 90000-${String(400+i).padStart(4,'0')}`,u.id]);
  }
  // O agendamento guarda um retrato do paciente; atualiza só consultas do próprio titular.
  await db.query("UPDATE bookings b SET patient=b.patient || jsonb_build_object('name',u.name,'cpf',u.cpf) FROM users u WHERE b.owner_id=u.id AND b.patient->>'type'='proprio' AND (u.email LIKE '%@example.test' OR u.id='paciente')");
  await db.query("UPDATE rooms SET name='Sala de Nutrição ' || right(id,4),clinic='Clínica Integrada' WHERE name ~ '^Sala teste [0-9]+$' AND clinic='Clínica de testes'");
  await db.query("UPDATE classes SET name='Prática de Nutrição ' || right(id,4) WHERE name ~ '^Turma teste [0-9]+$'");
  console.log(`Perfis-base atualizados; ${rows.length} cadastros gerados por testes substituídos por identidades fictícias. Vínculos preservados.`);
 });
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(closeDatabase);
