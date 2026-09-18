import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Integra-Clinica-Anhanguera',description:'Gestão de ensino, supervisão e cuidado à comunidade.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
