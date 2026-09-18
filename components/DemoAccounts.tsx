'use client';
import { ShieldCheck, ClipboardCheck, GraduationCap, Stethoscope, Users, Heart } from 'lucide-react';
import { demoPeople } from '../lib/demo-people';

const profiles = [
  { role: 'master', label: 'Master', icon: ShieldCheck },
  { role: 'secretaria', label: 'Secretaria', icon: ClipboardCheck },
  { role: 'professor', label: 'Professor', icon: GraduationCap },
  { role: 'preceptor', label: 'Preceptor', icon: Stethoscope },
  { role: 'aluno', label: 'Aluno', icon: Users },
  { role: 'paciente', label: 'Paciente', icon: Heart },
];

export default function DemoAccounts({ login, onSelect }: {
  login: string; onSelect: (email: string) => void;
}) {
  return <section className="demo-accounts" aria-labelledby="demo-title">
    <div className="demo-heading"><span className="eyebrow">EXPLORE A PLATAFORMA</span><span className="demo-tag">Demonstração</span></div>
    <h3 id="demo-title">Um olhar para cada perfil</h3>
    <p>Escolha uma conta para preencher o e-mail. Depois, informe a senha e entre.</p>
    <div className="demo-profiles">
      {profiles.map(({ role, label, icon: Icon }) => {
        const person = demoPeople.find(p => p.role === role)!;
        return <button key={role} type="button" aria-label={`Preencher e-mail de ${label}`}
          aria-pressed={login === person.email} onClick={() => onSelect(person.email)}>
          <Icon size={19}/><span>{label}</span>
        </button>;
      })}
    </div>
  </section>;
}
