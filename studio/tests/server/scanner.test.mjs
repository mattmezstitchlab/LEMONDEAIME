import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import handler from '../../api/metamorphose-scan.mjs';
const response=()=>({code:200,setHeader(){},status(c){this.code=c;return this},json(b){this.body=b;return this}});
test('scanner authenticates, limits destinations and parses real static HTML through mocked transport',async()=>{
 const gate=crypto.randomBytes(32).toString('hex');process.env.POINTZERO_SCAN_ACCESS_CODE=gate;process.env.POINTZERO_SCAN_ALLOWED_HOSTS='owned.example';
 const originalLookup=dns.lookup,originalRequest=https.request,originalNow=Date.now;let tick=100000;
 Date.now=()=>tick+=11000;
 const call=async(body,headers={})=>{const r=response();await handler({method:'POST',headers,body},r);return r};
 try{
 assert.equal((await call({url:'https://owned.example',authorized:true})).code,401);
 const headers={'x-pointzero-scan-code':gate};
 assert.equal((await call({url:'https://owned.example',authorized:false},headers)).code,400);
 assert.equal((await call({url:'https://other.example',authorized:true},headers)).code,400);
 dns.lookup=async()=>[{address:'127.0.0.1',family:4}];
 assert.equal((await call({url:'https://owned.example',authorized:true},headers)).code,400);
 dns.lookup=async()=>[{address:'93.184.216.34',family:4}];
 https.request=(_url,options,callback)=>{assert.equal(options.headers['Accept-Encoding'],'identity');const req=new EventEmitter();req.end=()=>{
  const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/html'};callback(res);
  res.emit('data',Buffer.from('<html lang="fr"><title>Site autorisé</title><h1>Notre mariage</h1><h2>Programme</h2></html>'));res.emit('end');
 };req.destroy=e=>req.emit('error',e);return req};
 const ok=await call({url:'https://owned.example',authorized:true},headers);assert.equal(ok.code,200);assert.equal(ok.body.title,'Site autorisé');assert.equal(ok.body.fragments.length,3);
 Date.now=()=>tick;assert.equal((await call({url:'https://owned.example',authorized:true},headers)).code,429);Date.now=()=>tick+=11000;
 https.request=(_u,_o,cb)=>{const req=new EventEmitter();req.end=()=>{const res=new EventEmitter();res.statusCode=302;res.headers={location:'https://internal.example'};res.resume=()=>{};cb(res)};return req};
 assert.equal((await call({url:'https://owned.example',authorized:true},headers)).code,400);
 assert.equal((await call({url:'https://owned.example',authorized:true},{...headers,origin:'https://other.example',host:'app.example'})).code,403);
 }finally{dns.lookup=originalLookup;https.request=originalRequest;Date.now=originalNow;delete process.env.POINTZERO_SCAN_ACCESS_CODE;delete process.env.POINTZERO_SCAN_ALLOWED_HOSTS;}
});
