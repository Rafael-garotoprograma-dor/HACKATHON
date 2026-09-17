import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
function docker(...args){
 const result=spawnSync(process.platform==='win32'?'docker.exe':'docker',['compose',...args],{cwd:root,encoding:'utf8'});
 if(result.error||result.status!==0)throw new Error(result.error?.message||result.stderr||'Falha no Docker.');
 return result.stdout.trim();
}
const stamp=new Date().toISOString().replace(/\D/g,'').slice(0,14);
const filename=`clinica-${stamp}.dump`,dir=path.join(root,'backups'),destination=path.join(dir,filename);
mkdirSync(dir,{recursive:true});
docker('exec','-T','db','pg_dump','-U','clinica','-d','clinica','-Fc','-f',`/tmp/${filename}`);
docker('cp',`db:/tmp/${filename}`,destination);
const hash=createHash('sha256').update(readFileSync(destination)).digest('hex');
writeFileSync(destination+'.sha256',`${hash}  ${filename}\n`);
if(process.argv.includes('--verify')){
 const temporary=`clinica_restore_${stamp}`;
 docker('exec','-T','db','createdb','-U','clinica',temporary);
 try{
  docker('exec','-T','db','pg_restore','-U','clinica','-d',temporary,'--exit-on-error',`/tmp/${filename}`);
  const query='SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM classes),(SELECT count(*) FROM enrollments),(SELECT count(*) FROM bookings),(SELECT count(*) FROM documents),(SELECT count(*) FROM reports),(SELECT coalesce(sum(octet_length(content)),0) FROM documents),(SELECT coalesce(sum(octet_length(content)),0) FROM reports);';
  const counts=db=>docker('exec','-T','db','psql','-U','clinica','-d',db,'-t','-A','-c',query);
  const original=counts('clinica'),restored=counts(temporary);
  if(original!==restored)throw new Error('Contagens diferentes após a restauração. Pause app e worker antes de verificar.');
  console.log(`Restauração verificada: usuários|turmas|inscrições|consultas|documentos|relatórios|bytes documentos|bytes relatórios = ${restored}`);
 }finally{
  // Only the uniquely named database created by this verification is removed.
  docker('exec','-T','db','dropdb','-U','clinica',temporary);
 }
}
console.log(`Backup: ${destination}\nSHA256: ${hash}`);
