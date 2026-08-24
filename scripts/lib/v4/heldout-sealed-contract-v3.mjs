import {
  sha256Hex,
  sealProjectionSha256
} from './heldout-admission-v2.mjs';
import { deriveHeldoutGold } from './meaning-policy-v2.mjs';

export const SEALED_HELDOUT_V3_INPUT_KEYS = Object.freeze([
  'evidenceRaw',
  'consensusRaw',
  'goldRaw',
  'resultSealRaw'
]);

export const SEALED_HELDOUT_V3_PATHS = Object.freeze({
  evidenceRaw: 'pilot/evaluation/v4/heldout-evidence-v2.json',
  consensusRaw: 'pilot/evaluation/v4/heldout-consensus-v2.json',
  goldRaw: 'pilot/evaluation/v4/heldout-gold-v2.json',
  resultSealRaw: 'pilot/evaluation/v4/heldout-result-seal-v2.json'
});

export const SEALED_HELDOUT_V3_RAW_SHA256 = Object.freeze({
  evidenceRaw: 'a6b27e32c6c5ff28a1959eae37665c1ef6b23cc7e28402b4e411bb7cf36bd83f',
  consensusRaw: '9cf1741b5c93be72452464d4f39b9c1f30cd67ef76a5bf7791c73508f6c0b241',
  goldRaw: '16eb2c60026269c782216af128e5e72d8b056c271138deaa16e7fa43c34f0e07',
  resultSealRaw: 'f969517804babf5f107ea7aec3c0b763a841dc73cc005e3ea19c363f257ff3c2'
});

export const SEALED_HELDOUT_V3_CANONICAL_SHA256 = Object.freeze({
  evidence: 'ffebc1c6f5aa897908de2e1372b6ffabaf223a142d16d5d0242caa08446a4cd0',
  consensus: '8db39d5448e15b63ad2c7af9fd4f0e58736f103dca360f68ad37ef409c3dfdec',
  gold: '340446ecbcf2c8f02493e910f2868279edbf7e40b453f38e802e959997db6cee',
  resultSealProjection: 'b9ccba80b4103d309313bc835e051f2f0f7edc819d7902d27106b4ca7c9bebb4',
  orderedNormativeCore: 'c160a61001fbc07ba9cd28d08b73ddc444debbfb71944a0954fda50135a74de3'
});

export const SEALED_HELDOUT_V3_CASE_IDS = Object.freeze([
  'v2-case-01',
  'v2-case-02',
  'v2-case-03',
  'v2-case-04',
  'v2-case-05',
  'v2-case-06',
  'v2-case-07',
  'v2-case-08',
  'v2-case-09',
  'v2-case-10'
]);

export const SEALED_HELDOUT_V3_POSITIVE_IDS = Object.freeze([
  'v2-case-01',
  'v2-case-03',
  'v2-case-06',
  'v2-case-08',
  'v2-case-10'
]);

export const SEALED_HELDOUT_V3_NEGATIVE_IDS = Object.freeze([
  'v2-case-02',
  'v2-case-04',
  'v2-case-05',
  'v2-case-07',
  'v2-case-09'
]);

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  throw new TypeError('sealed input must be exact UTF-8 bytes');
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

export function canonicalJsonSha256(value) {
  return sha256Hex(canonicalJson(value));
}

function exactKeys(value, keys) {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseJson(raw, key, fail) {
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    fail('SEALED_JSON_PARSE_ERROR', key);
    return null;
  }
}

function sealBinding(resultSeal, path) {
  return resultSeal?.sealedFiles?.find((entry) => entry.path === path);
}

export function validateAndDeriveSealedHeldoutV3(sealedInputs) {
  const errors = [];
  let assertionCount = 0;
  const check = (condition, code, path) => {
    assertionCount += 1;
    if (!condition) errors.push(Object.freeze({ code, path }));
  };
  const fail = (code, path) => check(false, code, path);

  check(
    exactKeys(sealedInputs, SEALED_HELDOUT_V3_INPUT_KEYS),
    'SEALED_INPUT_SET_MISMATCH',
    'sealedInputs'
  );

  const raw = {};
  for (const key of SEALED_HELDOUT_V3_INPUT_KEYS) {
    try {
      raw[key] = toBuffer(sealedInputs?.[key]);
    } catch {
      raw[key] = Buffer.alloc(0);
      fail('SEALED_INPUT_BYTES_INVALID', key);
    }
    check(
      sha256Hex(raw[key]) === SEALED_HELDOUT_V3_RAW_SHA256[key],
      'SEALED_RAW_SHA256_MISMATCH',
      key
    );
  }

  const evidence = parseJson(raw.evidenceRaw, 'evidenceRaw', fail);
  const consensus = parseJson(raw.consensusRaw, 'consensusRaw', fail);
  const sealedGold = parseJson(raw.goldRaw, 'goldRaw', fail);
  const resultSeal = parseJson(raw.resultSealRaw, 'resultSealRaw', fail);
  if ([evidence, consensus, sealedGold, resultSeal].some((item) => item === null)) {
    return Object.freeze({
      passed: false,
      assertionCount,
      errors: Object.freeze(errors)
    });
  }

  check(
    canonicalJsonSha256(evidence) === SEALED_HELDOUT_V3_CANONICAL_SHA256.evidence,
    'EVIDENCE_CANONICAL_SHA256_MISMATCH',
    'evidenceRaw'
  );
  check(
    canonicalJsonSha256(consensus) === SEALED_HELDOUT_V3_CANONICAL_SHA256.consensus,
    'CONSENSUS_CANONICAL_SHA256_MISMATCH',
    'consensusRaw'
  );
  check(
    canonicalJsonSha256(sealedGold) === SEALED_HELDOUT_V3_CANONICAL_SHA256.gold,
    'GOLD_CANONICAL_SHA256_MISMATCH',
    'goldRaw'
  );
  check(
    sealProjectionSha256(resultSeal) === SEALED_HELDOUT_V3_CANONICAL_SHA256.resultSealProjection &&
      resultSeal.sealSelfIntegrity?.projectionSha256 === SEALED_HELDOUT_V3_CANONICAL_SHA256.resultSealProjection,
    'RESULT_SEAL_SELF_PROJECTION_MISMATCH',
    'resultSealRaw'
  );

  check(
    resultSeal.schemaVersion === 'meaning-link-v4-heldout-result-seal/v2' &&
      resultSeal.sealId === 'meaning-link-v4-heldout-10-v2-result-v2-seal' &&
      resultSeal.packetId === 'meaning-link-v4-heldout-10-v2' &&
      resultSeal.protocolId === 'meaning-link-v4-heldout-10-v2-protocol-v3',
    'RESULT_SEAL_IDENTITY_MISMATCH',
    'resultSealRaw'
  );
  check(
    Array.isArray(resultSeal.sealedFiles) &&
      resultSeal.sealedFiles.length === 23 &&
      new Set(resultSeal.sealedFiles.map((entry) => entry.path)).size === 23,
    'RESULT_SEAL_FILE_SET_INVALID',
    'resultSealRaw'
  );
  for (const key of ['evidenceRaw', 'consensusRaw', 'goldRaw']) {
    const binding = sealBinding(resultSeal, SEALED_HELDOUT_V3_PATHS[key]);
    check(
      binding?.sha256 === SEALED_HELDOUT_V3_RAW_SHA256[key],
      'RESULT_SEAL_ARTIFACT_BINDING_MISMATCH',
      key
    );
  }

  check(
    evidence.schemaVersion === 'meaning-link-heldout-evidence/v2' &&
      evidence.packetId === 'meaning-link-v4-heldout-10-v2' &&
      evidence.caseCount === 10 &&
      Array.isArray(evidence.cases) &&
      evidence.cases.length === 10,
    'EVIDENCE_IDENTITY_OR_COUNT_MISMATCH',
    'evidenceRaw'
  );
  check(
    sameJson(evidence.caseOrder, SEALED_HELDOUT_V3_CASE_IDS) &&
      sameJson(evidence.caseOrder, evidence.cases.map((item) => item.caseId)) &&
      new Set(evidence.caseOrder).size === 10,
    'EVIDENCE_CASE_ORDER_OR_ID_MISMATCH',
    'evidenceRaw'
  );

  check(
    consensus.schemaVersion === 'meaning-link-v4-heldout-consensus/v2' &&
      consensus.consensusId === 'meaning-link-v4-heldout-10-v2-consensus-v2' &&
      consensus.packetId === evidence.packetId &&
      consensus.protocolId === 'meaning-link-v4-heldout-10-v2-protocol-v3',
    'CONSENSUS_IDENTITY_MISMATCH',
    'consensusRaw'
  );
  check(
    consensus.inputBindings?.evidence?.path === SEALED_HELDOUT_V3_PATHS.evidenceRaw &&
      consensus.inputBindings?.evidence?.sha256 === SEALED_HELDOUT_V3_RAW_SHA256.evidenceRaw,
    'CONSENSUS_EVIDENCE_BINDING_MISMATCH',
    'consensusRaw'
  );
  check(
    consensus.comparison?.directBytesEqual === true &&
      consensus.comparison?.differenceCount === 0 &&
      consensus.comparison?.orderedNormativeCoreSha256 ===
        SEALED_HELDOUT_V3_CANONICAL_SHA256.orderedNormativeCore &&
      consensus.comparison?.orderedNormativeCoreByteLength === 4672,
    'CONSENSUS_COMPARISON_CONTRACT_MISMATCH',
    'consensusRaw'
  );
  const orderedCoreBytes = Buffer.from(JSON.stringify(consensus.orderedNormativeCore), 'utf8');
  check(
    orderedCoreBytes.length === 4672 &&
      sha256Hex(orderedCoreBytes) === SEALED_HELDOUT_V3_CANONICAL_SHA256.orderedNormativeCore,
    'CONSENSUS_ORDERED_CORE_SHA256_MISMATCH',
    'consensusRaw/orderedNormativeCore'
  );
  check(
    Array.isArray(consensus.orderedNormativeCore) &&
      consensus.orderedNormativeCore.length === 10 &&
      sameJson(consensus.orderedNormativeCore.map((item) => item.caseId), SEALED_HELDOUT_V3_CASE_IDS),
    'CONSENSUS_ORDERED_CORE_CASE_ORDER_MISMATCH',
    'consensusRaw/orderedNormativeCore'
  );
  for (let index = 0; index < 10; index += 1) {
    const evidenceCase = evidence.cases[index];
    const coreCase = consensus.orderedNormativeCore?.[index];
    check(
      coreCase?.caseId === evidenceCase?.caseId &&
        coreCase?.sourceId === evidenceCase?.source?.id &&
        coreCase?.targetId === evidenceCase?.target?.id,
      'CONSENSUS_EVIDENCE_CASE_IDENTITY_MISMATCH',
      `case/${index}`
    );
  }

  let derivedGold = null;
  try {
    derivedGold = deriveHeldoutGold(consensus.orderedNormativeCore, evidence);
  } catch {
    fail('GOLD_REDERIVATION_ERROR', 'consensusRaw/evidenceRaw');
  }
  if (derivedGold !== null) {
    check(
      sealedGold.schemaVersion === 'meaning-link-v4-heldout-gold/v2' &&
        sealedGold.goldId === 'meaning-link-v4-heldout-10-v2-gold-v2' &&
        sealedGold.packetId === evidence.packetId &&
        sealedGold.protocolId === consensus.protocolId,
      'SEALED_GOLD_IDENTITY_MISMATCH',
      'goldRaw'
    );
    check(
      sealedGold.inputBindings?.evidence?.path === SEALED_HELDOUT_V3_PATHS.evidenceRaw &&
        sealedGold.inputBindings?.evidence?.sha256 === SEALED_HELDOUT_V3_RAW_SHA256.evidenceRaw &&
        sealedGold.inputBindings?.consensus?.path === SEALED_HELDOUT_V3_PATHS.consensusRaw &&
        sealedGold.inputBindings?.consensus?.sha256 === SEALED_HELDOUT_V3_RAW_SHA256.consensusRaw &&
        sealedGold.inputBindings?.consensus?.orderedNormativeCoreSha256 ===
          SEALED_HELDOUT_V3_CANONICAL_SHA256.orderedNormativeCore,
      'SEALED_GOLD_INPUT_BINDING_MISMATCH',
      'goldRaw'
    );
    check(sameJson(sealedGold.cases, derivedGold.cases), 'SEALED_GOLD_CASE_DERIVATION_MISMATCH', 'goldRaw/cases');
    check(
      sameJson(sealedGold.semanticPositiveIds, derivedGold.semanticPositiveIds) &&
        sameJson(sealedGold.semanticNegativeIds, derivedGold.semanticNegativeIds) &&
        sameJson(sealedGold.publicationEligibleIds, derivedGold.publicationEligibleIds),
      'SEALED_GOLD_ID_LIST_DERIVATION_MISMATCH',
      'goldRaw'
    );
    check(
      sameJson(derivedGold.semanticPositiveIds, SEALED_HELDOUT_V3_POSITIVE_IDS) &&
        sameJson(derivedGold.semanticNegativeIds, SEALED_HELDOUT_V3_NEGATIVE_IDS) &&
        derivedGold.semanticPositiveCount === 5 &&
        derivedGold.semanticNegativeCount === 5 &&
        derivedGold.publicationEligibleCount === 0 &&
        derivedGold.quantityAdmissionPassed === true,
      'REDERIVED_GOLD_COUNT_OR_ID_MISMATCH',
      'goldRaw'
    );
    check(
      derivedGold.cases.every((item) =>
        item.expectedFinalApproval === item.publicationEligible &&
        (item.semanticGold !== 'negative' || item.expectedFinalApproval === false)),
      'REDERIVED_NEGATIVE_APPROVAL_INVARIANT_MISMATCH',
      'goldRaw/cases'
    );
  }

  const passed = errors.length === 0 && derivedGold !== null;
  return Object.freeze({
    passed,
    assertionCount,
    errors: Object.freeze(errors),
    rawSha256: Object.freeze(Object.fromEntries(
      SEALED_HELDOUT_V3_INPUT_KEYS.map((key) => [key, sha256Hex(raw[key])])
    )),
    canonicalSha256: Object.freeze({
      evidence: canonicalJsonSha256(evidence),
      consensus: canonicalJsonSha256(consensus),
      gold: canonicalJsonSha256(sealedGold),
      resultSealProjection: sealProjectionSha256(resultSeal),
      orderedNormativeCore: sha256Hex(orderedCoreBytes)
    }),
    orderedNormativeCore: passed ? structuredClone(consensus.orderedNormativeCore) : null,
    derivedGold: passed ? structuredClone(derivedGold) : null
  });
}
