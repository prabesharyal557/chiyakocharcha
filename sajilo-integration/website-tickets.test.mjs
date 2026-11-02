import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import {startNodeWorker} from '../integrations/sajilo-pos/scripts/test-worker-node.mjs';
import {chromium} from '../integrations/sajilo-pos/node_modules/@playwright/test/index.mjs';
const root=join(import.meta.dirname,'..','integrations','sajilo-current'),base='http://127.0.0.1:3147',origin='https://chiya-ko-charcha.onrender.com';
let stop,cookie;
const state={settings:{name:'Chiya ko Charcha',open:true,taxRate:13},tables:[{n:1,seats:4,status:'available'}],menu:[{id:'momo',name:'Chicken Momo',category:'Momo',price:200,cost:100,available:true,rank:1}],orders:[],sales:[],payments:[],staff:[{id:'manager1',name:'Manager',username:'manager',role:'manager',salary:0,active:true,joined:new Date().toISOString()}]};
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
async function request(path,payload,staff=false,restaurant='101'){
 const r=await fetch(base+'/api/'+path,{method:payload?'POST':'GET',headers:{'X-Sajilo-Restaurant':restaurant,...(staff?{Cookie:cookie}:{Origin:origin}),...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
before(async()=>{const salt=randomBytes(16).toString('hex'),hash=salt+':'+scryptSync('manager-test-password',salt,64).toString('hex');process.env.BUNDLE_WORKER_TEST='1';
 stop=await startNodeWorker(root,`INSERT INTO state(id,body) VALUES(1,${quote(JSON.stringify(state))}); INSERT INTO credentials(id,hash) VALUES('manager1',${quote(hash)});`);
});
after(async()=>{if(stop)await stop()});
test('current POS public menu, tenant boundary, private inbox and transitions',async()=>{
 let r=await request('public/menu');assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.items[0].cost,undefined);assert.equal(r.data.restaurant,'Chiya ko Charcha');
 assert.equal((await request('public/menu',undefined,false,'102')).status,404);
 const payload={requestId:'a'.repeat(32),name:'Guest',phone:'9800000000',mode:'pickup',items:[{id:'momo',qty:2}],expectedTotal:452};
 r=await request('public/orders',payload);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.total,452);
 assert.equal((await request('public/orders',payload)).status,200);
 assert.equal((await request('public/orders',{...payload,name:'Other'})).status,409);
 assert.equal((await request('website/orders')).status,401);
 r=await request('login',{restaurantCode:'101',username:'manager',password:'manager-test-password'},true);assert.equal(r.status,200,JSON.stringify(r.data));cookie=r.cookie;
 r=await request('website/orders',undefined,true);assert.equal(r.status,200);assert.equal(r.data.records.length,1);
 r=await request('website/status',{id:payload.requestId,status:'confirmed'},true);assert.equal(r.status,409);
 const current=await request('state',undefined,true);assert.equal(current.status,200,JSON.stringify(current.data));
 assert.equal(current.data.orders.length,1);assert.equal(current.data.orders[0].source,'Website');assert.equal(current.data.orders[0].customerName,'Guest');assert.equal(current.data.orders[0].paid,false);
 assert.equal(current.data.tables.find(t=>t.n===2).name,'Online Orders');assert.equal(current.data.tables.find(t=>t.n===1).status,'available');assert.equal(current.data.sales.length,0);
 const second=await request('public/orders',{...payload,requestId:'b'.repeat(32),name:'Second Guest'});assert.equal(second.status,200,JSON.stringify(second.data));
 const again=await request('state',undefined,true);assert.equal(again.data.orders.length,2);assert.ok(again.data.orders.every(o=>o.table===2));assert.equal(again.data.tables.length,2);
 assert.equal((await request('public/orders',{...payload,requestId:'c'.repeat(32),expectedTotal:1})).status,409);
 assert.equal((await request('public/orders',{...payload,requestId:'d'.repeat(32)},false,'102')).status,404);
 assert.equal((await request('action',{action:'table.delete',payload:{n:2}},true)).status,409);
 const active=await request('orders/active',undefined,true);assert.equal(active.status,200,JSON.stringify(active.data));assert.ok(JSON.stringify(active.data).includes('Website'));
 const advance=await request('action',{action:'order.advance',payload:{id:'offline-'+payload.requestId,status:'new'},mutationId:'e'.repeat(32)},true);assert.equal(advance.status,200,JSON.stringify(advance.data));
 const updated=await request('website/orders',undefined,true);assert.equal(updated.data.records.find(o=>o.name==='Guest').status,'ready');
 const finalState=await request('state',undefined,true);assert.equal(finalState.data.orders.length,2);assert.equal(finalState.data.sales.length,0);

 assert.equal((await request('website/status',{id:payload.requestId,status:'completed'},true)).status,409);
});
test('current bundle browser order, six viewport widths and safe lost-response retry',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(origin+'/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';return route.fulfill({body:readFileSync(join(import.meta.dirname,'..','dist',name)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html'})});
 let lose=true;
 await page.route('https://sajilo-restaurant.aryalprabesh300.workers.dev/api/public/**',async route=>{const r=await route.fetch({url:base+new URL(route.request().url()).pathname});if(route.request().method()==='POST'&&lose){lose=false;return route.abort()}return route.fulfill({response:r})});
 await page.goto(origin+'/menu.html');await page.locator('[data-pos-add]').first().waitFor();
 for(const width of [320,375,768,1024,1440,1920]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Menu '+width)}
 await page.locator('[data-pos-add]').first().click();await page.locator('#posBag a').click();
 await page.locator('#posName').fill('Browser Guest');await page.locator('#posPhone').fill('9800000000');
 for(const width of [320,375,768,1024,1440,1920]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Checkout '+width)}
 await page.locator('#posOrder [type=submit]').click();await page.getByRole('button',{name:'Retry order request →'}).click();await page.getByText('Request received',{exact:true}).waitFor();
 const inbox=await request('website/orders',undefined,true);assert.equal(inbox.data.records.filter(o=>o.name==='Browser Guest').length,1);const pos=await request('state',undefined,true);assert.equal(pos.data.orders.filter(o=>o.customerName==='Browser Guest').length,1);assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});

