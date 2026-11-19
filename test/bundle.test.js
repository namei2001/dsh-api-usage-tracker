import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

test('package.json is a complete DSH bundle manifest', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.name, '@local/api-usage-tracker')
  assert.equal(pkg.type, 'module')
  assert.equal(pkg.private, true)
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.equal(pkg.dsh.client.immediately, true)
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-layout'))
  for (const f of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'locale/*.json']) {
    assert.ok(pkg.files.includes(f), `package.json files[] missing ${f}`)
  }
  assert.equal(pkg.exports['./locale/*.json'], './locale/*.json')
  assert.equal(pkg.exports['./icon'], './icon.svg')
})

test('cordis.patch.yml inserts the bundle', () => {
  const patch = read('cordis.patch.yml')
  assert.match(patch, /insert:/)
  assert.match(patch, /@local\/api-usage-tracker/)
})

test('locale files carry title and description', () => {
  for (const lang of ['en', 'zh']) {
    const meta = JSON.parse(read(`locale/${lang}.json`)).meta
    assert.ok(meta.title && meta.title.length > 0)
    assert.ok(meta.description && meta.description.length > 0)
  }
})

test('host half declares its inject and route constants', () => {
  const src = read('index.js')
  assert.match(src, /export const inject = \['llm'\]/)
  assert.match(src, /export function apply\(ctx\)/)
  assert.match(src, /\/api-usage-tracker\/data/)
  assert.match(src, /ctx\.inject\(\['webServer'\]/)
  assert.match(src, /OPENAI_ADMIN_KEY/)
  assert.match(src, /MAX_RECORDS = 50000/)
})

test('client half registers the workbench panel and admin key footer', () => {
  const src = read('client.js')
  assert.match(src, /window\.__ModuleLoader__\.load/)
  assert.match(src, /PANEL_ID = 'api-usage'/)
  assert.match(src, /sidebar\.panellist/)
  assert.match(src, /settings\.models\.footer/)
  for (const id of ['ov', 'trend', 'donut', 'quota', 'hourly', 'model', 'heat', 'table']) {
    assert.ok(new RegExp(`\\b${id}:\\s*\\{`).test(src), `module ${id} missing`)
  }
})

test('no real secrets are checked in', () => {
  const env = read('.env.example')
  assert.match(env, /OPENAI_ADMIN_KEY=/)
  // The example must not contain a sk-... key.
  assert.doesNotMatch(env, /sk-[A-Za-z0-9]{16,}/)
})
