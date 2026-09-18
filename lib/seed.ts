import { transaction, one } from './db';
import { id, hashPassword, localDay } from './security';
import { demoPeople } from './demo-people';
let ready:Promise<void>|undefined;
export function initialize(){return ready??=transaction(async db=>{
 const today=localDay();const end=new Date();end.setDate(end.getDate()+90);
 await db.query('INSERT INTO settings(id,data) VALUES(1,$1) ON CONFLICT DO NOTHING',[JSON.stringify({semester:'2026.2',start:today,end:localDay(end),enrollmentEnd:localDay(end),open:'07:00',close:'20:00',weekdays:[0,1,2,3,4,5,6],courses:['Odontologia','Fisioterapia','Nutrição','Psicologia'],documents:['Comprovante de matrícula'],reportDeadline:'23:59',cancelHours:24,clinicStudents:60,clinicPatients:20,archived:false})]);
 if(process.env.DEMO_SEED!=='true'||await one(db,'SELECT id FROM users LIMIT 1'))return;
 const password=process.env.DEMO_PASSWORD;if(!password||password.length<10)throw new Error('DEMO_PASSWORD deve ter ao menos 10 caracteres.');
 const hash=hashPassword(password);
 for(const p of demoPeople)await db.query('INSERT INTO users(id,name,email,cpf,password,role,course,period,registration,approved,permissions,subjects,birth,sex,phone) VALUES($1,$2,$3,$4,$5,$6,$7,8,$8,true,$9,$10,$11,$12,$13)',[p.id,p.name,p.email,p.cpf,hash,p.role,p.role==='aluno'?'Odontologia':'',p.role==='aluno'?'20260001':'',JSON.stringify(['Odontologia','Fisioterapia','Nutrição','Psicologia']),JSON.stringify(['Clínica integrada']),p.birth,p.sex,p.phone]);
 await db.query('INSERT INTO rooms VALUES($1,$2,$3,$4,8,2,2,true)',['sala-1','Consultório 01','Clínica Integrada','Odontologia']);
 await db.query('INSERT INTO rooms VALUES($1,$2,$3,$4,10,3,3,true)',['sala-2','Sala de atendimento 02','Clínica Integrada','Nutrição']);
 for(let i=0;i<3;i++){
  const day=new Date();day.setDate(day.getDate()+i);const weekday=day.getDay();const aid=`disponibilidade-${i}`;const cid=`turma-${i}`;
  await db.query('INSERT INTO availability VALUES($1,$2,$3,$4,$5,$6,8,2)',[aid,'preceptor','sala-1',weekday,'08:00','12:00']);
  await db.query('INSERT INTO classes VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,60,$10,true)',[cid,['Clínica integrada I','Prática supervisionada','Atendimento à comunidade'][i],'Odontologia','[8,9,10]','[]','professor',aid,today,localDay(end),'2026.2']);
  await db.query('INSERT INTO enrollments(id,class_id,student_id) VALUES($1,$2,$3)',[id(),cid,'aluno']);
  for(let d=new Date(day);localDay(d)<=localDay(end);d.setDate(d.getDate()+7))await db.query('INSERT INTO meetings(id,class_id,day,preceptor_id,room_id) VALUES($1,$2,$3,$4,$5)',[id(),cid,localDay(d),'preceptor','sala-1']);
 }
 await db.query('INSERT INTO documents(id,student_id,kind,filename,mime,content,status,reviewer_id,comment) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id(),'aluno','Comprovante de matrícula','matricula-demonstracao.txt','text/plain',Buffer.from('Documento fictício para demonstração. Curso: Odontologia. Período: 8.'),'aprovado','professor','Cadastro fictício validado para demonstração.']);
 const meeting=await one(db,"SELECT id FROM meetings WHERE day>$1 ORDER BY day LIMIT 1",[today]);
 if(meeting)await db.query('INSERT INTO bookings(id,meeting_id,owner_id,patient,slot) VALUES($1,$2,$3,$4,$5)',[id(),meeting.id,'paciente',JSON.stringify({name:demoPeople[5].name,cpf:demoPeople[5].cpf,type:'proprio'}),'09:00']);
});}
