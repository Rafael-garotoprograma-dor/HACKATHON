import nodemailer from 'nodemailer';
import { database,transaction } from '../lib/db';
import { initialize } from '../lib/seed';
import { enqueueReminders } from '../lib/reminders';
async function tick(){await initialize();const db=await database();
 await transaction(tx=>enqueueReminders(tx));
 if(!process.env.SMTP_HOST)return;
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||1025),secure:process.env.SMTP_SECURE==='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined});
 // One worker in Compose. Outbox retained for retry and visibility.
 for(const mail of (await db.query('SELECT o.*,u.email FROM outbox o JOIN users u ON u.id=o.user_id WHERE sent_at IS NULL AND attempts<10 ORDER BY created_at LIMIT 30')).rows){try{await transport.sendMail({from:process.env.MAIL_FROM||'clinica@example.test',to:mail.email,subject:mail.subject,text:mail.body});await db.query('UPDATE outbox SET sent_at=now(),attempts=attempts+1 WHERE id=$1',[mail.id]);}catch{await db.query('UPDATE outbox SET attempts=attempts+1 WHERE id=$1',[mail.id]);console.error('Falha SMTP; mensagem mantida na fila.');}}
}
async function main(){for(;;){try{await tick();}catch(e){console.error('Worker:',e instanceof Error?e.message:'erro');if(process.argv.includes('--once'))throw e;}if(process.argv.includes('--once')){const {closeDatabase}=await import('../lib/db');await closeDatabase();return;}await new Promise(r=>setTimeout(r,60_000));}}
main();
