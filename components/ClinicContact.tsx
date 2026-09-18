import { MapPin, Phone, ArrowUpRight } from 'lucide-react';

export default function ClinicContact({ settings }: { settings: Record<string, any> }) {
  const { clinicAddress: address, clinicMapUrl: mapUrl, secretaryPhone: phone } = settings;
  if (!address && !mapUrl && !phone) return null;
  return <section className="panel clinic-contact">
    <div><h2>Como chegar e falar com a clínica</h2>{address && <p><MapPin size={18}/>{address}</p>}</div>
    <div className="row-actions">
      {mapUrl && <a className="button" href={mapUrl} target="_blank" rel="noopener noreferrer">Ver localização<ArrowUpRight size={17}/></a>}
      {phone && <a className="button" href={`tel:${phone.replace(/[^+\d]/g, '')}`}><Phone size={17}/>Secretaria: {phone}</a>}
    </div>
  </section>;
}
