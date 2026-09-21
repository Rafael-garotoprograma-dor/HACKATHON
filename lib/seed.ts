import { transaction, one } from './db';
import { id, hashPassword, localDay } from './security';
import { demoPeople } from './demo-people';
let ready:Promise<void>|undefined;
export function initialize(){return ready??=transaction(async db=>{
 const today=localDay();const end=new Date();end.setDate(end.getDate()+90);
 await db.query('INSERT INTO settings(id,data) VALUES(1,$1) ON CONFLICT DO NOTHING',[JSON.stringify({semester:'2026.2',start:today,end:localDay(end),enrollmentEnd:localDay(end),open:'07:00',close:'20:00',weekdays:[0,1,2,3,4,5,6],courses:['Odontologia','Fisioterapia','Nutrição','Psicologia'],documents:['Comprovante de matrícula'],reportDeadline:'23:59',cancelHours:24,clinicStudents:60,clinicPatients:20,archived:false})]);
 if(process.env.DEMO_ROSTER_VERSION==='2'||process.env.NODE_ENV==='production')await migrateDemoRoster(db);
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

async function migrateDemoRoster(db:import('./db').DB){
 if(await one(db,"SELECT id FROM data_migrations WHERE id='demo-roster-3'"))return;
 const hash=(await one(db,"SELECT password FROM users WHERE role='master' OR role='professor' OR role='preceptor' LIMIT 1"))?.password;
 if(!hash)return;
 const master=demoPeople.find(p=>p.id==='master')!, prof=demoPeople.find(p=>p.id==='professor')!, prec=demoPeople.find(p=>p.id==='preceptor')!;
 await db.query('UPDATE users SET name=$2,email=$3,birth=$4,sex=$5,phone=$6,active=true WHERE id=$1',[master.id,master.name,master.email,master.birth,master.sex,master.phone]);
 await db.query('UPDATE users SET name=$2,email=$3,birth=$4,sex=$5,phone=$6,active=true WHERE id=$1',[prof.id,prof.name,prof.email,prof.birth,prof.sex,prof.phone]);
 await db.query('UPDATE users SET name=$2,email=$3,birth=$4,sex=$5,phone=$6,active=true WHERE id=$1',[prec.id,prec.name,prec.email,prec.birth,prec.sex,prec.phone]);
 for(const p of demoPeople.filter(p=>['professor-delvani','preceptor-diego'].includes(p.id)))await db.query('INSERT INTO users(id,name,email,cpf,password,role,course,period,approved,permissions,subjects,birth,sex,phone) VALUES($1,$2,$3,$4,$5,$6,$7,1,true,$8,$9,$10,$11,$12) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,active=true',[p.id,p.name,p.email,p.cpf,hash,p.role,p.role==='professor'?'Odontologia':'',JSON.stringify(['Odontologia','Fisioterapia','Nutrição','Psicologia']),JSON.stringify([]),p.birth,p.sex,p.phone]);
 await db.query("UPDATE users SET active=false WHERE role IN ('professor','preceptor') AND id NOT IN ('professor','professor-delvani','preceptor','preceptor-diego')");
 const students=[
  ['aluno-2','Rafael Gomes de Oliveira','rafael.gomes@alunos.test','44455566677','2002-04-11'],
  ['aluno-3','Camila Ferreira Nunes','camila.nunes@alunos.test','55566677788','2003-10-19'],
  ['aluno-4','João Pedro Martins','joao.martins@alunos.test','66677788899','2001-12-03'],
  ['aluno-5','Sofia Almeida Costa','sofia.costa@alunos.test','77788899900','2004-02-27'],
 ] as const;
 for(const [studentId,name,email,cpf,birth] of students){
  await db.query('INSERT INTO users(id,name,email,cpf,password,role,course,period,registration,approved,permissions,subjects,birth,sex,phone) VALUES($1,$2,$3,$4,$5,\'aluno\',\'Odontologia\',8,$6,true,$7,$8,$9,\'Não informado\',$10) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,active=true,approved=true',[studentId,name,email,cpf,hash,`202600${studentId.slice(-1)}`,JSON.stringify(['Odontologia']),JSON.stringify(['Clínica integrada']),birth,'(27) 90000-02'+studentId.slice(-1)]);
  const kind=(await one(db,"SELECT data->'documents'->>0 AS kind FROM settings WHERE id=1"))?.kind||'Comprovante de matrícula';
  await db.query("INSERT INTO documents(id,student_id,kind,filename,mime,content,status) SELECT $1,$2,$3,$4,'text/plain',$5,'aprovado' WHERE NOT EXISTS(SELECT 1 FROM documents WHERE student_id=$2 AND kind=$3)",[id(),studentId,kind,`matricula-${studentId}.txt`,Buffer.from(`Documento fictício de ${name}.`)]);
  for(const cls of (await db.query("SELECT id FROM classes WHERE active=true AND semester=(SELECT data->>'semester' FROM settings WHERE id=1)")).rows)await db.query("INSERT INTO enrollments(id,class_id,student_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[id(),cls.id,studentId]);
 }
 await db.query("INSERT INTO data_migrations(id) VALUES('demo-roster-3')");
}
