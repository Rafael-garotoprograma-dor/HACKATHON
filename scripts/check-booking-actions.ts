// Diagnostic: every attempted update is rolled back, including notices and audit rows.
import { database, transaction, one, closeDatabase } from '../lib/db';
import { mutate, type User } from '../lib/domain';
async function main(){
 const prefix=process.argv[2];if(!prefix||!/^[a-f0-9-]{8,36}$/.test(prefix))throw new Error('Informe o identificador da consulta.');
 const db=await database();const rows=(await db.query('SELECT * FROM bookings WHERE id LIKE $1',[`${prefix}%`])).rows;
 if(rows.length!==1)throw new Error('Consulta não encontrada ou prefixo ambíguo.');
 const b=rows[0],owner=await one(db,'SELECT * FROM users WHERE id=$1',[b.owner_id]) as User;
 for(const status of ['confirmado','cancelado_paciente']){
  const rollback=new Error('DIAGNOSTIC_ROLLBACK');
  try{await transaction(async tx=>{await mutate(tx,owner,'booking-status',{id:b.id,status,decline:true,reason:'Diagnóstico com rollback'});throw rollback;});}
  catch(error){if(error!==rollback)throw error;}
  console.log(`${status}: permitido; alteração desfeita.`);
 }
 console.log('Situação original preservada:',(await one(db,'SELECT status FROM bookings WHERE id=$1',[b.id])).status);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>closeDatabase());
