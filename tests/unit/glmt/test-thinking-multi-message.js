#!/usr/bin/env node
'use strict';

console.log('='.repeat(60));
console.log('Legacy GLMT Multi-Message Probe');
console.log('='.repeat(60));
console.log('');
console.log('This manual script targeted the retired `scc glmt` runtime path.');
console.log('SCC now routes supported Z.AI usage through `scc glm`, and thinking is');
console.log('handled natively by current upstream models instead of the old GLMT proxy.');
console.log('');
console.log('Use one of these instead:');
console.log('  1. tests/integration/glmt-integration-test.sh');
console.log('  2. ccs glm "<prompt>"');
console.log('  3. internal transformer tests under tests/unit/glmt/');
console.log('');
process.exit(0);
