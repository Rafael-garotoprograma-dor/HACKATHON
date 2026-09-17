import { type DB, one } from './db';
import { localDay } from './security';
import { type User, config, isStaff, meetingInfo, availableSlots } from './domain';
export async function snapshot(db:DB,u:User){
 const settings=await config(db);const staff=isStaff(u);
 const rooms=(await db.query('SELECT * FROM rooms ORDER BY name')).rows;
 const availability=(await db.query('SELECT * FROM availability')).rows;
 const allClasses=(await db.query(`SELECT c.*,a.preceptor_id,a.room_id,a.weekday,a.start_time,a.end_time,a.students,a.patients,(SELECT count(*)::int FROM enrollments e WHERE e.class_id=c.id AND e.status='ativa') AS enrolled FROM classes c JOIN availability a ON a.id=c.availability_id ORDER BY c.name`)).rows;
 const allEnrollments=(await db.query('SELECT * FROM enrollments')).rows;
 const ownClassIds=allEnrollments.filter(e=>e.student_id===u.id).map(e=>e.class_id);
 const relevant=(c:any)=>staff||u.role==='professor'&&c.professor_id===u.id||u.role==='preceptor'&&c.preceptor_id===u.id||u.role==='aluno'&&ownClassIds.includes(c.id);
 const substituteClasses=u.role==='preceptor'?(await db.query('SELECT DISTINCT class_id FROM meetings WHERE preceptor_id=$1',[u.id])).rows.map(m=>m.class_id):[];
 const classes=allClasses.filter(c=>relevant(c)||substituteClasses.includes(c.id)||u.role==='paciente'||u.role==='aluno'&&u.approved&&c.course===u.course&&c.periods.includes(u.period)&&c.prerequisites.every((s:string)=>u.subjects.includes(s)));
 const enrollments=allEnrollments.filter(e=>staff||e.student_id===u.id||substituteClasses.includes(e.class_id)||allClasses.some(c=>c.id===e.class_id&&relevant(c)));
 const allMeetings=(await db.query('SELECT * FROM meetings ORDER BY day')).rows;
 const meetings:Record<string,any>[]=[];
 for(const m of allMeetings){const c=classes.find(c=>c.id===m.class_id);if(!c&&m.preceptor_id!==u.id)continue;const info=await meetingInfo(db,m.id);meetings.push({...m,slots:await availableSlots(db,info)});}
 const meetingIds=meetings.map(m=>m.id);
 const docs=(await db.query('SELECT d.id,d.student_id,d.kind,d.filename,d.status,d.comment,d.created_at,u.course FROM documents d JOIN users u ON u.id=d.student_id ORDER BY d.created_at DESC')).rows.filter(d=>u.role==='master'||d.student_id===u.id||u.role==='professor'&&u.permissions.includes(d.course));
 const reports=(await db.query('SELECT id,meeting_id,author_id,filename,late,comment,attendance,attended_bookings,created_at FROM reports ORDER BY created_at DESC')).rows.filter(r=>r.author_id===u.id||u.role==='professor'&&allMeetings.some(m=>m.id===r.meeting_id&&allClasses.some(c=>c.id===m.class_id&&c.professor_id===u.id)));
 const attendance=(await db.query('SELECT * FROM attendance')).rows.filter(a=>a.student_id===u.id||['professor','preceptor'].includes(u.role)&&meetingIds.includes(a.meeting_id)||u.role==='master');
 const assignedToMeeting=(m:any)=>u.role==='preceptor'?m.preceptor_id===u.id:u.role==='professor'?allClasses.some(c=>c.id===m.class_id&&c.professor_id===u.id):u.role==='aluno'&&allEnrollments.some(e=>e.student_id===u.id&&e.class_id===m.class_id&&localDay(new Date(e.created_at))<=m.day&&(!e.ended_at||localDay(new Date(e.ended_at))>=m.day));
 const bookings=(await db.query('SELECT * FROM bookings ORDER BY created_at DESC')).rows.filter(b=>staff||b.owner_id===u.id||allMeetings.some(m=>m.id===b.meeting_id&&assignedToMeeting(m))).map(b=>staff||b.owner_id===u.id?b:{id:b.id,meeting_id:b.meeting_id,slot:b.slot,status:b.status,patient:{name:u.role==='aluno'?`Atendimento ${b.id.slice(0,8)}`:b.patient.name}});
 const users=(await db.query('SELECT id,name,role,course,period,registration,phone,birth,sex,email,cpf,approved,active,permissions,subjects FROM users ORDER BY name')).rows.filter(v=>staff||v.id===u.id||(u.role==='paciente'?['secretaria','professor','preceptor'].includes(v.role):v.role!=='paciente')).map(v=>u.role==='master'||u.role==='secretaria'&&v.role==='paciente'||v.id===u.id||u.role==='professor'&&v.role==='aluno'&&u.permissions.includes(v.course)?v:{id:v.id,name:v.name,role:v.role,course:v.course});
 const transfers=(await db.query('SELECT * FROM transfers ORDER BY created_at DESC')).rows.filter(t=>u.role==='master'||t.student_id===u.id||u.role==='professor'&&allClasses.some(c=>c.id===t.from_class&&c.professor_id===u.id));
 const issues=(await db.query('SELECT * FROM issues ORDER BY created_at DESC')).rows.filter(i=>u.role==='master'||i.author_id===u.id);
 const messages=(await db.query('SELECT * FROM messages WHERE sender_id=$1 OR recipient_id=$1 ORDER BY created_at DESC LIMIT 200',[u.id])).rows;
 const notices=(await db.query('SELECT * FROM notices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[u.id])).rows;
 const mail=u.role==='master'?(await db.query('SELECT id,subject,sent_at,attempts,created_at FROM outbox ORDER BY created_at DESC LIMIT 50')).rows:[];
 const audit=u.role==='master'?(await db.query('SELECT * FROM audit ORDER BY created_at DESC LIMIT 100')).rows:[];
 const {password,...me}=u;void password;
 return {me,settings,rooms,availability,classes,enrollments,meetings,documents:docs,reports,attendance,bookings,users,transfers,issues,messages,notices,mail,audit};
}
export async function authorizeFile(db:DB,u:User,kind:string,fileId:string){
 if(kind==='documents'){const f=await one(db,'SELECT d.*,u.course FROM documents d JOIN users u ON u.id=d.student_id WHERE d.id=$1',[fileId]);if(f&&(u.role==='master'||f.student_id===u.id||u.role==='professor'&&u.permissions.includes(f.course)))return f;}
 if(kind==='reports'){const f=await one(db,'SELECT r.*,c.professor_id FROM reports r JOIN meetings m ON m.id=r.meeting_id JOIN classes c ON c.id=m.class_id WHERE r.id=$1',[fileId]);if(f&&(f.author_id===u.id||u.role==='professor'&&f.professor_id===u.id))return f;}
 return null;
}
