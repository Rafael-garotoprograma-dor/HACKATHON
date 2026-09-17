import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';
import type { PGlite } from '@electric-sql/pglite';

export type Row = Record<string, any>;
export interface DB { query<T extends Row=Row>(sql:string, params?:any[]):Promise<{rows:T[]}> }
type State = {db?:DB; pool?:Pool; lite?:PGlite; ready?:Promise<void>; queue:Promise<unknown>};
const globalDB = globalThis as unknown as {clinicDB?:State};
const state = globalDB.clinicDB ??= {queue:Promise.resolve()};
export async function database():Promise<DB> {
 if (!state.ready) state.ready = (async()=>{
  if(process.env.DATABASE_URL) {state.pool=new Pool({connectionString:process.env.DATABASE_URL});state.db=state.pool;}
  else {
   if(process.env.NODE_ENV==='production' && !process.env.ALLOW_LOCAL_DB) throw new Error('DATABASE_URL obrigatório em produção.');
   const {PGlite}=await import('@electric-sql/pglite');
   state.lite=new PGlite(process.env.LOCAL_DB_PATH || path.join(process.cwd(),'.data','clinica'));state.db=state.lite as unknown as DB;
  }
  const schema=await readFile(path.join(process.cwd(),'database','schema.sql'),'utf8');
  if(state.pool){const c=await state.pool.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(918260)');await c.query(schema);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
  else await state.lite!.exec(schema);
 })();
 await state.ready;return state.db!;
}
// One transaction lock for mutations: simple and safe for the scale of this MVP.
export async function transaction<T>(fn:(db:DB)=>Promise<T>):Promise<T>{
 await database();
 if(state.pool){const c:PoolClient=await state.pool.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(918261)');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 const job=state.queue.then(()=>state.lite!.transaction(tx=>fn(tx as unknown as DB)));state.queue=job.catch(()=>{});return job;
}
export async function one(db:DB,sql:string,args:any[]=[]){return (await db.query(sql,args)).rows[0];}
export async function closeDatabase(){await state.pool?.end();await state.lite?.close();}
