'use client';
import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export type Field = {
  name: string; label: string; type?: string;
  options?: { value: string; label: string }[];
  required?: boolean; hint?: string; min?: number; max?: number;
  autoComplete?: string;
};

export default function FieldInput({ field: f, value, onChange }: {
  field: Field; value: any; onChange: (value: any) => void;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const password = f.type === 'password';
  const shared = { id, name: f.name, required: f.required !== false,
    'aria-describedby': f.hint ? `${id}-hint` : undefined };
  return <div className={['textarea', 'file', 'checks'].includes(f.type || '') ? 'field full' : 'field'}>
    <label htmlFor={id}>{f.label}{f.required !== false ? ' *' : ''}</label>
    {f.type === 'select' ? <select {...shared} value={value ?? ''} onChange={e => onChange(e.target.value)}>
      <option value="">Selecione</option>{f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select> : f.type === 'checks' ? <div id={id} className="checks" role="group" aria-label={f.label}>
      {f.options?.map(o => <label key={o.value}><input type="checkbox" checked={(value || []).includes(o.value)}
        onChange={e => onChange(e.target.checked ? [...(value || []), o.value] : (value || []).filter((v: string) => v !== o.value))}/>{o.label}</label>)}
    </div> : f.type === 'textarea' ? <textarea {...shared} rows={4} value={value ?? ''} onChange={e => onChange(e.target.value)}/>
      : f.type === 'file' ? <input {...shared} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={e => onChange(e.target.files?.[0])}/>
      : <div className={password ? 'password-input' : 'input-control'}>
        <input {...shared} type={password && visible ? 'text' : f.type || 'text'} min={f.min} max={f.max}
          minLength={password && f.autoComplete !== 'current-password' ? 10 : undefined}
          autoComplete={f.autoComplete || (password ? 'new-password' : 'off')}
          value={value ?? ''} onChange={e => onChange(e.target.value)}/>
        {password && <button type="button" className="password-toggle" aria-controls={id}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible}
          onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button>}
      </div>}
    {f.hint && <small id={`${id}-hint`}>{f.hint}</small>}
  </div>;
}
