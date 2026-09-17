import { type DB } from './db';
import { id, startInstant } from './security';

/** Enqueue the currently useful reminder; recover after downtime without sending obsolete reminders. */
export async function enqueueReminders(db:DB, now=new Date()) {
 const bookings=(await db.query("SELECT b.*,m.day,c.name FROM bookings b JOIN meetings m ON m.id=b.meeting_id JOIN classes c ON c.id=m.class_id WHERE b.status IN ('agendado','confirmado') AND m.status='aberto'")).rows;
 for(const b of bookings){
  const hours=(startInstant(b.day,b.slot).getTime()-now.getTime())/3600000;
  if(hours<=0||hours>72)continue;
  const threshold=hours<=5?5:hours<=24?24:72;
  if(threshold===24&&b.status==='confirmado')continue;
  const subject=threshold===5?'Sua consulta está próxima':threshold===24?'Confirme sua presença':'Lembrete de consulta';
  const body=`${b.name}: ${b.day} às ${b.slot}. Acesse ${process.env.APP_ORIGIN||'http://localhost:3000'} para consultar, confirmar ou recusar. Não responda a este e-mail.`;
  const result=await db.query('INSERT INTO outbox(id,user_id,subject,body,dedupe) VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe) DO NOTHING RETURNING id',[id(),b.owner_id,subject,body,`${b.id}:${threshold}`]);
  if(result.rows.length)await db.query('INSERT INTO notices(id,user_id,subject,body) VALUES($1,$2,$3,$4)',[id(),b.owner_id,subject,body]);
 }
}
