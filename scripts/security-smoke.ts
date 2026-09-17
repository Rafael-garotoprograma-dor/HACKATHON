// Run inside the app container against its own PostgreSQL and HTTP server.
import assert from 'node:assert/strict';
import { database, one, closeDatabase } from '../lib/db';
const base=process.env.APP_ORIGIN||'http://localhost:3000';
async function call(path:string,body?:unknown,cookie='',origin=base){
 return fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
}
async function main(){
 const db=await database();const stamp=Date.now().toString();let cpf=stamp.slice(-9);
 for(let n=9;n<11;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(cpf[i])*(n+1-i);cpf+=String(sum*10%11%10);}
 const email=`seguranca-${stamp}@example.test`,password=' SenhaTeste2026! ';
 assert.equal((await call('/api/data')).status,401);
 const registered=await call('/api/auth',{action:'register',name:'Teste de segurança',email,cpf,password,role:'paciente',birth:'1990-01-01',sex:'Não informado'});assert.equal(registered.status,200);
 const login=await call('/api/auth',{action:'login',login:email,password});assert.equal(login.status,200);const header=login.headers.get('set-cookie')!;assert.match(header,/HttpOnly/i);assert.match(header,/SameSite=lax/i);const cookie=header.split(';')[0];
 assert.equal((await call('/api/data',{action:'settings',payload:{data:{}}},cookie)).status,403);
 assert.equal((await call('/api/data',{action:'notice-read',payload:{}},cookie,'https://origem-invalida.example')).status,403);
 assert.equal((await call('/api/auth',{action:'login',login:"' OR 1=1 --",password})).status,401);
 assert.equal((await call('/api/auth',{action:'register',role:'master'})).status,400);
 const malformed=await fetch(base+'/api/data',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:cookie},body:'{'});assert.equal(malformed.status,400);
 const wrongType=await call('/api/data',{action:'profile',payload:{subjects:{}}},cookie);assert.equal(wrongType.status,400);
 const doc=await one(db,'SELECT id FROM documents LIMIT 1');if(doc)assert.equal((await call(`/api/files/documents/${doc.id}`,undefined,cookie)).status,404);
 const view=await (await call('/api/data',undefined,cookie)).json();assert.equal(view.documents.length,0);assert.equal(view.reports.length,0);assert.ok(view.users.every((u:any)=>u.id===view.me.id||!u.cpf));
 assert.equal((await call('/api/auth',{action:'forgot',email})).status,200);
 const mail=await one(db,"SELECT body FROM outbox WHERE user_id=$1 AND subject='Recuperação de acesso' ORDER BY created_at DESC LIMIT 1",[view.me.id]);const token=mail.body.match(/reset=([a-f0-9]+)/)?.[1];assert.ok(token);
 assert.equal((await one(db,"SELECT count(*)::int AS n FROM notices WHERE user_id=$1 AND body LIKE '%reset=%'",[view.me.id])).n,0);
 const password2='NovaSenhaTeste2026!';assert.equal((await call('/api/auth',{action:'reset',token,password:password2})).status,200);
 assert.equal((await call('/api/data',undefined,cookie)).status,401);
 assert.equal((await call('/api/auth',{action:'reset',token,password:password2})).status,400);
 const newLogin=await call('/api/auth',{action:'login',login:email,password:password2});assert.equal(newLogin.status,200);const newCookie=newLogin.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await call('/api/auth',{action:'logout'},newCookie)).status,200);assert.equal((await call('/api/data',undefined,newCookie)).status,401);
 for(let i=0;i<15;i++)assert.equal((await call('/api/auth',{action:'login',login:email,password:'invalida'})).status,401);
 assert.equal((await call('/api/auth',{action:'login',login:email,password:'invalida'})).status,429);
 const page=await fetch(base);assert.equal(page.headers.get('x-content-type-options'),'nosniff');assert.equal(page.headers.get('x-frame-options'),'DENY');
 console.log('OK: autenticação, cookies, 6 controles de acesso/entrada, recuperação de senha, revogação de sessão, token de uso único, limite de tentativas e cabeçalhos.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>closeDatabase());
