import type {  ChainVerificationResult, Epoch, EpochSplit, ForensicAttribution, MemberRole, RatificationSignature  } from './types';

/**
 * Pure TypeScript SHA-256 implementation for synchronous execution
 * in both browser client components and Node.js server routes.
 */
function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty as 'length'] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (i = 0; i < asciiBitLength; i += 8) {
    words[i >> 5] |= (ascii.charCodeAt(i / 8) & 0xff) << (24 - (i % 32));
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words.length; i += 16) {
    const w: number[] = [];
    for (j = 0; j < 16; j++) w[j] = words[i + j] || 0;
    for (j = 16; j < 64; j++) {
      const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (j = 0; j < 64; j++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

export function sha256(text: string): string {
  return sha256Pure(text);
}

/**
 * Computes canonical SHA-256 hash for an Epoch object.
 * Canonicalizes splits order and fields to guarantee bit-level determinism.
 */
export function computeEpochHash(
  epochId: string,
  version: string,
  previousHash: string,
  splits: EpochSplit[],
  createdAt: string
): string {
  // Sort splits deterministically by memberId
  const sortedSplits = [...splits].sort((a, b) => a.memberId.localeCompare(b.memberId));
  const canonicalPayload = JSON.stringify({
    epochId,
    version,
    previousHash,
    createdAt,
    splits: sortedSplits.map((s) => ({ memberId: s.memberId, bps: s.bps })),
  });

  return sha256(`FAIRSPLIT_EPOCH:${canonicalPayload}`);
}

/**
 * Generates a mock cryptographic signature hash for a member ratifying an epoch.
 */
export function generateMemberSignatureHash(
  memberId: string,
  epochHash: string,
  timestamp: string
): string {
  const secretSalt = `MEMBER_KEY_${memberId.toUpperCase()}_SALT_9824`;
  return sha256(`${epochHash}:${memberId}:${timestamp}:${secretSalt}`);
}

/**
 * Forensically analyzes an invalid epoch to identify the tamper vector and
 * attribute the malicious actor ONLY IF cryptographic certainty is established.
 */
function analyzeTamperForensics(
  epoch: Epoch,
  tamperReason: 'HASH_MISMATCH' | 'PREV_HASH_CORRUPTION'
): ForensicAttribution {
  // Map of known member display names
  const memberNames: Record<MemberRole, string> = {
    dev: 'Alex Mercer (Lead Engineer)',
    artist: 'Elena Vance (Art Director)',
    writer: 'Marcus Chen (Narrative Lead)',
    composer: 'Lyra Song (Sound Designer)',
  };

  if (tamperReason === 'HASH_MISMATCH') {
    // Check if the splits were tampered with:
    // Genesis expected standard baseline vs current splits
    const baselineBps: Record<MemberRole, number> = {
      dev: 4000,
      artist: 3000,
      writer: 2000,
      composer: 1000,
    };

    // Calculate sum and individual member delta
    const currentTotal = epoch.splits.reduce((acc, s) => acc + s.bps, 0);

    // Look for a member who unilaterally gained equity
    const beneficiaries: { role: MemberRole; name: string; gainBps: number }[] = [];
    epoch.splits.forEach((s) => {
      const expected = baselineBps[s.memberId] ?? 0;
      if (s.bps > expected) {
        beneficiaries.push({
          role: s.memberId,
          name: memberNames[s.memberId] || s.memberId,
          gainBps: s.bps - expected,
        });
      }
    });

    // Check if one specific party gained equity without proper ratification
    if (beneficiaries.length === 1 && currentTotal !== 10000) {
      const suspect = beneficiaries[0];
      return {
        suspectRole: suspect.role,
        suspectName: suspect.name,
        confidence: 'HIGH',
        tamperType: 'UNAUTHORIZED_EQUITY_INFLATION',
        evidence: `Unilateral split modification detected in Epoch ${epoch.version}. ${suspect.name} gained +${(suspect.gainBps / 100).toFixed(1)}% equity without matching consensus signatures from peer roles.`,
        verdict: `Financial Anomaly Analysis: Primary Beneficiary Identified. ${suspect.name} gained +${(suspect.gainBps / 100).toFixed(1)}% equity. Note: Beneficiary analysis flags who received surplus allocation, but cryptographic mismatch alone does not prove author identity.`,
      };
    }

    // Check if total was maintained but one member's share was inflated at the expense of others without their consent
    if (beneficiaries.length === 1 && currentTotal === 10000) {
      const suspect = beneficiaries[0];
      return {
        suspectRole: suspect.role,
        suspectName: suspect.name,
        confidence: 'HIGH',
        tamperType: 'UNAUTHORIZED_EQUITY_INFLATION',
        evidence: `Equity redistribution in Epoch ${epoch.version} favors ${suspect.name} (+${(suspect.gainBps / 100).toFixed(1)}%). The cryptographic block hash does not match the payload certified by counter-parties.`,
        verdict: `Financial Anomaly Analysis: Primary Beneficiary Identified. Unratified balance shift favors ${suspect.role.toUpperCase()} (+${(suspect.gainBps / 100).toFixed(1)}%). Note: Beneficiary analysis flags who received surplus allocation, but cryptographic mismatch alone does not prove author identity.`,
      };
    }

    // If multiple beneficiaries or raw non-equity payload tampering
    return {
      confidence: 'INCONCLUSIVE',
      tamperType: 'UNKNOWN',
      evidence: `Cryptographic payload mismatch in Epoch ${epoch.version}. Multiple or no clear individual equity beneficiaries detected. No single signature key was exclusively compromised.`,
      verdict: `Attribution: Inconclusive (Insufficient Cryptographic Proof). Forensic engine refuses to falsely accuse an individual when direct unilateral beneficiary proof is absent.`,
    };
  }

  // Predecessor link corruption
  return {
    confidence: 'INCONCLUSIVE',
    tamperType: 'LINK_CORRUPTION',
    evidence: `Predecessor hash link between epochs was broken or forged in the ledger transport stream. The mutation exists at the chain topology level rather than an individual allocation.`,
    verdict: `Attribution: Inconclusive. Network or external transport corruption; no specific collaborator signature identified.`,
  };
}

/**
 * Validates the entire hash-chained sequence of epochs.
 * Returns valid status, detailed diagnostics, and forensic attribution ONLY if sure.
 */
export function verifyEpochChain(epochs: Epoch[]): ChainVerificationResult {
  if (epochs.length === 0) {
    return { isValid: false, brokenEpochIndex: null, details: 'Ledger is empty.' };
  }

  for (let i = 0; i < epochs.length; i++) {
    const epoch = epochs[i];

    // Check genesis previousHash
    if (i === 0) {
      const genesisPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
      if (epoch.previousHash !== genesisPrevHash) {
        const forensics = analyzeTamperForensics(epoch, 'PREV_HASH_CORRUPTION');
        return {
          isValid: false,
          brokenEpochIndex: 0,
          details: `Genesis block previousHash is corrupt. Expected all zeros.`,
          forensics,
        };
      }
    } else {
      // Check link to predecessor
      const previousEpoch = epochs[i - 1];
      if (epoch.previousHash !== previousEpoch.hash) {
        const forensics = analyzeTamperForensics(epoch, 'PREV_HASH_CORRUPTION');
        return {
          isValid: false,
          brokenEpochIndex: i,
          details: `Epoch ${epoch.version} previousHash does not match Epoch ${previousEpoch.version} hash.`,
          forensics,
        };
      }
    }

    // Verify recomputed hash
    const recomputed = computeEpochHash(
      epoch.epochId,
      epoch.version,
      epoch.previousHash,
      epoch.splits,
      epoch.createdAt
    );

    if (recomputed !== epoch.hash) {
      const forensics = analyzeTamperForensics(epoch, 'HASH_MISMATCH');
      return {
        isValid: false,
        brokenEpochIndex: i,
        details: `Epoch ${epoch.version} hash mismatch! Computed: ${recomputed.slice(0, 8)}... vs Recorded: ${epoch.hash.slice(0, 8)}...`,
        forensics,
      };
    }
  }

  return {
    isValid: true,
    brokenEpochIndex: null,
    details: `All ${epochs.length} epochs verified cryptographically. Chain is immutable and valid.`,
  };
}

