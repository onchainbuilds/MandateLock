import assert from 'node:assert/strict';
import {UNIT, keyValid} from '../testnet/plan.mjs';

export function computeTask(context, start = new Date(), merchant = context.policy?.allowed_recipients[0]) {
  const policy = context.policy;
  assert(policy, 'An observed owner and agent are required for this template');
  const agent = policy.agent_id;
  const named = id => typeof id === 'string' && id.length >= 2 && id.length <= 64 &&
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(id);
  assert([merchant, agent, policy.owner_id, context.vault].every(named), 'Invalid NEAR account');
  assert(!/^(?:0x|0s|0u)/.test(merchant) && !/^[a-f0-9]{64}$/.test(merchant), 'Named merchant required');
  assert(![policy.owner_id,context.vault].includes(agent));
  assert(![agent,context.vault].includes(merchant));
  assert(keyValid(context.key.public_key) && policy.agent_keys.includes(context.key.public_key));
  assert.equal(context.key.account_id, agent);
  assert.equal(context.key.receiver_id, context.vault);
  assert.deepEqual(context.key.method_names, ['execute_payment']);
  assert(BigInt(context.key.allowance) > 0n, 'Finite restricted allowance required');
  const expiry = new Date(start.getTime() + 3600000);
  const expiryNs = BigInt(expiry.getTime()) * 1000000n;
  assert(expiryNs > BigInt(context.nowNs) && expiryNs < 2n ** 64n, 'Invalid expiry');
  return {
    task: 'Purchase compute from ' + merchant,
    description: 'Allow this agent to pay the named compute merchant up to 0.40 NEAR per request from a total of 1 NEAR.',
    source: context.source, status: 'OWNER_CONFIGURATION_DRAFT', start_utc: start.toISOString(),
    expires_utc: expiry.toISOString(), duration_seconds: 3600,
    owner_call: {signer: policy.owner_id, receiver: context.vault, method: 'create_mandate', deposit: '0',
      args: {agent_id: agent, agent_keys: [context.key.public_key], allowed_recipients: [merchant],
        budget: String(UNIT), per_transaction_limit: String(UNIT * 4n / 10n), expires_at_ns: String(expiryNs)}},
    prerequisites: {active_mandate_must_be_absent: true, required_unallocated_yocto: String(UNIT),
      observed_unallocated_yocto: context.accounting.unallocated},
    permissions: ['execute_payment through the listed key', 'only the named merchant', 'zero attached deposit'],
    prohibited: ['administer mandate', 'transfer directly with restricted key', 'pay another recipient', 'spend past expiry or revocation'],
    expiry_effect: 'New payments are refused. Existing pending reservations require terminal callback evidence.',
    task_meaning: 'Compute is a local job label. The contract enforces the configured financial limits.',
    broadcast: false
  };
}

export function authority(context) {
  const p = context.policy, a = context.accounting;
  let lifecycle = 'ACTIVE';
  if (!p) lifecycle = 'NO_MANDATE';
  else if (p.revoked) lifecycle = 'REVOKED';
  else if (p.paused) lifecycle = 'PAUSED';
  else if (BigInt(context.nowNs) >= BigInt(p.expires_at_ns)) lifecycle = 'EXPIRED';
  else if (BigInt(a.available) === 0n) lifecycle = BigInt(a.pending) > 0n ? 'FULLY_RESERVED' : 'EXHAUSTED';
  return {source: context.source, observed_ns: context.nowNs, lifecycle, mandate: p,
    accounting: a, restricted_key: context.key, vault_full_access_observed: context.vaultFullAccess,
    pending_rule: 'A timeout never releases a reservation.'};
}
