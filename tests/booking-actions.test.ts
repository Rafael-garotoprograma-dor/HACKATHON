import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingActions } from '../lib/booking-actions';
import { clinicContact } from '../lib/clinic-contact';

const day='2026-09-18',booking={status:'agendado',slot:'09:00'};
const before=(hours:number)=>new Date(`${day}T09:00:00-03:00`).getTime()-hours*3600000;
test('Consulta já reservada permite confirmar; prazo de cancelamento mantém a recusa de 24 horas',()=>{
 assert.equal(bookingActions(booking,day,24,false,before(30)).canConfirm,true);
 assert.equal(bookingActions(booking,day,24,false,before(24)).canCancelNormally,true);
 const near=bookingActions(booking,day,24,false,before(12));assert.equal(near.canCancelNormally,false);assert.equal(near.canDecline,true);
 const confirmed=bookingActions({...booking,status:'confirmado'},day,24,false,before(12));assert.equal(confirmed.canCancel,false);assert.match(confirmed.explanation,/Secretaria/);
 assert.equal(bookingActions({...booking,status:'confirmado'},day,24,true,before(12)).canCancel,true);
});
test('Consulta passada ou encerrada não oferece confirmação nem cancelamento',()=>{
 const expired=bookingActions(booking,day,24,false,before(-1));assert.equal(expired.canConfirm,false);assert.equal(expired.canCancel,false);assert.match(expired.explanation,/Horário encerrado/);
 assert.equal(bookingActions(booking,day,24,true,before(-1)).canMarkAbsent,true);
 assert.equal(bookingActions({...booking,status:'cancelado_paciente'},day,24,false,before(30)).canConfirm,false);
});
test('Contato permite dados pendentes, valida telefone e rejeita links executáveis',()=>{
 assert.deepEqual(clinicContact({}),{clinicAddress:'',clinicMapUrl:'',secretaryPhone:''});
 assert.equal(clinicContact({clinicMapUrl:'https://maps.google.com/',secretaryPhone:'(27) 3333-4444'}).secretaryPhone,'(27) 3333-4444');
 for(const clinicMapUrl of ['javascript:alert(1)','data:text/html,test','http://example.com','https://user:pass@example.com'])assert.throws(()=>clinicContact({clinicMapUrl}));
 assert.throws(()=>clinicContact({secretaryPhone:'abc'}));
});
