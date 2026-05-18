'use strict';

const { strict: assert } = require('node:assert');
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

describe('Gateway scope configuration', () => {
  // Extract the REQUESTED_GATEWAY_SCOPES definition from server.js to verify
  // the actual code rather than duplicating the logic in tests.
  const serverJsPath = path.resolve(__dirname, '..', 'server.js');
  const serverJsContent = fs.readFileSync(serverJsPath, 'utf-8');

  function extractScopesDefinition() {
    // Match the REQUESTED_GATEWAY_SCOPES constant definition block
    const match = serverJsContent.match(
      /const\s+REQUESTED_GATEWAY_SCOPES\s*=\s*\[([\s\S]*?)\];/
    );
    assert.ok(match, 'REQUESTED_GATEWAY_SCOPES should be defined in server.js');
    return match[1];
  }

  it('should include operator.read and operator.write in the scopes definition', () => {
    const def = extractScopesDefinition();
    assert.ok(def.includes("'operator.read'"), 'should contain operator.read');
    assert.ok(def.includes("'operator.write'"), 'should contain operator.write');
  });

  it('should conditionally add operator.admin and operator.pairing via GATEWAY_ADMIN_SCOPES === "true"', () => {
    const def = extractScopesDefinition();
    // Verify the conditional spread pattern exists
    assert.ok(
      def.includes("GATEWAY_ADMIN_SCOPES === 'true'"),
      'should check GATEWAY_ADMIN_SCOPES === true'
    );
    assert.ok(def.includes("'operator.admin'"), 'should conditionally include operator.admin');
    assert.ok(def.includes("'operator.pairing'"), 'should conditionally include operator.pairing');
  });

  it('should NOT contain non-scope entries (chat.send, sessions.send, sessions.list, sessions.history)', () => {
    const def = extractScopesDefinition();
    const invalidEntries = [
      'chat.send',
      'sessions.send',
      'sessions.list',
      'sessions.history',
    ];
    for (const entry of invalidEntries) {
      assert.ok(
        !def.includes(entry),
        `should not contain non-scope entry: ${entry}`
      );
    }
  });

  it('should have exactly 2 hardcoded scopes and 2 conditional scopes', () => {
    const def = extractScopesDefinition();
    // Count single-quoted scope strings that are not inside the conditional spread
    const alwaysPresent = (def.match(/'operator\.\w+'/g) || []).length;
    assert.ok(alwaysPresent >= 2, 'should have at least 2 always-present scopes');
    // The definition should contain exactly 4 distinct scope names total
    const allScopes = [
      ...((def.match(/'operator\.read'/g)) || []),
      ...((def.match(/'operator\.write'/g)) || []),
      ...((def.match(/'operator\.admin'/g)) || []),
      ...((def.match(/'operator\.pairing'/g)) || []),
    ];
    assert.strictEqual(allScopes.length, 4, 'should reference exactly 4 scope names total');
  });

  it('should use spread syntax for conditional scopes (not a hardcoded array)', () => {
    const def = extractScopesDefinition();
    assert.ok(
      def.includes('...'),
      'should use spread syntax for conditional admin/pairing scopes'
    );
    assert.ok(
      /:\s*\[\s*\]/.test(def),
      'should have an empty array fallback for the ternary'
    );
  });
});
