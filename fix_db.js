// fix_db.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Mancano le credenziali nel file .env!");
  console.log("Valore URL:", supabaseUrl);
  console.log("Valore Key:", supabaseKey ? "Presente" : "Mancante");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log("SQL preparato in 'supabase_schema.sql'.");
  console.log("Per favore, copia il contenuto di 'supabase_schema.sql' ed eseguilo nell'SQL Editor di Supabase.");
  console.log("Questo risolverà:");
  console.log("1. La recursione infinita nelle policy RLS dei profili.");
  console.log("2. Il problema dei duplicati nella tabella fund_balance (PGRST116).");
  console.log("3. Errori 406/500 sulla Dashboard.");
}

fix();
