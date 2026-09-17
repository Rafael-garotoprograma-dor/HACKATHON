import { type DB, type Row, one } from './db';
import { AppError, requireThat, id, text, integer, timeValid, minutes, time, localDay, startInstant, dateValid, hashPassword, cpfValid } from './security';
export type User=Row & {id:string;role:string;name:string;course:string;approved:boolean;permissions:string[];subjects:string[];period:number};
export async function config(db:DB){return (await one(db,'SELECT data FROM settings WHERE id=1')).data;}
export const isStaff=(u:User)=>['master','secretaria'].includes(u.role);
const roles=(u:User,...allowed:string[])=>requireThat(allowed.includes(u.role),'Você não tem permissão para esta ação.',403);
export async function notice(db:DB,userId:string,subject:string,body:string,email=false,dedupe?:string){
 await db.query('INSERT INTO notices(id,user_id,subject,body) VALUES($1,$2,$3,$4)',[id(),userId,subject,body]);
 if(email)await db.query('INSERT INTO outbox(id,user_id,subject,body,dedupe) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe) DO NOTHING',[id(),userId,subject,body,dedupe??null]);
}
async function notifyRole(db:DB,role:string,subject:string,body:string){for(const u of (await db.query('SELECT id FROM users WHERE role=$1 AND active=true',[role])).rows)await notice(db,u.id,subject,body);}
async function audit(db:DB,u:User,action:string,target:string){await db.query('INSERT INTO audit(id,user_id,action,target) VALUES($1,$2,$3,$4)',[id(),u.id,action,target]);}
export async function meetingInfo(db:DB,meetingId:string){const m=await one(db,`SELECT m.*, c.name,c.course,c.periods,c.prerequisites,c.professor_id,c.active AS class_active,c.semester,c.duration,a.start_time,a.end_time,a.students,a.patients,a.weekday,r.active AS room_active,r.students AS room_students,r.patients AS room_patients,r.equipment FROM meetings m JOIN classes c ON c.id=m.class_id JOIN availability a ON a.id=c.availability_id JOIN rooms r ON r.id=m.room_id WHERE m.id=$1`,[meetingId]);requireThat(m,'Encontro não encontrado.',404);return m;}
async function classInfo(db:DB,classId:string){const c=await one(db,`SELECT c.*,a.preceptor_id,a.room_id,a.weekday,a.start_time,a.end_time,a.students,a.patients,r.students AS room_students,r.active AS room_active FROM classes c JOIN availability a ON a.id=c.availability_id JOIN rooms r ON r.id=a.room_id WHERE c.id=$1`,[classId]);requireThat(c,'Turma não encontrada.',404);return c;}
const permits=(u:User,c:Row)=>u.approved&&u.course===c.course&&c.periods.includes(u.period)&&c.prerequisites.every((s:string)=>u.subjects.includes(s));
async function documentsReady(db:DB,u:User){const cfg=await config(db);const docs=(await db.query("SELECT DISTINCT kind FROM documents WHERE student_id=$1 AND status='aprovado'",[u.id])).rows;return cfg.documents.every((kind:string)=>docs.some(d=>d.kind===kind));}
async function ensureEnrollment(db:DB,student:User,classId:string,ignoreClasses:string[]=[]){
 const c=await classInfo(db,classId);const cfg=await config(db);requireThat(!cfg.archived&&c.active&&c.semester===cfg.semester,'Turma ou semestre encerrado.');requireThat(permits(student,c)&&await documentsReady(db,student),'Curso, período, documentos ou disciplinas não permitem esta inscrição.');
 const n=await one(db,"SELECT count(*)::int AS n FROM enrollments WHERE class_id=$1 AND status='ativa'",[classId]);const ml=await one(db,"SELECT min(student_limit) AS n FROM meetings WHERE class_id=$1 AND day>=$2 AND status='aberto'",[classId,localDay()]);requireThat(n.n<Math.min(c.students,c.room_students,ml.n??1000),'Turma sem vaga. Solicite uma transferência e aguarde.');
 const other=(await db.query("SELECT e.class_id,a.weekday,a.start_time,a.end_time,c.start_date,c.end_date FROM enrollments e JOIN classes c ON c.id=e.class_id JOIN availability a ON a.id=c.availability_id WHERE e.student_id=$1 AND e.status='ativa'",[student.id])).rows;
 requireThat(!other.some(x=>!ignoreClasses.includes(x.class_id)&&x.weekday===c.weekday&&x.start_time<c.end_time&&x.end_time>c.start_time&&x.start_date<=c.end_date&&x.end_date>=c.start_date),'Você já está inscrito em uma turma neste horário.');return c;
}
async function cancelMeeting(db:DB,m:Row,reason:string){
 requireThat(m.day>=localDay(),'Encontros passados não podem ser cancelados.');
 await db.query("UPDATE meetings SET status='cancelado',reason=$2 WHERE id=$1",[m.id,reason]);
 const bookings=(await db.query("UPDATE bookings SET status='cancelado_instituicao',reason=$2 WHERE meeting_id=$1 AND status IN ('agendado','confirmado') RETURNING *",[m.id,reason])).rows;
 for(const b of bookings)await notice(db,b.owner_id,'Consulta cancelada pela clínica',`Atendimento de ${m.day}, ${b.slot}: ${reason}. A Secretaria ajudará no reagendamento.`,true);
 for(const e of (await db.query("SELECT student_id FROM enrollments WHERE class_id=$1 AND status='ativa'",[m.class_id])).rows)await notice(db,e.student_id,'Encontro cancelado',`${m.day}: ${reason}. Não é necessário enviar relatório.`);
 await notifyRole(db,'secretaria','Reagendamento prioritário',`Encontro ${m.day} cancelado: ${reason}. ${bookings.length} consulta(s) precisam de contato e reagendamento.`);
}
function fileData(p:Row){
 const name=text(p.filename,160),mime=text(p.mime,80);requireThat(['application/pdf','image/png','image/jpeg','text/plain'].includes(mime),'Envie PDF, PNG, JPG ou TXT.');
 requireThat(typeof p.content==='string'&&p.content.length<=7_000_000,'Arquivo maior que 5 MB.');const content=Buffer.from(p.content,'base64');requireThat(name&&content.length>0&&content.length<=5*1024*1024,'Arquivo vazio ou maior que 5 MB.');
 if(mime==='application/pdf')requireThat(content.subarray(0,5).toString()==='%PDF-','Conteúdo não corresponde a PDF.');
 if(mime==='image/png')requireThat(content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Conteúdo não corresponde a PNG.');
 if(mime==='image/jpeg')requireThat(content[0]===255&&content[1]===216,'Conteúdo não corresponde a JPG.');
 return {name,mime,content};
}
export async function availableSlots(db:DB,m:Row){
 const cfg=await config(db);if(cfg.archived||m.semester!==cfg.semester||m.status!=='aberto'||!m.class_active||!m.room_active||m.day<localDay())return [];
 if(await one(db,'SELECT id FROM room_blocks WHERE room_id=$1 AND start_day<=$2 AND end_day>=$2',[m.room_id,m.day]))return [];
 if(await one(db,'SELECT id FROM absences WHERE user_id=$1 AND start_day<=$2 AND end_day>=$2',[m.preceptor_id,m.day]))return [];
 if(!cfg.weekdays.includes(m.weekday)||m.start_time<cfg.open||m.end_time>cfg.close)return [];
 if(!await one(db,'SELECT id FROM users WHERE id=$1 AND active=true',[m.preceptor_id]))return [];
 const students=(await db.query("SELECT u.* FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.class_id=$1 AND e.status='ativa' AND u.active=true AND u.approved=true AND NOT EXISTS(SELECT 1 FROM attendance at WHERE at.student_id=u.id AND at.meeting_id=$2 AND at.status='ausente')",[m.class_id,m.id])).rows;
 let eligible=0;for(const s of students)if(permits(s as User,m)&&await documentsReady(db,s as User))eligible++;
 if(!eligible||students.length>Math.min(m.student_limit??m.students,m.room_students))return [];
 const bookings=(await db.query("SELECT slot,count(*)::int AS n FROM bookings WHERE meeting_id=$1 AND status IN ('agendado','confirmado','realizado') GROUP BY slot",[m.id])).rows;
 const capacity=Math.min(m.patient_limit??m.patients,m.room_patients,m.equipment,cfg.clinicPatients);
 const concurrent=(await db.query("SELECT b.slot,c.duration,m.room_id FROM bookings b JOIN meetings m ON m.id=b.meeting_id JOIN classes c ON c.id=m.class_id WHERE m.day=$1 AND b.status IN ('agendado','confirmado','realizado')",[m.day])).rows;
 const slots=[];for(let n=minutes(m.start_time);n+m.duration<=minutes(m.end_time);n+=m.duration){const slot=time(n);if(startInstant(m.day,slot)<=new Date())continue;const used=bookings.find(b=>b.slot===slot)?.n??0;const overlap=concurrent.filter(b=>minutes(b.slot)<n+m.duration&&minutes(b.slot)+b.duration>n);const roomUsed=overlap.filter(b=>b.room_id===m.room_id).length;const remaining=Math.min(capacity-used,cfg.clinicPatients-overlap.length,m.room_patients-roomUsed,m.equipment-roomUsed);if(remaining>0)slots.push({time:slot,remaining});}return slots;
}

export async function mutate(db:DB,u:User,action:string,p:Row){
 const cfg=await config(db);let target=text(p.id)||id();
 if(['enroll','booking','availability','class','document','review-document','transfer-execute','report'].includes(action))requireThat(!cfg.archived,'O semestre está arquivado. Abra um novo semestre nas configurações.');
 switch(action){
 case 'settings': {
  roles(u,'master');const data=p.data;requireThat(data&&typeof data==='object','Configuração inválida.');requireThat(dateValid(data.start)&&dateValid(data.end)&&data.start<=data.end&&dateValid(data.enrollmentEnd),'Datas inválidas.');requireThat(timeValid(data.open)&&timeValid(data.close)&&data.open<data.close&&timeValid(data.reportDeadline),'Horários inválidos.');
  const courses=(data.courses||[]).map((s:unknown)=>text(s)).filter(Boolean);requireThat(courses.length>0,'Cadastre ao menos um curso.');const weekdays=(data.weekdays||[]).map((v:unknown)=>integer(v,0,6));requireThat(weekdays.length>0,'Selecione os dias de funcionamento.');
  const clean={semester:text(data.semester),start:data.start,end:data.end,enrollmentEnd:data.enrollmentEnd,open:data.open,close:data.close,weekdays,courses,documents:(data.documents||[]).map((s:unknown)=>text(s)).filter(Boolean),reportDeadline:data.reportDeadline,cancelHours:integer(data.cancelHours,0,168),clinicStudents:integer(data.clinicStudents),clinicPatients:integer(data.clinicPatients),archived:!!data.archived};requireThat(clean.semester&&clean.documents.length,'Informe semestre e documentos obrigatórios.');
  await db.query('UPDATE settings SET data=$1 WHERE id=1',[JSON.stringify(clean)]);break;
 }
 case 'room':{
  roles(u,'master');requireThat(p.name&&p.clinic&&cfg.courses.includes(p.area),'Informe sala, clínica e área válida.');
  await db.query('INSERT INTO rooms VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,clinic=EXCLUDED.clinic,area=EXCLUDED.area,students=EXCLUDED.students,patients=EXCLUDED.patients,equipment=EXCLUDED.equipment,active=EXCLUDED.active',[target,text(p.name),text(p.clinic),text(p.area),integer(p.students),integer(p.patients),integer(p.equipment),p.active!==false]);break;
 }
 case 'user':{
  roles(u,'master','secretaria');if(u.role==='secretaria')requireThat(!p.id&&p.role==='paciente','A Secretaria pode cadastrar novos pacientes; administração de acessos é exclusiva do Master.',403);const existing=p.id?await one(db,'SELECT * FROM users WHERE id=$1',[p.id]):null;
  requireThat(['master','secretaria','professor','preceptor','aluno','paciente'].includes(p.role),'Perfil inválido.');requireThat(p.name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email),'Nome e e-mail são obrigatórios.');const cpf=text(p.cpf).replace(/\D/g,'');requireThat(cpfValid(cpf),'CPF inválido.');
  if(existing?.id===u.id)requireThat(p.active!==false&&p.role==='master','Não é permitido desativar ou remover seu próprio acesso Master.');
  const pw=text(p.password);if(!existing)requireThat(pw.length>=10,'Senha deve ter pelo menos 10 caracteres.');if(pw)requireThat(pw.length>=10,'Senha deve ter pelo menos 10 caracteres.');
  const perms=(p.permissions||[]).filter((v:string)=>cfg.courses.includes(v));
  await db.query(`INSERT INTO users(id,name,email,cpf,password,role,course,period,registration,phone,birth,sex,permissions,subjects,active,approved) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,cpf=EXCLUDED.cpf,password=EXCLUDED.password,role=EXCLUDED.role,course=EXCLUDED.course,period=EXCLUDED.period,registration=EXCLUDED.registration,phone=EXCLUDED.phone,birth=EXCLUDED.birth,sex=EXCLUDED.sex,permissions=EXCLUDED.permissions,subjects=EXCLUDED.subjects,active=EXCLUDED.active,approved=EXCLUDED.approved`,[target,text(p.name),text(p.email).toLowerCase(),cpf,pw?hashPassword(pw):existing!.password,p.role,text(p.course),integer(p.period||1,1,20),text(p.registration),text(p.phone),text(p.birth),text(p.sex),JSON.stringify(perms),JSON.stringify(p.subjects||[]),p.active!==false,existing?.approved??false]);
  if(existing&&(existing.course!==p.course||existing.period!==Number(p.period)))await db.query('UPDATE users SET approved=false WHERE id=$1',[target]);
  if(existing&&(pw||p.active===false||p.role!==existing.role))await db.query('DELETE FROM sessions WHERE user_id=$1',[target]);
  if(existing&&(p.active===false||p.role!==existing.role)){
   if(existing.role==='professor'){await db.query('UPDATE classes SET professor_id=NULL WHERE professor_id=$1',[target]);await notifyRole(db,'master','Turmas sem avaliador',`Revise as turmas de ${existing.name}.`);}
   if(existing.role==='preceptor')for(const row of (await db.query("SELECT id FROM meetings WHERE preceptor_id=$1 AND day>=$2 AND status='aberto'",[target,localDay()])).rows)await cancelMeeting(db,await meetingInfo(db,row.id),'Sem preceptor');
  }break;
 }
 case 'profile':{
  const course=u.role==='aluno'?text(p.course):u.course;const period=u.role==='aluno'?integer(p.period,1,20):u.period;requireThat(u.role!=='aluno'||cfg.courses.includes(course),'Curso inválido.');
  await db.query('UPDATE users SET name=$2,phone=$3,course=$4,period=$5,registration=$6,subjects=$7,approved=$8 WHERE id=$1',[u.id,text(p.name)||u.name,text(p.phone),course,period,text(p.registration),JSON.stringify(p.subjects||u.subjects),u.role==='aluno'?false:u.approved]);break;
 }
 case 'availability':{
  roles(u,'preceptor','master');const preceptor=u.role==='master'?await one(db,"SELECT * FROM users WHERE id=$1 AND role='preceptor' AND active=true",[p.preceptor_id]):u;requireThat(preceptor,'Preceptor inválido.');const r=await one(db,'SELECT * FROM rooms WHERE id=$1',[p.room_id]);requireThat(r?.active,'Sala indisponível.');requireThat(preceptor.permissions.includes(r.area)||preceptor.course===r.area,'Sala fora da área de supervisão.');const start=text(p.start_time),end=text(p.end_time),weekday=integer(p.weekday,0,6);requireThat(timeValid(start)&&timeValid(end)&&start<end&&start>=cfg.open&&end<=cfg.close&&cfg.weekdays.includes(weekday),'Horário fora do funcionamento da clínica.');
  if(p.id){const previous=await one(db,'SELECT * FROM availability WHERE id=$1',[p.id]);requireThat(previous&&(u.role==='master'||previous.preceptor_id===u.id),'Disponibilidade de outro preceptor.',403);if(await one(db,'SELECT id FROM classes WHERE availability_id=$1',[p.id]))requireThat(previous.room_id===r.id&&previous.weekday===weekday&&previous.start_time===start&&previous.end_time===end&&previous.preceptor_id===preceptor.id,'Horário já utilizado por uma turma. Crie outra disponibilidade e ajuste os encontros individualmente para preservar o histórico.');}
  await db.query('INSERT INTO availability VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET preceptor_id=EXCLUDED.preceptor_id,room_id=EXCLUDED.room_id,weekday=EXCLUDED.weekday,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,students=EXCLUDED.students,patients=EXCLUDED.patients',[target,preceptor.id,r.id,weekday,start,end,integer(p.students,1,r.students),integer(p.patients,1,Math.min(r.patients,r.equipment))]);break;
 }
 case 'class-rules':{
  roles(u,'master','professor');const c=await classInfo(db,p.id);requireThat(u.role==='master'||c.professor_id===u.id,'Turma de outro professor.',403);const periods=(p.periods||[]).map((v:unknown)=>integer(v,1,20));requireThat(periods.length&&text(p.name),'Informe nome e períodos.');const duration=integer(p.duration,10,480);requireThat(duration<=minutes(c.end_time)-minutes(c.start_time),'Duração maior que o encontro.');if(duration!==c.duration)requireThat(!await one(db,"SELECT b.id FROM bookings b JOIN meetings m ON m.id=b.meeting_id WHERE m.class_id=$1",[c.id]),'Há consultas no histórico desta turma. Crie outra turma para usar uma duração diferente.');await db.query('UPDATE classes SET name=$2,periods=$3,prerequisites=$4,duration=$5 WHERE id=$1',[c.id,text(p.name),JSON.stringify(periods),JSON.stringify(p.prerequisites||[]),duration]);break;
 }
 case 'class':{
  roles(u,'professor');const a=await one(db,'SELECT a.*,r.area,r.active FROM availability a JOIN rooms r ON r.id=a.room_id WHERE a.id=$1',[p.availability_id]);requireThat(a?.active,'Disponibilidade inválida.');requireThat(u.permissions.includes(p.course)&&a.area===p.course,'Professor ou sala não habilitado para esse curso.');
  requireThat(await one(db,"SELECT id FROM users WHERE id=$1 AND role='preceptor' AND active=true",[a.preceptor_id]),'Preceptor indisponível.');requireThat(cfg.weekdays.includes(a.weekday)&&a.start_time>=cfg.open&&a.end_time<=cfg.close,'Disponibilidade fora do funcionamento atual.');
  const start=text(p.start_date),end=text(p.end_date);requireThat(dateValid(start)&&dateValid(end)&&start<=end&&start>=cfg.start&&end<=cfg.end,'Datas fora do semestre.');const periods=(p.periods||[]).map((v:unknown)=>integer(v,1,20));requireThat(periods.length&&p.name,'Informe nome e períodos permitidos.');const duration=integer(p.duration,10,480);requireThat(duration<=minutes(a.end_time)-minutes(a.start_time),'Duração maior que o encontro.');
  const others=(await db.query(`SELECT c.*,av.* FROM classes c JOIN availability av ON av.id=c.availability_id WHERE c.active=true AND c.semester=$1 AND c.start_date<=$2 AND c.end_date>=$3 AND av.weekday=$4 AND av.start_time<$5 AND av.end_time>$6`,[cfg.semester,end,start,a.weekday,a.end_time,a.start_time])).rows;
  requireThat(!others.some(o=>o.preceptor_id===a.preceptor_id||o.room_id===a.room_id||o.professor_id===u.id),'Conflito: sala, professor ou preceptor já alocado nesse horário.');
  requireThat(!await one(db,"SELECT m.id FROM meetings m JOIN classes c ON c.id=m.class_id JOIN availability av ON av.id=c.availability_id WHERE m.status='aberto' AND m.day BETWEEN $1 AND $2 AND av.weekday=$3 AND av.start_time<$4 AND av.end_time>$5 AND (m.preceptor_id=$6 OR m.room_id=$7)",[start,end,a.weekday,a.end_time,a.start_time,a.preceptor_id,a.room_id]),'Conflito com encontro ou substituição já confirmada.');
  requireThat(others.reduce((s,o)=>s+o.students,0)+a.students<=cfg.clinicStudents,'Capacidade simultânea de alunos da clínica excedida.');requireThat(others.reduce((s,o)=>s+o.patients,0)+a.patients<=cfg.clinicPatients,'Capacidade simultânea de pacientes da clínica excedida.');
  await db.query('INSERT INTO classes VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)',[target,text(p.name),text(p.course),JSON.stringify(periods),JSON.stringify((p.prerequisites||[]).map((s:unknown)=>text(s))),u.id,a.id,start,end,duration,cfg.semester]);
  let count=0;for(let d=new Date(start+'T12:00:00Z');d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1)){if(d.getUTCDay()===a.weekday){const day=d.toISOString().slice(0,10);requireThat(!await one(db,'SELECT id FROM room_blocks WHERE room_id=$1 AND start_day<=$2 AND end_day>=$2',[a.room_id,day]),'Sala bloqueada em um dos encontros.');requireThat(!await one(db,'SELECT id FROM absences WHERE user_id=$1 AND start_day<=$2 AND end_day>=$2',[a.preceptor_id,day]),'Preceptor ausente em um dos encontros.');count++;await db.query('INSERT INTO meetings(id,class_id,day,preceptor_id,room_id) VALUES($1,$2,$3,$4,$5)',[id(),target,d.toISOString().slice(0,10),a.preceptor_id,a.room_id]);}}requireThat(count,'O intervalo não contém nenhum encontro nesse dia da semana.');break;
 }
 case 'document':{
  roles(u,'aluno');requireThat(localDay()<=cfg.enrollmentEnd,'Prazo de inscrição encerrado.');requireThat(cfg.documents.includes(p.kind),'Tipo de documento inválido.');const f=fileData(p);
  await db.query("UPDATE documents SET status='substituido' WHERE student_id=$1 AND kind=$2",[u.id,p.kind]);await db.query('INSERT INTO documents(id,student_id,kind,filename,mime,content) VALUES($1,$2,$3,$4,$5,$6)',[target,u.id,p.kind,f.name,f.mime,f.content]);await db.query('UPDATE users SET approved=false WHERE id=$1',[u.id]);break;
 }
 case 'review-document':{
  roles(u,'professor','master');const d=await one(db,'SELECT d.*,u.course FROM documents d JOIN users u ON u.id=d.student_id WHERE d.id=$1',[p.id]);requireThat(d,'Documento não encontrado.');requireThat(u.role==='master'||u.permissions.includes(d.course),'Você não valida este curso.',403);requireThat(['aprovado','recusado','correcao'].includes(p.status),'Status inválido.');requireThat(p.status==='aprovado'||text(p.comment),'Explique o que precisa ser corrigido.');requireThat(d.status!=='substituido','Analise o documento mais recente.');
  await db.query('UPDATE documents SET status=$2,comment=$3,reviewer_id=$4 WHERE id=$1',[p.id,p.status,text(p.comment,2000),u.id]);const student=await one(db,'SELECT * FROM users WHERE id=$1',[d.student_id]);
  await db.query('UPDATE users SET approved=$2 WHERE id=$1',[d.student_id,await documentsReady(db,student as User)]);await notice(db,d.student_id,'Análise documental',`${d.kind}: ${p.status}. ${text(p.comment,2000)}`);break;
 }
 case 'enroll':{
  roles(u,'aluno');requireThat(localDay()<=cfg.enrollmentEnd,'Inscrições encerradas. Solicite transferência ao professor.');await ensureEnrollment(db,u,p.class_id);await db.query('INSERT INTO enrollments(id,class_id,student_id) VALUES($1,$2,$3)',[target,p.class_id,u.id]);break;
 }
 case 'booking':{
  roles(u,'paciente','secretaria','master');const ownerId=u.role==='paciente'?u.id:text(p.owner_id);const owner=await one(db,"SELECT * FROM users WHERE id=$1 AND role='paciente' AND active=true",[ownerId]);requireThat(owner,'Selecione um paciente cadastrado.');const m=await meetingInfo(db,p.meeting_id);const slots=await availableSlots(db,m);requireThat(slots.some(s=>s.time===p.slot),'Esta vaga não está mais disponível. Atualize a agenda.');
  const patient=p.patient?.type==='proprio'?{type:'proprio',name:owner.name,cpf:owner.cpf}:p.patient;requireThat(patient&&text(patient.name)&&cpfValid(text(patient.cpf).replace(/\D/g,'')),'Nome e CPF da pessoa atendida são obrigatórios.');requireThat(['proprio','menor','idoso'].includes(patient.type),'Tipo de atendimento inválido.');if(patient.type!=='proprio')requireThat(text(patient.relationship),'Informe o parentesco.');if(patient.type==='idoso')requireThat(text(patient.limitation),'Informe a necessidade de acompanhamento.');
  const clean={type:patient.type,name:text(patient.name),cpf:text(patient.cpf).replace(/\D/g,''),relationship:text(patient.relationship),limitation:text(patient.limitation,500)};
  const existing=(await db.query("SELECT b.*,c.duration FROM bookings b JOIN meetings m ON m.id=b.meeting_id JOIN classes c ON c.id=m.class_id WHERE m.day=$1 AND b.status IN ('agendado','confirmado') AND (b.owner_id=$2 OR b.patient->>'cpf'=$3)",[m.day,ownerId,clean.cpf])).rows;
  requireThat(!existing.some(b=>minutes(b.slot)<minutes(p.slot)+m.duration&&minutes(b.slot)+b.duration>minutes(p.slot)),'Paciente ou responsável já possui atendimento nesse horário.');
  await db.query('INSERT INTO bookings(id,meeting_id,owner_id,patient,slot) VALUES($1,$2,$3,$4,$5)',[target,m.id,ownerId,JSON.stringify(clean),p.slot]);await notice(db,ownerId,'Consulta agendada',`${m.name}: ${m.day} às ${p.slot}.`,true);break;
 }
 case 'booking-status':{
  const b=await one(db,'SELECT * FROM bookings WHERE id=$1',[p.id]);requireThat(b,'Consulta não encontrada.');requireThat(isStaff(u)||b.owner_id===u.id,'Consulta de outro paciente.',403);requireThat(['confirmado','cancelado_paciente','reagendado','nao_compareceu'].includes(p.status),'Status inválido.');const m=await meetingInfo(db,b.meeting_id);
  if(p.status==='reagendado'){roles(u,'secretaria','master');requireThat(b.status==='cancelado_instituicao','Consulta não aguardava reagendamento.');}
  else {requireThat(['agendado','confirmado'].includes(b.status),'Consulta já encerrada.');if(p.status==='nao_compareceu'){roles(u,'secretaria','master');requireThat(startInstant(m.day,b.slot)<new Date(),'Atendimento ainda não ocorreu.');}else requireThat(startInstant(m.day,b.slot)>new Date(),'Horário da consulta já passou.');}
  if(p.status==='cancelado_paciente'&&!isStaff(u))requireThat((startInstant(m.day,b.slot).getTime()-Date.now())/3600000>=cfg.cancelHours||(p.decline===true&&b.status==='agendado'&&(startInstant(m.day,b.slot).getTime()-Date.now())/3600000<=24),'Prazo de cancelamento online encerrado. Procure a Secretaria.');
  await db.query('UPDATE bookings SET status=$2,reason=$3 WHERE id=$1',[p.id,p.status,text(p.reason,1000)]);if(p.status==='cancelado_paciente')await notifyRole(db,'secretaria','Paciente cancelou ou recusou confirmação',`Consulta ${m.day}, ${b.slot}, paciente ${b.patient.name}.`);break;
 }
 case 'cancel-meeting':{
  roles(u,'professor','master');const m=await meetingInfo(db,p.meeting_id);requireThat(u.role==='master'||m.professor_id===u.id,'Turma de outro professor.',403);requireThat(text(p.reason),'Informe o motivo.');await cancelMeeting(db,m,text(p.reason,1000));break;
 }
 case 'room-block':{
  roles(u,'secretaria','master');requireThat(dateValid(p.start)&&dateValid(p.end)&&p.start<=p.end&&text(p.reason),'Informe período e motivo.');
  await db.query('INSERT INTO room_blocks VALUES($1,$2,$3,$4,$5)',[id(),p.room_id,p.start,p.end,text(p.reason)]);
  for(const row of (await db.query("SELECT id FROM meetings WHERE room_id=$1 AND day BETWEEN $2 AND $3 AND day>=$4 AND status='aberto'",[p.room_id,p.start,p.end,localDay()])).rows)await cancelMeeting(db,await meetingInfo(db,row.id),`Sala indisponível: ${text(p.reason)}`);break;
 }
 case 'preceptor-absence':{
  roles(u,'master');requireThat(dateValid(p.start)&&dateValid(p.end)&&p.start<=p.end,'Período inválido.');await db.query('INSERT INTO absences VALUES($1,$2,$3,$4)',[id(),p.preceptor_id,p.start,p.end]);for(const row of (await db.query("SELECT id FROM meetings WHERE preceptor_id=$1 AND day BETWEEN $2 AND $3 AND day>=$4 AND status='aberto'",[p.preceptor_id,p.start,p.end,localDay()])).rows)await cancelMeeting(db,await meetingInfo(db,row.id),'Sem preceptor');await notifyRole(db,'master','Substituição de preceptor pendente',`${p.start} até ${p.end}: encontros cancelados até substituição.`);break;
 }
 case 'substitute':{
  const candidate=await meetingInfo(db,p.meeting_id);roles(u,'master');requireThat(candidate.room_active,'Sala indisponível.');requireThat(candidate.status==='aberto'||candidate.reason==='Sem preceptor','Este cancelamento não pode ser resolvido apenas substituindo o preceptor.');requireThat(!await one(db,'SELECT id FROM room_blocks WHERE room_id=$1 AND start_day<=$2 AND end_day>=$2',[candidate.room_id,candidate.day]),'Sala bloqueada neste período.');
  roles(u,'master');const m=await meetingInfo(db,p.meeting_id);requireThat(startInstant(m.day,m.start_time)>new Date(),'Encontros passados permanecem cancelados.');const a=await one(db,'SELECT a.*,u.permissions,u.course,u.active FROM availability a JOIN users u ON u.id=a.preceptor_id WHERE a.id=$1',[p.availability_id]);requireThat(a?.active&&a.room_id===m.room_id&&a.weekday===m.weekday&&a.start_time<=m.start_time&&a.end_time>=m.end_time&&(a.course===m.course||a.permissions.includes(m.course)),'Substituto incompatível com curso, sala ou horário.');
  const n=await one(db,"SELECT count(*)::int AS n FROM enrollments WHERE class_id=$1 AND status='ativa'",[m.class_id]);requireThat(n.n<=a.students,'Substituto não comporta a turma; ajuste a supervisão sem remover alunos.');
  requireThat(!await one(db,'SELECT id FROM absences WHERE user_id=$1 AND start_day<=$2 AND end_day>=$2',[a.preceptor_id,m.day]),'Substituto ausente neste período.');const busy=await one(db,"SELECT m.id FROM meetings m JOIN classes c ON c.id=m.class_id JOIN availability a ON a.id=c.availability_id WHERE m.preceptor_id=$1 AND m.day=$2 AND m.id<>$3 AND m.status='aberto' AND a.start_time<$4 AND a.end_time>$5",[a.preceptor_id,m.day,m.id,m.end_time,m.start_time]);requireThat(!busy,'Substituto já alocado nesse horário.');await db.query("UPDATE meetings SET preceptor_id=$2,student_limit=$3,patient_limit=$4,status='aberto',reason='' WHERE id=$1",[m.id,a.preceptor_id,a.students,a.patients]);break;
 }
 case 'professor-change':{
  roles(u,'master');const c=await classInfo(db,p.class_id);const prof=p.professor_id?await one(db,"SELECT * FROM users WHERE id=$1 AND role='professor' AND active=true",[p.professor_id]):null;requireThat(!p.professor_id||prof?.permissions.includes(c.course),'Professor não habilitado para o curso.');await db.query('UPDATE classes SET professor_id=$2 WHERE id=$1',[c.id,prof?.id??null]);if(!prof)await notifyRole(db,'master','Turma sem avaliador',c.name);break;
 }
 case 'professor-absence':{
  roles(u,'professor');const m=await meetingInfo(db,p.meeting_id);requireThat(m.professor_id===u.id,'Turma de outro professor.',403);for(const e of (await db.query("SELECT student_id FROM enrollments WHERE class_id=$1 AND status='ativa'",[m.class_id])).rows)await notice(db,e.student_id,'Ausência pontual do professor',`${m.day}: encontro mantido com supervisão do preceptor. ${text(p.reason)}`);break;
 }
 case 'transfer':{
  roles(u,'aluno','professor');const studentId=u.role==='aluno'?u.id:p.student_id;const e=await one(db,"SELECT e.*,c.professor_id FROM enrollments e JOIN classes c ON c.id=e.class_id WHERE e.student_id=$1 AND e.class_id=$2 AND e.status='ativa'",[studentId,p.from_class]);requireThat(e&&(u.role==='aluno'||e.professor_id===u.id),'Vínculo inválido.',403);const dest=await classInfo(db,p.to_class);const student=await one(db,'SELECT * FROM users WHERE id=$1',[studentId]);requireThat(p.from_class!==p.to_class&&permits(student as User,dest),'Destino incompatível.');await db.query('INSERT INTO transfers(id,student_id,from_class,to_class,reason,status) VALUES($1,$2,$3,$4,$5,$6)',[target,studentId,p.from_class,p.to_class,text(p.reason,1000),u.role==='professor'?'encaminhada':'solicitada']);if(u.role==='aluno'&&e.professor_id)await notice(db,e.professor_id,'Solicitação de transferência',student.name);else await notifyRole(db,'master','Transferência encaminhada',student.name);break;
 }
 case 'transfer-forward':{
  roles(u,'professor');const t=await one(db,'SELECT t.*,c.professor_id FROM transfers t JOIN classes c ON c.id=t.from_class WHERE t.id=$1',[p.id]);requireThat(t?.professor_id===u.id,'Solicitação de outra turma.',403);requireThat(t.status==='solicitada','Pedido já encaminhado.');await db.query("UPDATE transfers SET status='encaminhada' WHERE id=$1",[p.id]);await notifyRole(db,'master','Transferência para análise','Há um pedido encaminhado pelo professor.');break;
 }
 case 'transfer-execute':{
  roles(u,'master');const ids=Array.isArray(p.ids)?p.ids:[p.id];requireThat(ids.length>0&&ids.length<=30,'Selecione pedidos.');const requests=[];const students=new Set();
  for(const tid of ids){const t=await one(db,'SELECT * FROM transfers WHERE id=$1',[tid]);requireThat(t&&['encaminhada','espera'].includes(t.status),'Pedido precisa ser encaminhado pelo professor.');requireThat(!students.has(t.student_id),'Selecione apenas um pedido por aluno.');students.add(t.student_id);const updated=await db.query("UPDATE enrollments SET status='transferida',ended_at=now() WHERE class_id=$1 AND student_id=$2 AND status='ativa' RETURNING id",[t.from_class,t.student_id]);requireThat(updated.rows.length,'Aluno não está mais na origem.');requests.push(t);}
  // All removals and destinations are inside one transaction; any failure rolls everything back.
  for(const t of requests){const s=await one(db,'SELECT * FROM users WHERE id=$1',[t.student_id]);await ensureEnrollment(db,s as User,t.to_class);await db.query('INSERT INTO enrollments(id,class_id,student_id) VALUES($1,$2,$3)',[id(),t.to_class,t.student_id]);await db.query("UPDATE transfers SET status='concluida' WHERE id=$1",[t.id]);await notice(db,t.student_id,'Transferência concluída','Sua turma foi atualizada pelo Master.');}break;
 }
 case 'withdraw':roles(u,'master');await db.query("UPDATE enrollments SET status='desistencia',ended_at=now() WHERE id=$1",[p.id]);break;
 case 'report':{
  roles(u,'aluno','preceptor');const m=await meetingInfo(db,p.meeting_id);requireThat(m.status!=='cancelado','Encontro cancelado não exige relatório.');requireThat(m.day<=localDay(),'O encontro ainda não ocorreu.');
  requireThat(startInstant(m.day,m.start_time)<=new Date(),'O encontro ainda não começou.');
  if(u.role==='aluno'){const e=await one(db,"SELECT id FROM enrollments WHERE class_id=$1 AND student_id=$2 AND created_at::date<=$3::date AND (ended_at IS NULL OR ended_at::date>=$3::date)",[m.class_id,u.id,m.day]);requireThat(e,'Aluno não participou desta turma.',403);const at=await one(db,'SELECT status FROM attendance WHERE meeting_id=$1 AND student_id=$2',[m.id,u.id]);requireThat(at?.status!=='ausente','Aluno ausente não entrega relatório.');}else requireThat(m.preceptor_id===u.id,'Somente o preceptor responsável pelo encontro pode entregar.',403);
  const late=Date.now()>startInstant(m.day,cfg.reportDeadline).getTime()+59999;const previous=await one(db,'SELECT id FROM reports WHERE meeting_id=$1 AND author_id=$2',[m.id,u.id]);requireThat(!late||(u.role==='preceptor'&&!previous),'Prazo encerrado. Alterações não são permitidas.');const f=fileData(p);
  const attended=Array.isArray(p.attended)?p.attended:[];for(const bid of attended)requireThat(await one(db,"SELECT id FROM bookings WHERE id=$1 AND meeting_id=$2 AND status IN ('agendado','confirmado','realizado')",[bid,m.id]),'Atendimento informado não pertence a este encontro.');const absent=u.role==='preceptor'&&Array.isArray(p.absent)?p.absent:[];for(const sid of absent)requireThat(await one(db,'SELECT id FROM enrollments WHERE student_id=$1 AND class_id=$2',[sid,m.class_id]),'Ausência informada para aluno de outra turma.');
  await db.query('INSERT INTO reports(id,meeting_id,author_id,filename,mime,content,late,attendance,attended_bookings) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(meeting_id,author_id) DO UPDATE SET filename=EXCLUDED.filename,mime=EXCLUDED.mime,content=EXCLUDED.content,attendance=EXCLUDED.attendance,attended_bookings=EXCLUDED.attended_bookings,created_at=now(),comment=\'\'',[target,m.id,u.id,f.name,f.mime,f.content,late,JSON.stringify(absent),JSON.stringify(attended)]);if(u.role==='preceptor')for(const bid of attended)await db.query("UPDATE bookings SET status='realizado' WHERE id=$1",[bid]);break;
 }
 case 'report-comment':{
  roles(u,'professor');const r=await one(db,'SELECT r.*,c.professor_id FROM reports r JOIN meetings m ON m.id=r.meeting_id JOIN classes c ON c.id=m.class_id WHERE r.id=$1',[p.id]);requireThat(r?.professor_id===u.id,'Relatório de outra turma.',403);await db.query('UPDATE reports SET comment=$2 WHERE id=$1',[p.id,text(p.comment,3000)]);await notice(db,r.author_id,'Comentário no relatório',text(p.comment,3000));break;
 }
 case 'attendance':{
  roles(u,'professor');const m=await meetingInfo(db,p.meeting_id);requireThat(startInstant(m.day,m.start_time)<=new Date(),'O encontro ainda não começou.');requireThat(m.professor_id===u.id&&m.status!=='cancelado','Encontro inválido para registro.',403);requireThat(await one(db,'SELECT id FROM enrollments WHERE class_id=$1 AND student_id=$2',[m.class_id,p.student_id]),'Aluno fora da turma.');requireThat(['presente','ausente'].includes(p.status),'Situação inválida.');await db.query('INSERT INTO attendance VALUES($1,$2,$3,$4) ON CONFLICT(meeting_id,student_id) DO UPDATE SET status=EXCLUDED.status,confirmed_by=EXCLUDED.confirmed_by',[m.id,p.student_id,p.status,u.id]);break;
 }
 case 'issue':{
  roles(u,'preceptor');requireThat(text(p.subject)&&text(p.body),'Informe assunto e descrição.');await db.query('INSERT INTO issues(id,author_id,room_id,subject,body) VALUES($1,$2,$3,$4,$5)',[target,u.id,p.room_id||null,text(p.subject),text(p.body,3000)]);await notifyRole(db,'master','Aviso do preceptor',text(p.subject));break;
 }
 case 'issue-status':roles(u,'master');requireThat(['aberto','em_atendimento','resolvido'].includes(p.status),'Status inválido.');await db.query('UPDATE issues SET status=$2 WHERE id=$1',[p.id,p.status]);break;
 case 'message':{
  requireThat(text(p.subject)&&text(p.body),'Preencha assunto e mensagem.');const recipient=await one(db,'SELECT id,role FROM users WHERE id=$1 AND active=true',[p.recipient_id]);requireThat(recipient&&recipient.id!==u.id,'Destinatário inválido.');requireThat(u.role!=='paciente'||recipient.role==='secretaria','Pacientes devem contatar a Secretaria.',403);requireThat(recipient.role!=='paciente'||['secretaria','master'].includes(u.role),'Somente Secretaria e Master contatam pacientes.',403);await db.query('INSERT INTO messages(id,sender_id,recipient_id,subject,body) VALUES($1,$2,$3,$4,$5)',[target,u.id,recipient.id,text(p.subject),text(p.body,5000)]);await notice(db,recipient.id,'Nova mensagem',text(p.subject));break;
 }
 case 'notice-read':await db.query('UPDATE notices SET seen=true WHERE user_id=$1',[u.id]);break;
 default:throw new AppError('Ação desconhecida.');
 }
 await audit(db,u,action,target);return {ok:true,id:target};
}

