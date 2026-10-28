import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/pattern-generate.mjs';
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this},send(b){this.body=b;return this}});
test('generation fails closed, authenticates, checks provider status and image bytes',async()=>{
 const original=globalThis.fetch;
 const originalNow=Date.now;let tick=100000;Date.now=()=>tick+=11000;
 const oldEnv=process.env.VERCEL_ENV;delete process.env.VERCEL_ENV;
 const oldKey=process.env.POINTZERO_IMAGE_API_KEY,oldCode=process.env.POINTZERO_GENERATION_ACCESS_CODE;
 const call=async(overrides={})=>{const res=response();await handler({method:'POST',headers:{origin:'https://app.example',host:'app.example','x-generation-code':'test-only-code'},body:{prompt:'Deux chats dans un jardin',width:1024,height:1024,seed:42},...overrides},res);return res};
 try{
 delete process.env.POINTZERO_IMAGE_API_KEY;delete process.env.POINTZERO_GENERATION_ACCESS_CODE;
 assert.equal((await call()).code,503);
 process.env.POINTZERO_IMAGE_API_KEY='test-only-key';process.env.POINTZERO_GENERATION_ACCESS_CODE='test-only-code';
 assert.equal((await call({headers:{}})).code,403);
 assert.equal((await call({headers:{origin:'https://app.example',host:'app.example'}})).code,401);
 assert.equal((await call({body:{prompt:'x'}})).code,400);
 globalThis.fetch=async(url,opts)=>{assert.equal(url.hostname,'gen.pollinations.ai');assert.equal(opts.headers.Authorization,'Bearer test-only-key');return new Response('denied',{status:402})};
 assert.equal((await call()).code,502);
 globalThis.fetch=async()=>new Response('not an image',{headers:{'content-type':'image/png'}});
 assert.equal((await call()).code,502);
 globalThis.fetch=async()=>new Response(new Uint8Array([137,80,78,71,13,10,26,10,0]),{headers:{'content-type':'image/png'}});
 const ok=await call();assert.equal(ok.code,200);assert.equal(ok.headers['Content-Type'],'image/png');
 Date.now=()=>tick;assert.equal((await call()).code,429);
 Date.now=()=>tick+=11000;
 let release;globalThis.fetch=()=>new Promise(resolve=>{release=resolve});
 const pending=call();
 assert.equal((await call()).code,429);
 release(new Response(new Uint8Array([137,80,78,71,13,10,26,10,0]),{headers:{'content-type':'image/png'}}));
 assert.equal((await pending).code,200);
 const env=process.env.VERCEL_ENV;process.env.VERCEL_ENV='production';
 assert.equal((await call()).code,503);
 if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env;
 }finally{if(oldEnv===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=oldEnv;Date.now=originalNow;globalThis.fetch=original;for(const [k,v] of [['POINTZERO_IMAGE_API_KEY',oldKey],['POINTZERO_GENERATION_ACCESS_CODE',oldCode]]){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
