import test from 'node:test';
import assert from 'node:assert/strict';
import { readJson } from '../lib/http';

function request(body:string,type='application/json') {
 return new Request('http://localhost/api/data',{method:'POST',headers:{'Content-Type':type},body});
}
test('JSON válido é lido mesmo sem Content-Length',async()=>assert.deepEqual(await readJson(request('{"action":"login"}')),{action:'login'}));
test('Limite considera os bytes reais do corpo',async()=>{await assert.rejects(readJson(request('{"body":"'+ 'a'.repeat(200)+'"}'),100),{status:413});});
test('Corpos malformados e tipos inesperados retornam erros de validação',async()=>{
 for(const body of ['null','[]','{','{"periods":{}}','{"active":"false"}','{"__proto__":{}}'])await assert.rejects(readJson(request(body)),{status:400});
 await assert.rejects(readJson(request('{}','text/plain')),{status:415});
});
