import { requireThat, text } from './security';

export function clinicContact(data: Record<string, any>) {
  const address = text(data.clinicAddress, 500);
  const mapUrl = text(data.clinicMapUrl, 2000);
  const phone = text(data.secretaryPhone, 40);
  if (mapUrl) {
    let valid = false;
    try { const url = new URL(mapUrl); valid = url.protocol === 'https:' && !url.username && !url.password; } catch {}
    requireThat(valid, 'Informe um link de localização válido começando com https://.');
  }
  requireThat(!phone || /^[+\d\s().-]+$/.test(phone) && phone.replace(/\D/g, '').length >= 8 && phone.replace(/\D/g, '').length <= 15,
    'Informe um telefone válido da Secretaria, com DDD.');
  return { clinicAddress: address, clinicMapUrl: mapUrl, secretaryPhone: phone };
}
