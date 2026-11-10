import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = new Map([['/', ['index.html','text/html']], ['/style.css',['style.css','text/css']], ['/config.mjs',['config.mjs','text/javascript']], ['/delete-account.mjs',['delete-account.mjs','text/javascript']]]);
const server = http.createServer(async (req,res) => {
  const file = files.get(new URL(req.url, 'http://127.0.0.1').pathname);
  if (!file || req.method !== 'GET') { res.writeHead(404); res.end(); return; }
  try { const bytes = await readFile(new URL(file[0], import.meta.url)); res.writeHead(200, {'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}); res.end(bytes); }
  catch { res.writeHead(500); res.end(); }
});
server.listen(5180, '127.0.0.1', () => console.log('Account deletion preview on http://127.0.0.1:5180'));
