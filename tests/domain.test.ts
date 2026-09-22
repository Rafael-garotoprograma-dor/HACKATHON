import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {database,transaction,one,closeDatabase} from '../lib/db';
import {initialize} from '../lib/seed';
import {mutate,meetingInfo,availableSlots,type User} from '../lib/domain';
import {snapshot,authorizeFile} from '../lib/state';
import {localDay,id,hashPassword,verifyPassword,cpfValid} from '../lib/security';
import {enqueueReminders} from '../lib/reminders';

test('Fluxos e invariantes do sistema',async t=>{
 delete process.env.DATABASE_URL;process.env.LOCAL_DB_PATH=await mkdtemp(path.join(tmpdir(),'clinica-test-'));process.env.DEMO_SEED='true';process.env.DEMO_PASSWORD='TesteSeguro2026!';
 await initialize();const db=await database();
 const user=async (role:string)=>await one(db,'SELECT * FROM users WHERE id=$1',[role]) as User;
 const master=await user('master'),student=await user('aluno'),patient=await user('paciente'),prof=await user('professor'),preceptor=await user('preceptor');
 const run=(u:User,a:string,p:any)=>transaction(tx=>mutate(tx,u,a,p));
 try{
 await t.test('Somente paciente e Secretaria podem operar consultas',async()=>{
  const meeting=await one(db,"SELECT id FROM meetings WHERE day>$1 ORDER BY day LIMIT 1",[localDay()]);
  await assert.rejects(run(master,'booking',{meeting_id:meeting.id,slot:'08:00',patient:{type:'proprio'}}),/permissão/);
  await assert.rejects(run(prof,'booking',{meeting_id:meeting.id,slot:'08:00',patient:{type:'proprio'}}),/permissão/);
  await assert.rejects(run(student,'booking-status',{id:'inexistente',status:'confirmado'}),/permissão/);
 });
 await t.test('Senhas são verificadas por hash e CPF tem dígitos verificadores',()=>{const hash=hashPassword('UmaSenhaSegura!');assert.notEqual(hash,'UmaSenhaSegura!');assert.equal(verifyPassword('UmaSenhaSegura!',hash),true);assert.equal(verifyPassword('errada',hash),false);assert.equal(cpfValid('11144477735'),true);assert.equal(cpfValid('00000000000'),false);});
 await t.test('Aluno não altera configurações administrativas',async()=>{await assert.rejects(run(student,'settings',{data:{}}),/permissão/);});
 await t.test('Endereço e telefone são configuráveis pelo Master e persistem',async()=>{
  const original=(await one(db,'SELECT data FROM settings WHERE id=1')).data;
  await run(master,'settings',{data:{...original,clinicAddress:'Endereço fictício',clinicMapUrl:'https://maps.google.com/',secretaryPhone:'(27) 3333-4444'}});
  const saved=(await one(db,'SELECT data FROM settings WHERE id=1')).data;
  assert.equal(saved.clinicAddress,'Endereço fictício');assert.equal(saved.secretaryPhone,'(27) 3333-4444');
  await assert.rejects(run(patient,'settings',{data:saved}),/permissão/);
  await assert.rejects(run(master,'settings',{data:{...saved,clinicMapUrl:'javascript:alert(1)'}}),/localização/);
  await run(master,'settings',{data:{...original,clinicAddress:'',clinicMapUrl:'',secretaryPhone:''}});
 });
 await t.test('Dados e arquivos privados não são expostos ao paciente',async()=>{const view=await snapshot(db,patient);assert.equal(view.documents.length,0);assert.equal(view.reports.length,0);assert.equal(view.enrollments.length,0);assert.equal('password' in view.me,false);const doc=await one(db,'SELECT id FROM documents LIMIT 1');assert.equal(await authorizeFile(db,patient,'documents',doc.id),null);assert.ok(await authorizeFile(db,prof,'documents',doc.id));});
 await t.test('Fila de curso não exige vínculo de turma com professor avaliador',async()=>{const other={...prof,id:'prof-novo'};await db.query("INSERT INTO users(id,name,email,cpf,password,role,course,permissions) VALUES('prof-novo','Novo professor','novo@example.test','22222222222','hash','professor','Odontologia',$1)",[JSON.stringify(['Odontologia'])]);const doc=await one(db,'SELECT id FROM documents LIMIT 1');await run(other,'review-document',{id:doc.id,status:'aprovado',comment:'Conferido'});assert.equal((await user('aluno')).approved,true);});
 await t.test('Nova turma não pode sobrepor sala ou supervisão existente',async()=>{const c=await one(db,'SELECT * FROM classes LIMIT 1');await assert.rejects(run(prof,'class',{name:'Conflitante',course:c.course,availability_id:c.availability_id,periods:[8],start_date:c.start_date,end_date:c.end_date,duration:60}),/Conflito/);});
 await t.test('Inscrição duplicada ou incompatível é bloqueada',async()=>{await assert.rejects(run(student,'enroll',{class_id:'turma-0'}),/horário/);await assert.rejects(run({...student,approved:false},'enroll',{class_id:'turma-0'}),/documentos/);});
 const future=await one(db,'SELECT id FROM meetings WHERE day>$1 ORDER BY day DESC LIMIT 1',[localDay()]);
 await t.test('Vagas dependem de aluno habilitado',async()=>{const m=await meetingInfo(db,future.id);assert.ok((await availableSlots(db,m)).length);await db.query("UPDATE users SET approved=false WHERE id='aluno'");assert.equal((await availableSlots(db,m)).length,0);await db.query("UPDATE users SET approved=true WHERE id='aluno'");});
 await t.test('Vários alunos se inscrevem na mesma turma com identificadores independentes',async()=>{
  for(const suffix of ['2','3']){
   await db.query("INSERT INTO users(id,name,email,cpf,password,role,course,period,approved,subjects) SELECT $1,name,$2,$3,password,role,course,period,true,subjects FROM users WHERE id='aluno'",['aluno'+suffix,`aluno${suffix}@example.test`,'ficticio'+suffix]);
   await db.query("INSERT INTO documents(id,student_id,kind,filename,mime,content,status) SELECT $1,$2,kind,filename,mime,content,'aprovado' FROM documents WHERE student_id='aluno' LIMIT 1",[id(),'aluno'+suffix]);
   await run(await user('aluno'+suffix),'enroll',{class_id:'turma-2'});
  }
  assert.equal((await one(db,"SELECT count(*)::int AS n FROM enrollments WHERE class_id='turma-2' AND status='ativa'")).n,3);
 });
 await t.test('Última vaga não pode ser vendida duas vezes em concorrência',async()=>{
  const m=await meetingInfo(db,future.id);await db.query('UPDATE meetings SET patient_limit=1 WHERE id=$1',[m.id]);
  await db.query("INSERT INTO users(id,name,email,cpf,password,role) VALUES('paciente2','Outro paciente','outro@example.test','52998224725x','hash','paciente')");const p2=await user('paciente2');
  const payload={meeting_id:m.id,slot:'08:00',patient:{type:'proprio'}};
  // Use a valid CPF for the second patient without colliding with seed identities.
  await db.query("UPDATE users SET cpf='15350946056' WHERE id='paciente2'");p2.cpf='15350946056';
  const results=await Promise.allSettled([run(patient,'booking',payload),run(p2,'booking',payload)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await one(db,"SELECT count(*)::int AS n FROM bookings WHERE meeting_id=$1 AND slot='08:00'",[m.id])).n,1);
 });
 await t.test('Consultas da mesma turma têm IDs distintos e respeitam privacidade',async()=>{
  await db.query('UPDATE meetings SET patient_limit=2 WHERE id=$1',[future.id]);
  const a=await run(patient,'booking',{meeting_id:future.id,slot:'09:00',patient:{type:'proprio'}});
  const b=await run(await user('paciente2'),'booking',{meeting_id:future.id,slot:'09:00',patient:{type:'proprio'}});assert.notEqual(a.id,b.id);
  await assert.rejects(run(await user('paciente2'),'booking-status',{id:a.id,status:'confirmado'}),/outro paciente/);
  const view=await snapshot(db,student);const booking=view.bookings.find(x=>x.id===a.id);assert.ok(booking);assert.equal(booking.patient.cpf,undefined);assert.match(booking.patient.name,/Atendimento/);
  const secretary=await snapshot(db,await user('secretaria'));assert.equal(secretary.users.find(x=>x.id===student.id)?.cpf,undefined);
 });
 await t.test('Confirmar e cancelar alteram a reserva existente mesmo com a última vaga ocupada',async()=>{
  await db.query('UPDATE meetings SET patient_limit=1 WHERE id=$1',[future.id]);
  const booked=await run(patient,'booking',{meeting_id:future.id,slot:'10:00',patient:{type:'proprio'}});
  const count=(await one(db,'SELECT count(*)::int AS n FROM bookings')).n;
  const slots=await availableSlots(db,await meetingInfo(db,future.id));assert.ok(!slots.some(s=>s.time==='10:00'));
  await run(patient,'booking-status',{id:booked.id,status:'confirmado'});
  assert.equal((await one(db,'SELECT status FROM bookings WHERE id=$1',[booked.id])).status,'confirmado');
  await run(patient,'booking-status',{id:booked.id,status:'cancelado_paciente',reason:'Teste'});
  assert.equal((await one(db,'SELECT status FROM bookings WHERE id=$1',[booked.id])).status,'cancelado_paciente');
  assert.equal((await one(db,'SELECT count(*)::int AS n FROM bookings')).n,count);
 });
 await t.test('Lembretes recuperam parada sem duplicar nem enviar janelas antigas',async()=>{
  const m=await meetingInfo(db,future.id);const b=await one(db,"SELECT id FROM bookings WHERE meeting_id=$1 AND slot='09:00' LIMIT 1",[m.id]);const when=new Date(`${m.day}T09:00:00-03:00`).getTime();
  const tick=(hours:number)=>transaction(tx=>enqueueReminders(tx,new Date(when-hours*3600000)));
  await tick(71);await tick(71);assert.equal((await one(db,'SELECT count(*)::int AS n FROM outbox WHERE dedupe=$1',[`${b.id}:72`])).n,1);
  await tick(20);await tick(4);assert.equal((await one(db,'SELECT count(*)::int AS n FROM outbox WHERE dedupe LIKE $1',[`${b.id}:%`])).n,3);
 });
 await t.test('Cancelar encontro cancela consultas ativas e preserva cancelamentos anteriores',async()=>{
  const m=await meetingInfo(db,future.id);
  const active=(await one(db,"SELECT count(*)::int AS n FROM bookings WHERE meeting_id=$1 AND status IN ('agendado','confirmado')",[m.id])).n;
  await run(prof,'cancel-meeting',{meeting_id:m.id,reason:'Teste operacional'});
  assert.equal((await one(db,'SELECT status FROM meetings WHERE id=$1',[m.id])).status,'cancelado');
  assert.equal((await one(db,"SELECT count(*)::int AS n FROM bookings WHERE meeting_id=$1 AND status='cancelado_instituicao'",[m.id])).n,active);
  assert.equal((await one(db,"SELECT status FROM bookings WHERE meeting_id=$1 AND slot='10:00'",[m.id])).status,'cancelado_paciente');
  assert.ok(await one(db,"SELECT id FROM notices WHERE user_id='secretaria'"));
 });
 await t.test('Encontro cancelado dispensa relatórios',async()=>{await assert.rejects(run(student,'report',{meeting_id:future.id}),/cancelado/);});
 const original=await one(db,'SELECT * FROM meetings LIMIT 1');const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const pastId=id();await db.query('INSERT INTO meetings(id,class_id,day,preceptor_id,room_id) VALUES($1,$2,$3,$4,$5)',[pastId,original.class_id,localDay(yesterday),'preceptor','sala-1']);await db.query("UPDATE enrollments SET created_at=now()-interval '10 days'");
 const report={meeting_id:pastId,filename:'relatorio.txt',mime:'text/plain',content:Buffer.from('Atividade fictícia supervisionada.').toString('base64')};
 await t.test('Aluno não entrega após prazo e preceptor pode fazer primeira entrega tardia',async()=>{await assert.rejects(run(student,'report',report),/Prazo encerrado/);await run(preceptor,'report',report);await assert.rejects(run(preceptor,'report',report),/Prazo encerrado/);});
 await t.test('Falta registrada dispensa envio do relatório individual',async()=>{await run(prof,'attendance',{meeting_id:pastId,student_id:student.id,status:'ausente'});await assert.rejects(run(student,'report',report),/ausente/);});
 await t.test('Transferência malsucedida preserva matrícula original',async()=>{const tid=id();await db.query("INSERT INTO transfers(id,student_id,from_class,to_class,reason,status) VALUES($1,'aluno','turma-0','turma-1','Teste','encaminhada')",[tid]);await assert.rejects(run(master,'transfer-execute',{ids:[tid]}));assert.ok(await one(db,"SELECT id FROM enrollments WHERE student_id='aluno' AND class_id='turma-0' AND status='ativa'"));assert.equal((await one(db,'SELECT status FROM transfers WHERE id=$1',[tid])).status,'encaminhada');});
 await t.test('Professor encaminha pedido do aluno sem transferir a matrícula e avisa o Master',async()=>{
  const request=await run(student,'transfer',{from_class:'turma-0',to_class:'turma-1',reason:'Mudança de horário'});
  await run(prof,'notice-read',{});
  const pending=(await snapshot(db,prof)).transfers.find(t=>t.id===request.id);
  assert.equal(pending?.status,'solicitada');assert.ok(pending?.from_name);assert.ok(pending?.to_name);
  await assert.rejects(run(master,'transfer-execute',{ids:[request.id]}),/encaminhado/);
  await assert.rejects(run(student,'transfer-forward',{id:request.id}),/permissão/);
  const otherProf={...prof,id:'outro-professor'};
  assert.equal((await snapshot(db,otherProf)).transfers.some(t=>t.id===request.id),false);
  await assert.rejects(run(otherProf,'transfer-forward',{id:request.id}),/outra turma/);
  const before=(await one(db,"SELECT count(*)::int AS n FROM notices WHERE user_id='master'")).n;
  await run(prof,'transfer-forward',{id:request.id});
  assert.equal((await one(db,'SELECT status FROM transfers WHERE id=$1',[request.id])).status,'encaminhada');
  assert.equal((await one(db,"SELECT count(*)::int AS n FROM notices WHERE user_id='master'")).n,before+1);
  assert.ok(await one(db,"SELECT id FROM enrollments WHERE student_id='aluno' AND class_id='turma-0' AND status='ativa'"));
  await assert.rejects(run(prof,'transfer-forward',{id:request.id}),/já encaminhado/);
 });
 await t.test('Troca encadeada entre turmas lotadas confirma todos os destinos atomicamente',async()=>{
  await db.query("UPDATE enrollments SET class_id='turma-0' WHERE student_id='aluno3' AND status='ativa'");
  await db.query("UPDATE availability SET students=2 WHERE id IN (SELECT availability_id FROM classes WHERE id IN ('turma-0','turma-2'))");
  const a=await run(prof,'transfer',{student_id:'aluno2',from_class:'turma-2',to_class:'turma-0',reason:'Troca de horário'});
  const b=await run(prof,'transfer',{student_id:'aluno3',from_class:'turma-0',to_class:'turma-2',reason:'Troca de horário'});
  await assert.rejects(run(master,'transfer-execute',{ids:[a.id]}),/sem vaga/);
  await run(master,'transfer-execute',{ids:[a.id,b.id]});
  assert.ok(await one(db,"SELECT id FROM enrollments WHERE student_id='aluno2' AND class_id='turma-0' AND status='ativa'"));
  assert.ok(await one(db,"SELECT id FROM enrollments WHERE student_id='aluno3' AND class_id='turma-2' AND status='ativa'"));
  assert.equal((await one(db,"SELECT count(*)::int AS n FROM enrollments WHERE status='transferida'")).n,2);
 });
 await t.test('Substituição não reabre cancelamento por outro motivo',async()=>{
  const c=await one(db,'SELECT availability_id FROM classes WHERE id=(SELECT class_id FROM meetings WHERE id=$1)',[future.id]);
  await assert.rejects(run(master,'substitute',{meeting_id:future.id,availability_id:c.availability_id}),/cancelamento/);
 });
 await t.test('Aluno e preceptor enviam relatórios independentes no mesmo encontro',async()=>{
  const m=await one(db,'SELECT * FROM meetings WHERE day=$1 LIMIT 1',[localDay()]);const c=await one(db,'SELECT availability_id FROM classes WHERE id=$1',[m.class_id]);
  await db.query("UPDATE availability SET start_time='00:00' WHERE id=$1",[c.availability_id]);
  const payload={...report,meeting_id:m.id};const a=await run(student,'report',payload);const b=await run(preceptor,'report',payload);assert.notEqual(a.id,b.id);
  assert.equal((await one(db,'SELECT count(*)::int AS n FROM reports WHERE meeting_id=$1',[m.id])).n,2);
  assert.equal(await authorizeFile(db,patient,'reports',a.id),null);assert.ok(await authorizeFile(db,prof,'reports',a.id));
  await run(student,'report',payload);assert.equal((await one(db,'SELECT count(*)::int AS n FROM reports WHERE meeting_id=$1',[m.id])).n,2);
  await db.query("UPDATE availability SET start_time='08:00' WHERE id=$1",[c.availability_id]);
 });
 await t.test('Bloqueio de sala permanece salvo além do cancelamento dos encontros',async()=>{await run(master,'room-block',{room_id:'sala-1',start:localDay(),end:localDay(),reason:'Manutenção'});assert.ok(await one(db,"SELECT id FROM room_blocks WHERE room_id='sala-1'"));});
 }finally{await closeDatabase();}
});
