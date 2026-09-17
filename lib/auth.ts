import { cookies } from 'next/headers';
import { database, one } from './db';
import { digest, requireThat } from './security';
import type { User } from './domain';
export async function currentUser(){const jar=await cookies();const value=jar.get('clinic_session')?.value;if(!value)return null;const db=await database();return await one(db,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires>now() AND u.active=true',[digest(value)]) as User|null;}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');const expected=process.env.APP_ORIGIN||new URL(request.url).origin;requireThat(origin===expected,'Origem da requisição não autorizada.',403);}
export const sessionCookie=(value:string,maxAge=60*60*12)=>({name:'clinic_session',value,httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax' as const,path:'/',maxAge});
