import { NextResponse } from 'next/server';
import { currentUser,sameOrigin } from '@/lib/auth';
import { initialize } from '@/lib/seed';
import { database,transaction,one } from '@/lib/db';
import { snapshot } from '@/lib/state';
import { mutate,type User } from '@/lib/domain';
import { requireThat,AppError } from '@/lib/security';
import { readJson } from '@/lib/http';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{await initialize();const u=await currentUser();requireThat(u,'Entre para continuar.',401);return NextResponse.json(await snapshot(await database(),u),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{sameOrigin(req);await initialize();const u=await currentUser();requireThat(u,'Entre para continuar.',401);const {action,payload}=await readJson(req,7_100_000);requireThat(typeof action==='string'&&(!payload||typeof payload==='object'&&!Array.isArray(payload)),'Ação ou dados inválidos.');const result=await transaction(async db=>{const fresh=await one(db,'SELECT * FROM users WHERE id=$1 AND active=true',[u.id]);requireThat(fresh,'Acesso desativado.',401);return mutate(db,fresh as User,action,payload||{});});return NextResponse.json(result);}catch(e){return errorResponse(e);}}
function errorResponse(e:unknown){if(e instanceof AppError)return NextResponse.json({error:e.message},{status:e.status});if((e as any)?.code==='23505')return NextResponse.json({error:'Este registro já existe. Atualize a página.'},{status:409});console.error('Request failed',e instanceof Error?e.message:'unknown');return NextResponse.json({error:'Não foi possível concluir a operação. Confira os dados e tente novamente.'},{status:500});}
