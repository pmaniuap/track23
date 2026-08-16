const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ofhnqfqfxcjbghmdlwey.supabase.co';
const supabaseAnonKey = 'sb_publishable_fdJYCU341J4Le6sq3IW8Pw_f1XdgvhN';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
async function test() {
  const { data, error } = await supabase.from('market_signals').select('*').order('published_at', { ascending: false }).limit(2);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
