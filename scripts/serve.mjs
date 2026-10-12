import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root=resolve(new URL('../dist/',import.meta.url).pathname);
const port=Number(process.env.PORT || 4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.csv':'text/csv; charset=utf-8'};
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    let file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if (file!==root && !file.startsWith(root+sep)) {res.writeHead(403);res.end();return;}
    if ((await stat(file)).isDirectory()) file=resolve(file,'index.html');
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  } catch {res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(resolve(root,'404.html')));}
}).listen(port,'127.0.0.1',()=>console.log(`本地预览：http://127.0.0.1:${port}`));
