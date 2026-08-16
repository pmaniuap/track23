const url = 'https://ofhnqfqfxcjbghmdlwey.supabase.co/rest/v1/market_signals?select=*&order=published_at.desc';
const options = {
  headers: {
    'apikey': 'sb_publishable_fdJYCU341J4Le6sq3IW8Pw_f1XdgvhN',
    'Authorization': 'Bearer sb_publishable_fdJYCU341J4Le6sq3IW8Pw_f1XdgvhN'
  }
};
fetch(url, options)
  .then(res => res.json())
  .then(data => console.log('Data length:', data.length, data[0]?.raw_title))
  .catch(err => console.error(err));
