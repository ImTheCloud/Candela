const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '', SUPABASE_SERVICE_ROLE_KEY = '';
for (const line of env.split('\n')) {
  if (line.startsWith('SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1];
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) SUPABASE_SERVICE_ROLE_KEY = line.split('=')[1];
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: profiles } = await admin.from('profiles').select('id');
  console.log(`Found ${profiles.length} profiles.`);
  
  const start = Date.now();
  const promises = profiles.map(async p => {
    const p1 = admin.from('results').select('*', { count: 'exact', head: true }).eq('user_id', p.id);
    const p2 = admin.from('mastered').select('*', { count: 'exact', head: true }).eq('user_id', p.id);
    const [r, m] = await Promise.all([p1, p2]);
    return { id: p.id, tests: r.count, points: m.count };
  });
  const results = await Promise.all(promises);
  const end = Date.now();
  
  console.log(`Fetched counts in ${end - start}ms`);
  console.log(results.slice(0, 3));
}
run();
