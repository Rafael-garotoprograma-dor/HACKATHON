// Integration smoke test against the running Docker app. Creates clearly named fictitious test records.
import assert from 'node:assert/strict';
import { demoPeople } from '../lib/demo-people';
const base=process.env.TEST_ORIGIN||'http://localhost:3000';
const password=process.env.DEMO_PASSWORD||'DemoClinica2026!';
const stamp=Date.now().toString();
function cpf(seed:string){let s=seed.padStart(9,'0').slice(-9);for(let n=9;n<11;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(s[i])*(n+1-i);s+=String((sum*10)%11%10);}return s;}
class Client{
 cookie='';
 async call(url:string,body?:any){const r=await fetch(base+url,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(this.cookie?{Cookie:this.cookie}:{})},body:body?JSON.stringify(body):undefined});const cookie=r.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];const result=await r.json();assert.ok(r.ok,`${url}: ${JSON.stringify(result)}`);return result;}
 login(login:string){return this.call('/api/auth',{action:'login',login,password});}
 data(){return this.call('/api/data');}
 action(action:string,payload:any){return this.call('/api/data',{action,payload});}
}
async function main(){
 const sessions:Record<string,Client>={};for(const person of demoPeople){const c=new Client();await c.login(person.cpf);const state=await c.data();assert.equal(state.me.role,person.role);sessions[person.role]=c;}console.log('OK: login e leitura dos seis perfis');
 const master=sessions.master,teacher=new Client(),preceptor=new Client();const conf=(await master.data()).settings;
 for(const [role,client,offset] of [['professor',teacher,2],['preceptor',preceptor,3]] as const){
  const login=`${role}-${stamp}@example.test`;
  await master.action('user',{name:`${role} teste ${stamp}`,email:login,cpf:cpf(String(Number(stamp.slice(-9))+offset)),password,role,course:'Nutrição',period:1,permissions:['Nutrição'],subjects:[],active:true});
  await client.login(login);
 }
 const date=new Date();date.setDate(date.getDate()+7);const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(date);const weekday=date.getDay();
 const room=await master.action('room',{name:`Sala teste ${stamp}`,clinic:'Clínica de testes',area:'Nutrição',students:4,patients:1,equipment:1});
 const av=await preceptor.action('availability',{room_id:room.id,weekday,start_time:'14:00',end_time:'16:00',students:4,patients:1});
 const cls=await teacher.action('class',{name:`Turma teste ${stamp}`,course:'Nutrição',availability_id:av.id,periods:[4],prerequisites:[],start_date:day,end_date:day,duration:60});
 console.log('OK: Master → preceptor → professor cria turma sem conflito');
 const student=new Client(),patient=new Client();const studentCPF=cpf(stamp.slice(-9)),patientCPF=cpf(String(Number(stamp.slice(-9))+1));
 await student.call('/api/auth',{action:'register',name:'Aluno de teste integrado',email:`aluno-${stamp}@example.test`,cpf:studentCPF,password,role:'aluno',birth:'2000-05-10',sex:'Não informado',course:'Nutrição',period:4,registration:`T${stamp}`});await student.login(studentCPF);
 const before=await student.data();assert.equal(before.me.approved,false);assert.ok(!before.classes.some((c:any)=>c.id===cls.id));
 for(const kind of conf.documents)await student.action('document',{kind,filename:'comprovante-ficticio.txt',mime:'text/plain',content:Buffer.from('Dados fictícios. Nutrição, 4º período.').toString('base64')});
 const review=await teacher.data();for(const doc of review.documents.filter((d:any)=>d.student_id===before.me.id&&d.status==='pendente'))await teacher.action('review-document',{id:doc.id,status:'aprovado',comment:'Dados fictícios conferidos no teste integrado.'});
 const validated=await student.data();assert.equal(validated.me.approved,true);assert.ok(validated.classes.some((c:any)=>c.id===cls.id));await student.action('enroll',{class_id:cls.id});console.log('OK: cadastro → documento → aprovação → inscrição');
 await patient.call('/api/auth',{action:'register',name:'Paciente de teste integrado',email:`paciente-${stamp}@example.test`,cpf:patientCPF,password,role:'paciente',birth:'1990-03-15',sex:'Não informado'});await patient.login(patientCPF);
 const patientView=await patient.data();const meeting=patientView.meetings.find((m:any)=>m.class_id===cls.id);assert.ok(meeting.slots.length);const booked=await patient.action('booking',{meeting_id:meeting.id,slot:meeting.slots[0].time,patient:{type:'proprio'}});await patient.action('booking-status',{id:booked.id,status:'confirmado'});assert.equal((await patient.data()).bookings.find((b:any)=>b.id===booked.id).status,'confirmado');
 await patient.action('booking-status',{id:booked.id,status:'cancelado_paciente',reason:'Teste de cancelamento'});assert.equal((await patient.data()).bookings.find((b:any)=>b.id===booked.id).status,'cancelado_paciente');
 console.log('OK: paciente agenda, confirma e cancela com persistência PostgreSQL');
 const competing=new Client(),competingCPF=cpf(String(Number(stamp.slice(-9))+4));
 await competing.call('/api/auth',{action:'register',name:'Paciente concorrente fictício',email:`concorrente-${stamp}@example.test`,cpf:competingCPF,password,role:'paciente',birth:'1990-01-01',sex:'Não informado'});await competing.login(competingCPF);
 const race=await Promise.all([patient,competing].map(client=>fetch(base+'/api/data',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:client.cookie},body:JSON.stringify({action:'booking',payload:{meeting_id:meeting.id,slot:meeting.slots[0].time,patient:{type:'proprio'}}})})));
 assert.deepEqual(race.map(r=>r.status).sort(),[200,400]);console.log('OK: última vaga concorrente protegida no PostgreSQL real');
 const unauthorized=await fetch(base+'/api/data',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:patient.cookie},body:JSON.stringify({action:'settings',payload:{data:conf}})});assert.equal(unauthorized.status,403);
 const csrf=await fetch(base+'/api/data',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://outro.example',Cookie:master.cookie},body:JSON.stringify({action:'notice-read'})});assert.equal(csrf.status,403);console.log('OK: API bloqueia privilégio indevido e origem externa');
 // Leave the test class clearly closed; retain the records for traceability.
 await teacher.action('cancel-meeting',{meeting_id:meeting.id,reason:'Encontro exclusivo de teste integrado; validação concluída.'});
 console.log('Teste integrado concluído. Registros fictícios preservados com identificação de teste.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
