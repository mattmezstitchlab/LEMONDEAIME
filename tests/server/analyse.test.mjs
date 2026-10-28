import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler, {nettoyer} from '../../api/analyse.mjs';
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this},send(b){this.body=b;return this}});
const call=async(over={})=>{const res=response();await handler({method:'POST',headers:{origin:'https://app.example',host:'app.example','content-type':'application/json','x-forwarded-for':over.ip||'1.1.1.1'},body:{texte:'Nous nous marions en juin, sans budget, 80 invités'},...over},res);return res;};
test('analyse : la garde commune d’abord (même site, JSON), puis fermée sans clé ni comptes ; jamais la clé dans une réponse',async()=>{
 const oldKey=process.env.ANTHROPIC_API_KEY,oldDb=process.env.DATABASE_URL;
 const original=globalThis.fetch;let appels=0;globalThis.fetch=async()=>{appels++;return new Response('{}')};
 try{
  delete process.env.DATABASE_URL;
  delete process.env.ANTHROPIC_API_KEY;
  const g=response();await handler({method:'GET',headers:{}},g);assert.deepEqual(g.body,{ready:false,compte:true});
  const site={origin:'https://app.example',host:'app.example','content-type':'application/json'};
  assert.equal((await call({headers:site})).code,503);
  process.env.ANTHROPIC_API_KEY='test-only-key';
  const autre=await call({headers:{...site,origin:'https://ailleurs.example'}});
  assert.equal(autre.code,403);assert.equal(autre.body.code,'origine');
  assert.equal((await call({headers:{...site,origin:undefined}})).code,403,'sans en-tête Origin : refusé (un curl ne passe plus)');
  assert.equal((await call({headers:{...site,'content-type':'text/plain'}})).code,415);
  const sansComptes=await call({headers:site});
  assert.equal(sansComptes.code,503,'sans base de comptes, personne n’est connecté : rien n’est dépensé');
  assert.equal(appels,0,'aucun appel à Claude');
  for(const r of [g,autre,sansComptes])assert.ok(!JSON.stringify(r.body).includes('test-only-key'));
 }finally{globalThis.fetch=original;for(const [k,v] of [['ANTHROPIC_API_KEY',oldKey],['DATABASE_URL',oldDb]]){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
test('nettoyer : domaine inconnu devient projet, sujet identique ignoré',()=>{
 const r=nettoyer({domaine:'??',sujet:'projet',certitude:7,chemin:[],ecartees:[],entites:{}},'');
 assert.equal(r.domaine,'projet');assert.equal(r.sujet,null);assert.equal(r.certitude,1);
});
