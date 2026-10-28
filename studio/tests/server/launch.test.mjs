import {test} from 'node:test';
import assert from 'node:assert/strict';
import launch from '../../api/pointzero-launch.mjs';
import helper from '../../api/_launch-utils.mjs';
import scan from '../../api/metamorphose-scan.mjs';
function response(){return {headers:{},code:200,body:null,setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(body){this.body=body;return this},end(){return this}}}
// No live credentials or external network required or used by these scenarios.
for(const key of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','POINTZERO_SCAN_ACCESS_CODE','POINTZERO_LAUNCH_ADMIN_SECRET'])delete process.env[key];
test('GET without configuration returns disabled services, not HTTP 500',async()=>{
 const res=response();await launch({method:'GET',headers:{},query:{}},res);
 assert.equal(res.code,200);assert.equal(res.body.signupReady,false);assert.equal(res.body.config,null);assert.match(res.headers['Cache-Control'],/no-store/);
});
test('admin read and mutation fail closed without credentials',async()=>{
 for(const req of [{method:'GET',query:{admin:'1'}},{method:'POST',body:{action:'admin-publish',config:{}}}]){
  const res=response();await launch({...req,headers:{}},res);assert.equal(res.code,401);
 }
});
test('cross origin denied and unsupported methods rejected',async()=>{
 const res=response();await launch({method:'GET',headers:{origin:'https://other.example',host:'app.example'}},res);assert.equal(res.code,403);
 const unsupported=response();await launch({method:'DELETE',headers:{}},unsupported);assert.equal(unsupported.code,405);
});
test('signup and scan remain disabled rather than invoking services',async()=>{
 const res=response();await launch({method:'POST',headers:{},body:{action:'subscribe'}},res);assert.equal(res.code,503);
 const scanning=response();await scan({method:'POST',headers:{}},scanning);assert.equal(scanning.code,503);
});
test('shared helper route is not exposed',()=>{const res=response();helper({},res);assert.equal(res.code,404)});
