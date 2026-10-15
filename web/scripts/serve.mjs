import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

function insideRoot(path) {
  const offset = relative(ROOT, path);
  return offset !== '..' && !offset.startsWith(`..${sep}`) && !isAbsolute(offset);
}

export function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
        return;
      }
      let pathname;
      try { pathname = decodeURIComponent(request.url.split('?')[0]).replaceAll('\\', '/'); }
      catch { response.writeHead(400).end('Bad request'); return; }
      if (!pathname.startsWith('/') || pathname.includes('\0')) { response.writeHead(400).end('Bad request'); return; }
      const candidate = resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!insideRoot(candidate)) { response.writeHead(403).end('Forbidden'); return; }
      const target = await realpath(candidate);
      if (!insideRoot(target)) { response.writeHead(403).end('Forbidden'); return; }
      if (!(await stat(target)).isFile()) { response.writeHead(404).end('Not found'); return; }
      const content = await readFile(target);
      response.writeHead(200, {
        'Content-Type': `${TYPES[extname(target)] ?? 'application/octet-stream'}; charset=utf-8`,
        'Content-Length': content.length,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      response.writeHead(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500).end('Not found');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createStaticServer();
  server.on('error', (error) => { console.error(`${error.code}: 정적 서버를 시작하지 못했어요.`); process.exitCode = 1; });
  server.listen(Number(process.env.PORT ?? 5173), '127.0.0.1', () => {
    console.log(`가자함 미리보기: http://localhost:${server.address().port}/#/catalog`);
  });
}
