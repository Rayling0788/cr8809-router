const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'files/www/luci-static/resources/view/campus/wifi-select-v4.js'), 'utf8');
const declarations = [];
const securityFor = new Function('rpc', '_', source.slice(0, source.indexOf('return view.extend')) + '\nreturn securityFor;')({ declare(spec) { declarations.push(spec); } }, text => text);
for (const [encryption, expected] of [
  [{ enabled: false }, 'none'],
  [{ enabled: true, authentication: ['psk'], wpa: [1] }, 'psk'],
  [{ enabled: true, authentication: ['psk'], wpa: [2] }, 'psk2'],
  [{ enabled: true, authentication: ['psk'], wpa: [1, 2] }, 'psk-mixed'],
  [{ enabled: true, authentication: ['sae'], wpa: [3] }, 'sae'],
  [{ enabled: true, authentication: ['psk', 'sae'], wpa: [2, 3] }, 'sae-mixed'],
  [{ enabled: true, authentication: ['802.1x'], wpa: [2] }, 'unsupported'],
  [{ enabled: true, wep: ['open'] }, 'unsupported']
]) assert.equal(securityFor({ encryption }).value, expected);
assert.deepEqual(declarations[0].expect, { results: [] });
assert.equal(declarations[0].reject, true);
assert.equal(declarations[1].reject, true);
console.log('PASS: 8 encryption cases and RPC declarations');
