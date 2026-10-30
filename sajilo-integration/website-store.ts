import {createHash} from 'node:crypto';
import {publicMenu,prepareWebsiteOrder,WebsiteOrderError} from './website-orders.ts';
export {WebsiteOrderError};
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const check=(value:unknown,message:string,status=400)=>{if(!value)throw new WebsiteOrderError(status,message)};
export const WEBSITE_SCHEMA="CREATE TABLE IF NOT EXISTS website_orders(id TEXT PRIMARY KEY,request_hash TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','ready','completed','rejected')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL)";
const version=(db:D1Database,date:string)=>db.prepare('UPDATE state_versions SET version=version+1,updated_at=? WHERE id=1').bind(date);
export async function websitePublic(request:Request,db:D1Database,storage:DurableObjectStorage,state:any,payload:any){
 const path=new URL(request.url).pathname;
 if(path==='/api/public/menu'&&request.method==='GET')return publicMenu(state);
 check(path==='/api/public/orders'&&request.method==='POST','Not found.',404);
 await db.prepare(WEBSITE_SCHEMA).run();
 const key=typeof payload.requestId==='string'?payload.requestId:'',fingerprint=hash(JSON.stringify(payload));
 const prior=await db.prepare('SELECT request_hash,body FROM website_orders WHERE id=?').bind(key).first<any>();
 if(prior){check(prior.request_hash===fingerprint,'This request ID was already used for a different order.',409);const saved=JSON.parse(prior.body);return {id:saved.requestId,total:saved.total,status:'received'}}
 const window=Math.floor(Date.now()/900000),rateKey='website:'+hash(request.headers.get('CF-Connecting-IP')||'unknown');
 const rate=await storage.get<{window:number;count:number}>(rateKey);
 check(!rate||rate.window!==window||rate.count<5,'Too many order requests. Please wait or call the café.',429);
 const order=prepareWebsiteOrder(payload,state),created=new Date().toISOString();
 await storage.put(rateKey,{window,count:rate?.window===window?rate.count+1:1});
 await db.batch([db.prepare("INSERT INTO website_orders(id,request_hash,body,status,created_at,updated_at) VALUES(?,?,?,'pending',?,?)").bind(order.requestId,fingerprint,JSON.stringify(order),created,created),version(db,created)]);
 return {id:order.requestId,total:order.total,status:'received'};
}
export async function websiteInbox(db:D1Database,user:any,payload?:any){
 check(user?.role==='manager','Manager access required.',403);
 check(!user.mustChangePassword,'Change your manager password before continuing.',403);
 await db.prepare(WEBSITE_SCHEMA).run();
 if(payload){
  check(typeof payload.id==='string'&&/^[a-f0-9]{32}$/.test(payload.id),'Invalid order ID.');
  const row=await db.prepare('SELECT status FROM website_orders WHERE id=?').bind(payload.id).first<{status:string}>();
  check(row,'Order not found.',404);
  const transitions:Record<string,string[]>={pending:['confirmed','rejected'],confirmed:['ready','rejected'],ready:['completed'],completed:[],rejected:[]};
  if(row!.status!==payload.status){
   check(transitions[row!.status]?.includes(payload.status),'Order status changed. Refresh and try again.',409);
   const updated=new Date().toISOString();
   await db.batch([
    db.prepare('UPDATE website_orders SET status=?,updated_at=? WHERE id=? AND status=?').bind(payload.status,updated,payload.id,row!.status),version(db,updated),
    db.prepare('INSERT INTO audit_events(id,created_at,actor_staff_id,actor_username,actor_role,action,entity_type,entity_id,before_value,after_value) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID().replaceAll('-',''),updated,user.id,user.username,user.role,'website.status','website_order',payload.id,row!.status,payload.status)
   ]);
  }
 }
 const records=await db.prepare('SELECT body,status,created_at,updated_at FROM website_orders ORDER BY created_at DESC LIMIT 200').all<any>();
 return {records:records.results.map(row=>({...JSON.parse(row.body),status:row.status,createdAt:row.created_at,updatedAt:row.updated_at}))};
}
