from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, argparse
parser=argparse.ArgumentParser(description="Local-only 10-second performance probe; never deploy this server.")
parser.add_argument("--baseline",type=Path,required=True)
parser.add_argument("--port",type=int,default=8766)
args=parser.parse_args()
baseline=args.baseline.resolve()
os.chdir(Path(__file__).resolve().parents[1])
probe='''<script>
(() => {
const result={lcp:0,cls:0,longTasks:0,blockingMs:0,rafCallbacks:0,rafWorkMs:0};
const raf=window.requestAnimationFrame;
window.requestAnimationFrame=cb=>raf.call(window,t=>{const s=performance.now();cb(t);result.rafCallbacks++;result.rafWorkMs+=performance.now()-s;});
for(const type of ['largest-contentful-paint','layout-shift','longtask']) {
try { new PerformanceObserver(list=>list.getEntries().forEach(e=>{
if(type==='largest-contentful-paint') result.lcp=e.startTime;
if(type==='layout-shift'&&!e.hadRecentInput) result.cls+=e.value;
if(type==='longtask'){result.longTasks++;result.blockingMs+=Math.max(0,e.duration-50);}
})).observe({type,buffered:true}); }catch(e){}
}
setTimeout(()=>{
const n=performance.getEntriesByType('navigation')[0];
const r=performance.getEntriesByType('resource');
Object.assign(result,{fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,resourceCount:r.length,resourceBytes:r.reduce((s,e)=>s+e.encodedBodySize,0),width:innerWidth,height:innerHeight,windowMs:10000});
const out=document.createElement('output');out.id='performance-result';out.hidden=true;out.textContent=JSON.stringify(result);document.body.append(out);
},10000);
})();</script>'''
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?')[0]
  before=path.startswith('/before/')
  if before: path=path[len('/before'):]
  root=baseline if before else Path.cwd()
  target=root/path.lstrip('/')
  if target.is_dir():target=target/'index.html'
  if not target.exists() and not target.suffix: target=target.with_suffix('.html')
  if target.exists() and target.suffix=='.html':
   body=target.read_text().replace('<head>','<head>'+probe)
   if before:
    body=body.replace('href="/','href="/before/').replace('src="/','src="/before/')
   body=body.encode();self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  elif before:
   self.path=path
   old=self.directory;self.directory=str(root)
   super().do_GET();self.directory=old
  else:super().do_GET()
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
