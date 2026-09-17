import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { transaction, one } from '@/lib/db';
import { initialize } from '@/lib/seed';
import { sameOrigin, sessionCookie } from '@/lib/auth';
import { token,digest,id,hashPassword,verifyPassword,requireThat,AppError,text,cpfValid,integer,dateValid } from '@/lib/security';
import { config } from '@/lib/domain';
import { readJson } from '@/lib/http';
export const runtime='nodejs';
export async function POST(req:Request){try{
 sameOrigin(req);const p=await readJson(req);await initialize();requireThat(['login','register','forgot','reset','logout'].includes(p.action),'Ação inválida.');
 const key=digest(`${p.action}:${text(p.login||p.email||p.cpf||p.token).toLowerCase()}`);
 if(p.action!=='logout')await transaction(async db=>{const attempt=await one(db,'SELECT * FROM login_attempts WHERE key=$1 AND expires>now()',[key]);requireThat(!attempt||attempt.attempts<15,'Muitas tentativas. Aguarde 15 minutos.',429);
  await db.query("INSERT INTO login_attempts VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.expires<now() THEN 1 ELSE login_attempts.attempts+1 END,expires=CASE WHEN login_attempts.expires<now() THEN now()+interval '15 minutes' ELSE login_attempts.expires END",[key]);
 });
 const result=await transaction(async db=>{
  if(p.action==='login'){
   const login=text(p.login).toLowerCase();const u=await one(db,'SELECT * FROM users WHERE (cpf=$1 OR email=$2) AND active=true',[login.replace(/\D/g,''),login]);
   if(!u||typeof p.password!=='string'||p.password.length>200||!verifyPassword(p.password,u.password))return {error:'CPF/e-mail ou senha incorretos.',status:401};
   const session=token();await db.query("INSERT INTO sessions VALUES($1,$2,now()+interval '12 hours')",[digest(session),u.id]);await db.query('DELETE FROM login_attempts WHERE key=$1',[key]);return {session};
  }
  if(p.action==='register'){
   const cpf=text(p.cpf).replace(/\D/g,'');requireThat(cpfValid(cpf),'CPF inválido.');requireThat(text(p.name)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email),'Nome e e-mail são obrigatórios.');requireThat(typeof p.password==='string'&&p.password.length>=10&&p.password.length<=200,'Use uma senha de 10 a 200 caracteres.');requireThat(dateValid(p.birth)&&p.birth<=new Date().toISOString().slice(0,10),'Data de nascimento inválida.');requireThat(['paciente','aluno'].includes(p.role),'Perfil inválido.');
   const cfg=await config(db);if(p.role==='aluno')requireThat(cfg.courses.includes(p.course)&&text(p.registration),'Informe curso e matrícula.');
   await db.query('INSERT INTO users(id,name,email,cpf,password,role,course,period,registration,phone,birth,sex) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[id(),text(p.name),text(p.email).toLowerCase(),cpf,hashPassword(p.password),p.role,text(p.course),integer(p.period||1,1,20),text(p.registration),text(p.phone),p.birth,text(p.sex)]);return {message:'Cadastro criado. Entre com CPF e senha.'};
  }
  if(p.action==='forgot'){
   const u=await one(db,'SELECT * FROM users WHERE email=$1 AND active=true',[text(p.email).toLowerCase()]);if(u){const raw=token();await db.query('DELETE FROM resets WHERE user_id=$1',[u.id]);await db.query("INSERT INTO resets VALUES($1,$2,now()+interval '30 minutes')",[digest(raw),u.id]);const origin=process.env.APP_ORIGIN||new URL(req.url).origin;await db.query('INSERT INTO outbox(id,user_id,subject,body) VALUES($1,$2,$3,$4)',[id(),u.id,'Recuperação de acesso',`Abra ${origin}/?reset=${raw} para definir uma nova senha. Link válido por 30 minutos.`]);}return {message:'Se o e-mail estiver cadastrado, você receberá as instruções.'};
  }
  if(p.action==='reset'){
   const r=await one(db,'SELECT * FROM resets WHERE token=$1 AND expires>now()',[digest(text(p.token))]);requireThat(r,'Link inválido ou expirado.');requireThat(typeof p.password==='string'&&p.password.length>=10&&p.password.length<=200,'Senha deve ter 10 a 200 caracteres.');await db.query('UPDATE users SET password=$2 WHERE id=$1',[r.user_id,hashPassword(p.password)]);await db.query('DELETE FROM sessions WHERE user_id=$1',[r.user_id]);await db.query('DELETE FROM resets WHERE user_id=$1',[r.user_id]);return {message:'Senha atualizada. Faça login.'};
  }
  if(p.action==='logout'){const jar=await cookies();await db.query('DELETE FROM sessions WHERE token=$1',[digest(jar.get('clinic_session')?.value||'')]);return {logout:true};}
  throw new AppError('Ação inválida.');
 });
 const response=NextResponse.json(result,{status:result.status||200});if(result.session){response.cookies.set(sessionCookie(result.session));return NextResponse.json({ok:true},{headers:response.headers});}if(result.logout)response.cookies.set(sessionCookie('',0));return response;
 }catch(e){return authError(e);}}
function authError(e:unknown){if(e instanceof AppError)return NextResponse.json({error:e.message},{status:e.status});if((e as any)?.code==='23505')return NextResponse.json({error:'CPF ou e-mail já cadastrado.'},{status:409});console.error('Auth failure',e instanceof Error?e.message:'unknown');return NextResponse.json({error:'Não foi possível concluir. Tente novamente.'},{status:500});}
export async function GET(){await initialize();const {database}=await import('@/lib/db');const cfg=await config(await database());return NextResponse.json({courses:cfg.courses,demo:process.env.DEMO_SEED==='true'},{headers:{'Cache-Control':'no-store'}});}
