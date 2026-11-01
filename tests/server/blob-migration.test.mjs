// Migration Blob : vrais SDK des deux installations, HTTP simulé, réseau interdit.
// Aucun credential du projet ni base. Ce contrat ne prouve pas la persistance du service distant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { traiter as projets } from '../../api/projets.mjs';
import { traiter as contenus } from '../../api/contenus.mjs';
import musique from '../../api/musique.mjs';

const root = new URL('../../', import.meta.url);
const json = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const synthetic = () => ['vercel', 'blob', 'rw', 'recette', randomBytes(24).toString('hex')].join('_');
const metadata = pathname => ({ url: 'https://recette.public.blob.vercel-storage.com/' + pathname, downloadUrl: 'https://recette.public.blob.vercel-storage.com/' + pathname + '?download=1', pathname, contentType: 'image/png', contentDisposition: 'attachment', size: 3, uploadedAt: '2026-11-01T00:00:00Z', etag: '"recette"', cacheControl: 'public, max-age=60' });
function env(values) {
  const before = Object.fromEntries(Object.keys(values).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(values)) v === undefined ? delete process.env[k] : process.env[k] = v;
  return () => { for (const [k, v] of Object.entries(before)) v === undefined ? delete process.env[k] : process.env[k] = v; };
}
function response() { return { statusCode: 200, setHeader() {}, end(s) { this.body = JSON.parse(s); } }; }
function request(path, body) { return { method: 'POST', url: path, body, headers: { host: 'preview.example.invalid', origin: 'https://preview.example.invalid', 'content-type': 'application/json' } }; }

for (const prefix of ['', 'studio/']) {
  const require = createRequire(new URL(prefix + 'package.json', root));
  const sdk = await import(pathToFileURL(require.resolve('@vercel/blob')));
  const client = await import(pathToFileURL(require.resolve('@vercel/blob/client')));
  const { MockAgent, setGlobalDispatcher, getGlobalDispatcher, fetch } = await import(pathToFileURL(require.resolve('undici')));
  const label = prefix || 'site';

  test(`Blob ${label} : versions épinglées, transitive corrigée, pas de chaîne Busboy/OIDC`, () => {
    const pkg = json(prefix + 'package.json'), lock = json(prefix + 'package-lock.json');
    assert.equal(pkg.dependencies['@vercel/blob'], '2.4.0');
    assert.equal(pkg.overrides['@vercel/blob'].undici, '6.29.1');
    assert.equal(lock.packages['node_modules/@vercel/blob'].version, '2.4.0');
    assert.equal(lock.packages['node_modules/undici'].version, '6.29.1');
    for (const name of ['@fastify/busboy', '@vercel/oidc', '@vercel/cli-config'])
      assert.ok(!Object.keys(lock.packages).some(p => p.endsWith('node_modules/' + name)), name);
  });

  test(`Blob ${label} : upload, lecture, pagination, suppressions et chemins spéciaux (transport simulé)`, async () => {
    const agent = new MockAgent(), previous = getGlobalDispatcher(); agent.disableNetConnect(); setGlobalDispatcher(agent);
    const restore = env({ VERCEL_BLOB_RETRIES: '0', VERCEL_BLOB_API_URL: undefined, NEXT_PUBLIC_VERCEL_BLOB_API_URL: undefined, VERCEL_BLOB_API_VERSION_OVERRIDE: undefined, NEXT_PUBLIC_VERCEL_BLOB_API_VERSION_OVERRIDE: undefined });
    const token = synthetic(), api = agent.get('https://vercel.com');
    try {
      // Les noms spéciaux sont des paramètres encodés, pas un chemin de requête normalisé.
      // API 12 : le comportement de stockage réel des segments . / .. reste à vérifier en recette isolée.
      for (const pathname of ['projets/recette/image.png', 'projets/recette/été #1+%.png', 'contenus/dossier/./image.png', 'musique/recette/../nom.mp3']) {
        api.intercept({ path: '/api/blob/?pathname=' + encodeURIComponent(pathname), method: 'PUT' }).reply(200, metadata(pathname));
        const result = await sdk.put(pathname, 'abc', { token, access: 'public', addRandomSuffix: true });
        assert.equal(result.pathname, pathname);
      }
      const path = 'projets/recette/image.png', meta = metadata(path);
      const generated = await client.handleUpload({ token, request: request('/api/projets?envoi=1'), body: { type: 'blob.generate-client-token', payload: { pathname: path, clientPayload: null, multipart: false } }, onBeforeGenerateToken: async () => ({ allowedContentTypes: ['image/png'], maximumSizeInBytes: 3, addRandomSuffix: true }) });
      agent.get('https://preview.example.invalid').intercept({ path: '/api/projets?envoi=1', method: 'POST' }).reply(200, generated);
      api.intercept({ path: '/api/blob/?pathname=' + encodeURIComponent(path), method: 'PUT' }).reply(200, meta);
      const uploaded = await client.upload(path, new Blob(['abc'], { type: 'image/png' }), { access: 'public', handleUploadUrl: 'https://preview.example.invalid/api/projets?envoi=1' });
      assert.equal(uploaded.url, meta.url);
      api.intercept({ path: '/api/blob?url=' + encodeURIComponent(meta.url), method: 'GET' }).reply(200, meta);
      assert.equal((await sdk.head(meta.url, { token })).size, 3);
      agent.get('https://recette.public.blob.vercel-storage.com').intercept({ path: '/' + path, method: 'GET' }).reply(200, 'abc');
      assert.equal(await (await fetch(meta.url)).text(), 'abc');
      api.intercept({ path: '/api/blob?limit=1000&prefix=projets%2Frecette%2F', method: 'GET' }).reply(200, { blobs: [meta], hasMore: true, cursor: 'suite' });
      const first = await sdk.list({ token, prefix: 'projets/recette/', limit: 1000 });
      assert.equal(first.cursor, 'suite'); assert.equal(first.blobs[0].url, meta.url);
      api.intercept({ path: '/api/blob?limit=1000&prefix=projets%2Frecette%2F&cursor=suite', method: 'GET' }).reply(200, { blobs: [], hasMore: false });
      assert.equal((await sdk.list({ token, prefix: 'projets/recette/', limit: 1000, cursor: first.cursor })).hasMore, false);
      for (const urls of [[meta.url], [meta.url, meta.url + '-autre'], [meta.url + '-absent']]) {
        api.intercept({ path: '/api/blob/delete', method: 'POST', body: JSON.stringify({ urls }) }).reply(200, {});
        await sdk.del(urls.length === 1 ? urls[0] : urls, { token });
      }
      // Les refus du service sont propagés, sans succès fictif ni nouvelle tentative infinie.
      for (const [code, message] of [['file_too_large', 'File too large'], ['invalid_content_type', 'Content type rejected']]) {
        api.intercept({ path: '/api/blob/?pathname=' + encodeURIComponent(path), method: 'PUT' })
          .reply(400, { error: { code, message } });
        await assert.rejects(sdk.put(path, 'abc', { token, access: 'public' }));
      }
      api.intercept({ path: '/api/blob/delete', method: 'POST' }).reply(500, { error: { code: 'unknown_error', message: 'Simulated failure' } });
      await assert.rejects(sdk.del(meta.url, { token }));
      // Le navigateur ne peut pas modifier les options réservées à la signature serveur.
      await assert.rejects(client.upload(path, new Blob(['abc']), { access: 'public', handleUploadUrl: 'https://preview.example.invalid/api/projets', addRandomSuffix: false }));
      await assert.rejects(sdk.put('', 'abc', { token, access: 'public' }));
      await assert.rejects(sdk.put('a'.repeat(2000), 'abc', { token, access: 'public' }));
      // Les suppressions conditionnelles ne doivent pas devenir une suppression multiple accidentelle.
      await assert.rejects(sdk.del([meta.url, meta.url + '-autre'], { token, ifMatch: '"recette"' }));
      await assert.rejects(sdk.put(path, 'abc', { token, access: 'invalide' }));
      agent.assertNoPendingInterceptors();
    } finally { restore(); setGlobalDispatcher(previous); await agent.close(); }
  });

  test(`Blob ${label} : limites de jeton, callback signé/falsifié, origine callback Preview`, async () => {
    const token = synthetic(), path = 'projets/recette/image.png';
    const restore = env({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'preview.example.invalid', VERCEL_BLOB_CALLBACK_URL: undefined });
    try {
      const options = { token, request: request('/api/projets?envoi=1'), body: { type: 'blob.generate-client-token', payload: { pathname: path, clientPayload: null, multipart: false } }, onBeforeGenerateToken: async pathname => {
        if (!/^projets\/[a-z0-9-]{1,60}\/[^/]{1,120}$/.test(pathname)) throw new Error('chemin');
        return { allowedContentTypes: ['image/png'], maximumSizeInBytes: 8388608, addRandomSuffix: true };
      }, onUploadCompleted: async () => {} };
      const generated = await client.handleUpload(options), payload = client.getPayloadFromClientToken(generated.clientToken);
      assert.equal(payload.pathname, path); assert.deepEqual(payload.allowedContentTypes, ['image/png']);
      assert.equal(payload.maximumSizeInBytes, 8388608); assert.equal(payload.addRandomSuffix, true);
      assert.equal(payload.onUploadCompleted.callbackUrl, 'https://preview.example.invalid/api/projets?envoi=1');
      await assert.rejects(client.handleUpload({ ...options, body: { ...options.body, payload: { pathname: 'projets/../hors/image.png' } } }));
      const event = { type: 'blob.upload-completed', payload: { blob: metadata(path), tokenPayload: null } };
      const signature = createHmac('sha256', token).update(JSON.stringify(event)).digest('hex');
      let completed = 0;
      await client.handleUpload({ ...options, body: event, request: { ...options.request, headers: { 'x-vercel-signature': signature } }, onUploadCompleted: async () => { completed++; } });
      assert.equal(completed, 1);
      await assert.rejects(client.handleUpload({ ...options, body: event, request: { ...options.request, headers: { 'x-vercel-signature': '00'.repeat(32) } } }));
      await assert.rejects(client.handleUpload({ ...options, body: { ...event, payload: { ...event.payload, tokenPayload: 'alteration' } }, request: { ...options.request, headers: { 'x-vercel-signature': signature } } }));
    } finally { restore(); }
  });
}

test('Blob migration : règles des vrais handlers projets/contenus conservées avec handleUpload 2.4', async () => {
  const { handleUpload, getPayloadFromClientToken } = await import('@vercel/blob/client');
  const restore = env({ BLOB_READ_WRITE_TOKEN: synthetic(), VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'preview.example.invalid', VERCEL_BLOB_CALLBACK_URL: undefined });
  const moi = async () => ({ id: 'recette', email: 'recette@example.invalid' });
  const call = async (handler, path, pathname, extra = {}) => {
    const res = response();
    await handler(request(path, { type: 'blob.generate-client-token', payload: { pathname, clientPayload: null, multipart: false } }), res,
      { db: null, depot: null, moi, admins: 'recette@example.invalid', envoi: handleUpload, ...extra });
    return res;
  };
  try {
    const image = await call(projets, '/api/projets?envoi=1', 'projets/recette/été #1.png');
    assert.equal(image.statusCode, 200);
    const p = getPayloadFromClientToken(image.body.clientToken);
    assert.equal(p.maximumSizeInBytes, 8 * 1024 * 1024); assert.ok(p.allowedContentTypes.includes('image/png')); assert.equal(p.addRandomSuffix, true);
    for (const path of ['autre/image.png', 'projets/../recette/image.png', 'projets/recette/sous/image.png'])
      assert.equal((await call(projets, '/api/projets?envoi=1', path)).statusCode, 400);
    const media = await call(contenus, '/api/contenus?envoi=1', 'contenus/recette/image.png');
    assert.equal(media.statusCode, 200);
    const m = getPayloadFromClientToken(media.body.clientToken);
    assert.equal(m.maximumSizeInBytes, 100 * 1024 * 1024); assert.ok(m.allowedContentTypes.includes('video/mp4'));
    for (const path of ['contenus/../image.png', 'contenus/%2e%2e/image.png', 'projets/recette/image.png'])
      assert.equal((await call(contenus, '/api/contenus?envoi=1', path)).statusCode, 400);
    assert.equal((await call(projets, '/api/projets?envoi=1', 'projets/recette/image.png', { moi: async () => null })).statusCode, 401);
    assert.equal((await call(projets, '/api/projets?envoi=1', 'projets/recette/image.png', { moi: async () => ({ email: 'autre@example.invalid' }) })).statusCode, 403);
    delete process.env.BLOB_READ_WRITE_TOKEN;
    assert.equal((await call(projets, '/api/projets?envoi=1', 'projets/recette/image.png')).statusCode, 503);
  } finally { restore(); }
});


test('Blob migration : callbacks des vrais endpoints projets/contenus/musique (aucune base)', async () => {
  const token = synthetic(), restore = env({ BLOB_READ_WRITE_TOKEN: token });
  const event = { type: 'blob.upload-completed', payload: { blob: metadata('projets/recette/image.png'), tokenPayload: null } };
  const signature = createHmac('sha256', token).update(JSON.stringify(event)).digest('hex');
  const { handleUpload } = await import('@vercel/blob/client');
  try {
    for (const [handler, path, deps] of [
      [projets, '/api/projets?envoi=1', { db: null, moi: async () => null, admins: '', envoi: handleUpload }],
      [contenus, '/api/contenus?envoi=1', { depot: null, moi: async () => null, admins: '', envoi: handleUpload }],
      [musique, '/api/musique?envoi=1', undefined],
    ]) {
      for (const [sig, expected] of [[signature, 200], ['00'.repeat(32), 400]]) {
        const req = request(path, event), res = response(); req.headers['x-vercel-signature'] = sig;
        await handler(req, res, deps); assert.equal(res.statusCode, expected, path);
      }
    }
  } finally { restore(); }
});
