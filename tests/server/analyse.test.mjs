import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler, {nettoyer} from '../../api/analyse.mjs';
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this},send(b){this.body=b;return this}});
const call=async(over={})=>{const res=response();await handler({method:'POST',headers:{origin:'https://app.example',host:'app.example','x-forwarded-for':over.ip||'1.1.1.1'},body:{texte:'Nous nous marions en juin, sans budget, 80 invités'},...over},res);return res;};
test('analyse : fermée sans clé, origine contrôlée, réponse nettoyée',async()=>{
 const original=globalThis.fetch,oldKey=process.env.ANTHROPIC_API_KEY,oldOrig=process.env.ANALYSE_ALLOWED_ORIGINS;
 try{
  delete process.env.ANTHROPIC_API_KEY;
  const g=response();await handler({method:'GET',headers:{}},g);assert.deepEqual(g.body,{ready:false});
  assert.equal((await call()).code,503);
  process.env.ANTHROPIC_API_KEY='test-only-key';
  assert.equal((await call({headers:{origin:'https://ailleurs.example',host:'app.example'}})).code,403);
  process.env.ANALYSE_ALLOWED_ORIGINS='*.claudeusercontent.com';
  globalThis.fetch=async(url,opts)=>{
   assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(opts.headers['x-api-key'],'test-only-key');
   const body=JSON.parse(opts.body);assert.equal(body.tool_choice.name,'allumer_la_grille');assert.match(body.system,/placement · Placement/);
   return new Response(JSON.stringify({content:[{type:'tool_use',name:'allumer_la_grille',input:{domaine:'union',sujet:null,certitude:0.9,resume:'Un mariage en juin.',chemin:[{id:'intention',raison:'Nous nous marions'},{id:'personnes',raison:'80 invités'},{id:'inconnue',raison:'x'},{id:'personnes',raison:'doublon'}],ecartees:[{id:'budget',citation:'sans budget'}],entites:{dates:['juin'],montants:[],personnes:[80],lieux:[]}}}]}),{status:200});
  };
  const ok=await call({headers:{origin:'https://abc.claudeusercontent.com',host:'app.example','x-forwarded-for':'2.2.2.2'}});
  assert.equal(ok.code,200);assert.equal(ok.headers['Access-Control-Allow-Origin'],'https://abc.claudeusercontent.com');
  assert.deepEqual(ok.body.chemin,['intention','personnes']);assert.equal(ok.body.studio,'AIME Wedding');
  {const t='Nous nous marions en juin, sans budget, 80 invités',i=t.indexOf('80 invités');assert.deepEqual(ok.body.raisons.personnes[0],{q:'80 invités',s:i,e:i+10});}
  assert.equal(ok.body.ecartees.budget,'sans budget');assert.deepEqual(ok.body.entites.personnes,[{v:80}]);
  globalThis.fetch=async()=>new Response('{}',{status:529});
  assert.equal((await call({ip:'3.3.3.3'})).code,502);
  assert.equal((await call({ip:'4.4.4.4',body:{texte:'x'.repeat(9000)}})).code,400);
  assert.equal((await call({ip:'4.4.4.4',body:{texte:'',fichier:{type:'text/html',data:'AAAA'}}})).code,400);
  for(let i=0;i<20;i++)await call({ip:'9.9.9.9'});
  assert.equal((await call({ip:'9.9.9.9'})).code,429);
 }finally{globalThis.fetch=original;for(const [k,v] of [['ANTHROPIC_API_KEY',oldKey],['ANALYSE_ALLOWED_ORIGINS',oldOrig]]){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
test('nettoyer : domaine inconnu devient projet, sujet identique ignoré',()=>{
 const r=nettoyer({domaine:'??',sujet:'projet',certitude:7,chemin:[],ecartees:[],entites:{}},'');
 assert.equal(r.domaine,'projet');assert.equal(r.sujet,null);assert.equal(r.certitude,1);
});
