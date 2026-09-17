import { currentUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { authorizeFile } from '@/lib/state';
export async function GET(req:Request,context:{params:Promise<{kind:string,id:string}>}){const u=await currentUser();if(!u)return new Response('Acesso negado',{status:401});const {kind,id}=await context.params;const f=await authorizeFile(await database(),u,kind,id);if(!f)return new Response('Arquivo indisponível',{status:404});return new Response(new Uint8Array(f.content),{headers:{'Content-Type':f.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
