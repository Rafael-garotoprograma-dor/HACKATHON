import { initialize } from '../lib/seed';
import { closeDatabase } from '../lib/db';
initialize().then(()=>console.log('Banco inicializado. Dados fictícios inseridos somente se DEMO_SEED=true e banco vazio.')).finally(closeDatabase);
