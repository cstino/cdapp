import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Manual .env loading to avoid dependencies
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const processEnv = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) processEnv[key.trim()] = value.join('=').trim();
});

const supabaseUrl = processEnv.VITE_SUPABASE_URL;
const supabaseServiceKey = processEnv.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Errore: VITE_SUPABASE_URL e VITE_SUPABASE_SERVICE_ROLE_KEY devono essere nel file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('--- Configurazione Superadmin Iniziale ---');

rl.question('Username: ', (username) => {
  rl.question('Email: ', (email) => {
    rl.question('Password: ', (password) => {
      createAdmin(username, email, password);
    });
  });
});

async function createAdmin(username, email, password) {
  console.log('--- Avvio Creazione Manuale ---');
  
  try {
    // 1. Create user in Auth
    console.log('1. Creazione record in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role: 'superadmin' }
    });

    if (authError) {
        if (authError.message.includes('Database error creating new user')) {
            throw new Error("L'errore persiste. Assicurati di aver rimosso il Trigger con il nuovo script SQL (DROP TRIGGER).");
        }
        throw authError;
    }

    const userId = authData.user.id;
    console.log('✅ Utente Auth creato con ID:', userId);

    // 2. Create profile record manually
    console.log('2. Inserimento manuale nella tabella profiles...');
    const { error: profError } = await supabase
        .from('profiles')
        .upsert([{
            id: userId,
            username,
            email,
            role: 'superadmin'
        }]);

    if (profError) {
        console.error('❌ Errore durante l\'inserimento del profilo:', profError.message);
        console.log('L\'utente Auth è stato creato, ma il profilo no. Dovrai inserirlo manualmente se necessario.');
    } else {
        console.log('✅ Profilo creato con successo.');
    }

    console.log('\n✨ OPERAZIONE COMPLETATA! ✨');
    console.log('Email:', email);
    console.log('Username:', username);
    console.log('Ora puoi accedere all\'applicazione.');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERRORE FATALE:', err.message);
    process.exit(1);
  }
}
