import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
export const id=()=>randomUUID();
export const token=()=>randomBytes(32).toString('hex');
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function hashPassword(value:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(value,salt,64).toString('hex')}`;}
export function verifyPassword(value:string,hash:string){const [salt,key]=hash.split(':');if(!salt||!key)return false;const candidate=scryptSync(value,salt,64);const expected=Buffer.from(key,'hex');return expected.length===candidate.length&&timingSafeEqual(candidate,expected);}
export class AppError extends Error {constructor(message:string,public status=400){super(message);}}
export function requireThat(condition:unknown,message:string,status=400):asserts condition{if(!condition)throw new AppError(message,status);}
export function text(value:unknown,max=200){return String(value??'').trim().slice(0,max);}
export function integer(value:unknown,min=1,max=1000){const n=Number(value);requireThat(Number.isInteger(n)&&n>=min&&n<=max,'Número fora do intervalo permitido.');return n;}
export function cpfValid(value:string){if(!/^\d{11}$/.test(value)||/^(\d)\1+$/.test(value))return false;for(let n=9;n<11;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(value[i])*(n+1-i);const digit=(sum*10)%11%10;if(digit!==Number(value[n]))return false;}return true;}
export function timeValid(t:string){return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);}
export const minutes=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
export const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export function localDay(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function dateValid(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export const startInstant=(day:string,t:string)=>new Date(`${day}T${t}:00-03:00`);
