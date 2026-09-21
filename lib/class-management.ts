import {type DB, type Row, one} from './db';
import {id, requireThat, text, integer, timeValid, minutes, time, localDay, startInstant} from './security';

// Called inside the same serialized transaction as every other scheduling mutation.
export async function updateClass(db:DB,p:Row){
 const c=await one(db,`SELECT c.*,a.preceptor_id,a.room_id,a.weekday,a.start_time,a.end_time,a.students,a.patients FROM classes c JOIN availability a ON a.id=c.availability_id WHERE c.id=$1`,[p.id]);
 requireThat(c,'Turma não encontrada.');
 const cfg=(await one(db,'SELECT data FROM settings WHERE id=1')).data;
 requireThat(!cfg.archived&&c.active&&c.semester===cfg.semester,'Turma ou semestre encerrado.');
 const prof=await one(db,"SELECT * FROM users WHERE id=$1 AND role='professor' AND active=true",[p.professor_id]);
 requireThat(prof?.permissions.includes(c.course),'Professor não habilitado para o curso.');
 const periods=(p.periods||[]).map((v:unknown)=>integer(v,1,20));
 requireThat(text(p.name)&&periods.length,'Informe nome e períodos permitidos.');
 const start=text(p.start_time),end=text(p.end_time);
 requireThat(timeValid(start)&&timeValid(end)&&start<end&&start>=cfg.open&&end<=cfg.close&&cfg.weekdays.includes(c.weekday),'Horário fora do funcionamento da clínica.');
 requireThat(minutes(end)-minutes(start)>=c.duration,'Horário menor que a duração da consulta.');
 const coverage=await one(db,`SELECT a.* FROM availability a JOIN users u ON u.id=a.preceptor_id WHERE a.preceptor_id=$1 AND a.room_id=$2 AND a.weekday=$3 AND a.start_time<=$4 AND a.end_time>=$5 AND u.active=true AND u.role='preceptor' AND (u.course=$6 OR u.permissions @> $7::jsonb) ORDER BY a.students DESC LIMIT 1`,[c.preceptor_id,c.room_id,c.weekday,start,end,c.course,JSON.stringify([c.course])]);
 requireThat(coverage,'O preceptor precisa confirmar disponibilidade para este horário na sala.');
 const enrolled=(await one(db,"SELECT count(*)::int AS n FROM enrollments WHERE class_id=$1 AND status='ativa'",[c.id])).n;
 requireThat(enrolled<=coverage.students,'Supervisão insuficiente para os alunos já inscritos.');
 const changed=start!==c.start_time||end!==c.end_time;
 const meetings=(await db.query("SELECT * FROM meetings WHERE class_id=$1 AND day>=$2 ORDER BY day",[c.id,localDay()])).rows.filter(m=>startInstant(m.day,m.start_time||c.start_time)>new Date());
 if(changed)requireThat(meetings.length,'Não há encontros futuros para alterar.');
 for(const m of meetings){
  if(m.status!=='aberto')continue;
  const others=(await db.query(`SELECT m.*,c.professor_id,a.students,a.patients FROM meetings m JOIN classes c ON c.id=m.class_id JOIN availability a ON a.id=c.availability_id WHERE m.day=$1 AND m.class_id<>$2 AND m.status='aberto' AND COALESCE(m.start_time,a.start_time)<$3 AND COALESCE(m.end_time,a.end_time)>$4`,[m.day,c.id,end,start])).rows;
  requireThat(!others.some(o=>o.room_id===m.room_id||o.preceptor_id===m.preceptor_id||o.professor_id===prof.id),'Conflito de sala, professor ou preceptor no novo horário.');
  const ids=others.map(o=>o.class_id);
  if(ids.length)requireThat(!await one(db,`SELECT e.id FROM enrollments e JOIN enrollments other ON other.student_id=e.student_id WHERE e.class_id=$1 AND e.status='ativa' AND other.status='ativa' AND other.class_id=ANY($2::text[]) LIMIT 1`,[c.id,ids]),'Um aluno já está em outra turma no novo horário.');
  requireThat(others.reduce((n,o)=>n+o.students,0)+coverage.students<=cfg.clinicStudents&&others.reduce((n,o)=>n+o.patients,0)+coverage.patients<=cfg.clinicPatients,'Capacidade simultânea da clínica excedida.');
  if(changed){
   requireThat(!await one(db,'SELECT id FROM absences WHERE user_id=$1 AND start_day<=$2 AND end_day>=$2',[m.preceptor_id,m.day]),'Preceptor ausente neste encontro.');
   requireThat(!await one(db,'SELECT id FROM room_blocks WHERE room_id=$1 AND start_day<=$2 AND end_day>=$2',[m.room_id,m.day]),'Sala bloqueada neste encontro.');
   const own=(await db.query("SELECT * FROM bookings WHERE meeting_id=$1 AND status IN ('agendado','confirmado')",[m.id])).rows;
   for(const b of own){
    const slot=time(minutes(b.slot)+minutes(start)-minutes(m.start_time||c.start_time));
    requireThat(minutes(slot)>=minutes(start)&&minutes(slot)+c.duration<=minutes(end),'Há consultas que não cabem no novo horário.');
    requireThat(startInstant(m.day,slot)>new Date(),'Novo horário de consulta já passou.');
    const conflict=await one(db,`SELECT b.id FROM bookings b JOIN meetings m ON m.id=b.meeting_id JOIN classes c ON c.id=m.class_id WHERE m.day=$1 AND m.id<>$2 AND b.status IN ('agendado','confirmado') AND (b.owner_id=$3 OR b.patient->>'cpf'=$4) AND b.slot::time<($5::time+($6||' minutes')::interval) AND (b.slot::time+(c.duration||' minutes')::interval)>$5::time LIMIT 1`,[m.day,m.id,b.owner_id,b.patient.cpf,slot,String(c.duration)]);
    requireThat(!conflict,'Paciente ou responsável tem consulta no novo horário.');
    await db.query('UPDATE bookings SET slot=$2 WHERE id=$1',[b.id,slot]);
    await db.query('INSERT INTO notices(id,user_id,subject,body) VALUES($1,$2,$3,$4)',[id(),b.owner_id,'Horário atualizado pelo Master',`${c.name}: ${m.day}, ${slot}. Consulte sua agenda.`]);
   }
  }
 }
 if(changed){
  // Freeze previous meeting times before changing the class schedule.
  await db.query('UPDATE meetings SET start_time=COALESCE(start_time,$2),end_time=COALESCE(end_time,$3) WHERE class_id=$1',[c.id,c.start_time,c.end_time]);
  const aid=id();await db.query('INSERT INTO availability VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[aid,c.preceptor_id,c.room_id,c.weekday,start,end,coverage.students,coverage.patients]);
  await db.query('UPDATE classes SET availability_id=$2 WHERE id=$1',[c.id,aid]);
  for(const m of meetings)await db.query('UPDATE meetings SET start_time=$2,end_time=$3 WHERE id=$1',[m.id,start,end]);
 }
 await db.query('UPDATE classes SET name=$2,periods=$3,prerequisites=$4,professor_id=$5 WHERE id=$1',[c.id,text(p.name),JSON.stringify(periods),JSON.stringify(p.prerequisites||[]),prof.id]);
}
