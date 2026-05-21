const test = require('node:test');
const assert = require('node:assert/strict');

// Import the SSRF validation helpers from the dedicated module
const { isForbiddenLinkPreviewHost, hostResolvesToPrivate, resolveHostToIps } = require('../lib/ssrf-validation');

// ---- Unit tests for SSRF validation helpers ----

test('isForbiddenLinkPreviewHost blocks localhost', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('localhost'), true);
  assert.equal(await isForbiddenLinkPreviewHost('LOCALHOST'), true);
  assert.equal(await isForbiddenLinkPreviewHost('sub.localhost'), true);
  assert.equal(await isForbiddenLinkPreviewHost('.localhost'), true);
});

test('isForbiddenLinkPreviewHost blocks .local domains', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('printer.local'), true);
  assert.equal(await isForbiddenLinkPreviewHost('my-router.local'), true);
  assert.equal(await isForbiddenLinkPreviewHost('.local'), true);
});

test('isForbiddenLinkPreviewHost blocks private IPv4 addresses', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('10.0.0.1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('10.255.255.255'), true);
  assert.equal(await isForbiddenLinkPreviewHost('127.0.0.1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('127.255.255.255'), true);
  assert.equal(await isForbiddenLinkPreviewHost('169.254.169.254'), true); // AWS IMDS
  assert.equal(await isForbiddenLinkPreviewHost('172.16.0.1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('172.31.255.255'), true);
  assert.equal(await isForbiddenLinkPreviewHost('192.168.0.1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('192.168.255.255'), true);
});

test('isForbiddenLinkPreviewHost blocks IPv4 broadcast address', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('255.255.255.255'), true);
});

test('isForbiddenLinkPreviewHost blocks private IPv6 addresses', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('::1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('0:0:0:0:0:0:0:1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('[::1]'), true);
  assert.equal(await isForbiddenLinkPreviewHost('fe80::1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('fc00::1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('fd00::1'), true);
});

test('isForbiddenLinkPreviewHost blocks IPv6 unspecified address', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('::'), true);
});

test('isForbiddenLinkPreviewHost allows public hostnames', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('example.com'), false);
  assert.equal(await isForbiddenLinkPreviewHost('github.com'), false);
  assert.equal(await isForbiddenLinkPreviewHost('cdn.example.org'), false);
  assert.equal(await isForbiddenLinkPreviewHost('1.1.1.1'), false);
  assert.equal(await isForbiddenLinkPreviewHost('8.8.8.8'), false);
});

test('isForbiddenLinkPreviewHost blocks empty/null/undefined', async () => {
  assert.equal(await isForbiddenLinkPreviewHost(''), true);
  assert.equal(await isForbiddenLinkPreviewHost(null), true);
  assert.equal(await isForbiddenLinkPreviewHost(undefined), true);
  assert.equal(await isForbiddenLinkPreviewHost(), true);
});

test('isForbiddenLinkPreviewHost with resolveDns=false skips DNS resolution', async () => {
  // Direct IP blocks still work regardless of resolveDns
  assert.equal(await isForbiddenLinkPreviewHost('localhost', { resolveDns: false }), true);
  assert.equal(await isForbiddenLinkPreviewHost('192.168.1.1', { resolveDns: false }), true);
  assert.equal(await isForbiddenLinkPreviewHost('example.com', { resolveDns: false }), false);
});

test('resolveHostToIps handles IPv4 addresses', async () => {
  const ips = await resolveHostToIps('1.1.1.1');
  assert.ok(Array.isArray(ips), 'should return an array');
  assert.ok(ips.includes('1.1.1.1'), 'should include the input IP');
});

test('resolveHostToIps handles IPv6 addresses', async () => {
  const ips = await resolveHostToIps('::1');
  assert.ok(Array.isArray(ips), 'should return an array for IPv6');
  assert.ok(ips.includes('::1') || ips.includes('[::1]'), 'should include the IPv6 address');
});

test('hostResolvesToPrivate detects 127.0.0.1 as private (DNS resolution may fail in containers)', async () => {
  const result = await hostResolvesToPrivate('127.0.0.1');
  assert.equal(result, true, '127.0.0.1 should be detected as private IP');
});

test('hostResolvesToPrivate handles unresolvable hostnames gracefully', async () => {
  // Non-existent domain should not throw, should return false (can't confirm private)
  const result = await hostResolvesToPrivate('this-domain-definitely-does-not-exist-12345.com');
  assert.ok(typeof result === 'boolean', 'should return a boolean for unresolvable domains');
});

// ---- Acceptance criteria: IPv6 loopback and private cases ----

test('IPv6 loopback ::1 is blocked', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('::1'), true);
});

test('IPv6 link-local fe80::/10 range is blocked', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('fe80::1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('fe80::abcd'), true);
});

test('IPv6 unique-local fc00::/7 range is blocked', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('fc00::1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('fd00::1'), true);
});

test('IPv6 unspecified :: is blocked', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('::'), true);
});

// ---- Acceptance criteria: Direct private targets ----

test('Direct private IPv4 targets are blocked', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('10.0.0.1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('192.168.1.1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('172.16.0.1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('127.0.0.1'), true);
  assert.equal(await isForbiddenLinkPreviewHost('169.254.169.254'), true); // cloud metadata
});

test('Public IPv4 addresses are allowed', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('8.8.8.8'), false);
  assert.equal(await isForbiddenLinkPreviewHost('1.1.1.1'), false);
  assert.equal(await isForbiddenLinkPreviewHost('142.250.80.46'), false); // google.com
});

// ---- Integration-style: valid public redirect scenario ----

test('Public hostnames are allowed for preview (simulates valid public redirect)', async () => {
  // These represent what would be validated at each hop of a public redirect chain
  assert.equal(await isForbiddenLinkPreviewHost('httpbin.org'), false);
  assert.equal(await isForbiddenLinkPreviewHost('redirect.example.com'), false);
  assert.equal(await isForbiddenLinkPreviewHost('example.com'), false);
});

// ---- Edge cases ----

test('isForbiddenLinkPreviewHost handles case insensitivity', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('LOCALHOST'), true);
  assert.equal(await isForbiddenLinkPreviewHost('LoCaLhOsT'), true);
  assert.equal(await isForbiddenLinkPreviewHost('EXAMPLE.COM'), false);
});

test('isForbiddenLinkPreviewHost handles .localhost subdomains', async () => {
  assert.equal(await isForbiddenLinkPreviewHost('foo.localhost'), true);
  assert.equal(await isForbiddenLinkPreviewHost('bar.foo.localhost'), true);
});


test('DNS resolution blocks hostnames that resolve to private addresses', async () => {
  const resolveHostToIps = async () => ['127.0.0.1'];
  assert.equal(await isForbiddenLinkPreviewHost('private.example', { resolveHostToIps }), true);
});

test('DNS resolution allows hostnames that resolve only to public addresses', async () => {
  const resolveHostToIps = async () => ['93.184.216.34'];
  assert.equal(await isForbiddenLinkPreviewHost('public.example', { resolveHostToIps }), false);
});
