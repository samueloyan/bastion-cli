import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '..', 'migrations', '001_leads_shared_reports.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('Bastion platform migration SQL:\n');
console.log(sql);
console.log('\n---');
console.log('Apply with: psql $DATABASE_URL -f migrations/001_leads_shared_reports.sql');
console.log('Or paste into Supabase SQL editor.');
