import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  SEALED_HELDOUT_V3_CANONICAL_SHA256,
  SEALED_HELDOUT_V3_PATHS,
  SEALED_HELDOUT_V3_RAW_SHA256,
  validateAndDeriveSealedHeldoutV3
} from '../scripts/lib/v4/heldout-sealed-contract-v3.mjs';
import {
  buildHeldoutAttemptPlanV3,
  currentDownstreamExecutionGatesV3,
  evaluateProviderHeldoutGateV3,
  providerHeldoutExecutionAuthorizationV3
} from '../scripts/lib/v4/heldout-gate-v3.mjs';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const readBytes = (relativePath) => readFileSync(new URL(relativePath, `file://${REPO_ROOT}`));
const clone = (value) => structuredClone(value);

const sealedInputs = Object.fromEntries(
  Object.entries(SEALED_HELDOUT_V3_PATHS).map(([key, relativePath]) => [key, readBytes(relativePath)])
);

function mutateJsonRaw(raw, mutate) {
  const document = JSON.parse(raw.toString('utf8'));
  mutate(document);
  return Buffer.from(JSON.stringify(document), 'utf8');
}

function passingAttempts(inputs = sealedInputs) {
  return buildHeldoutAttemptPlanV3(inputs).map((expected) => ({
    attemptId: expected.attemptId,
    caseId: expected.caseId,
    modelRole: expected.modelRole,
    model: expected.model,
    repetition: expected.repetition,
    seed: expected.seed,
    temperature: expected.temperature,
    promptContract: expected.promptContract,
    retryIndex: 0,
    status: 'completed',
    error: null,
    refusal: false,
    truncated: false,
    timedOut: false,
    schemaValid: true,
    provenanceValid: true,
    coverageValid: true,
    normativeCore: clone(expected.expectedNormativeCore),
    normativeFingerprintSha256: expected.expectedNormativeFingerprintSha256,
    semanticGold: expected.expectedSemanticGold,
    publicationEligible: expected.expectedPublicationEligible,
    finalApproval: expected.expectedFinalApproval
  }));
}

function bindingCodes(result) {
  return new Set(result.bindingErrors.map((item) => item.code));
}

test('v3 expectation derives gold only after all sealed raw and canonical bindings pass', () => {
  const result = validateAndDeriveSealedHeldoutV3(sealedInputs);

  assert.equal(result.passed, true, JSON.stringify(result.errors));
  assert.equal(result.assertionCount, 37);
  assert.deepEqual(result.rawSha256, SEALED_HELDOUT_V3_RAW_SHA256);
  assert.deepEqual(result.canonicalSha256, {
    evidence: SEALED_HELDOUT_V3_CANONICAL_SHA256.evidence,
    consensus: SEALED_HELDOUT_V3_CANONICAL_SHA256.consensus,
    gold: SEALED_HELDOUT_V3_CANONICAL_SHA256.gold,
    resultSealProjection: SEALED_HELDOUT_V3_CANONICAL_SHA256.resultSealProjection,
    orderedNormativeCore: SEALED_HELDOUT_V3_CANONICAL_SHA256.orderedNormativeCore
  });
  assert.equal(result.derivedGold.semanticPositiveCount, 5);
  assert.equal(result.derivedGold.semanticNegativeCount, 5);
  assert.equal(result.derivedGold.publicationEligibleCount, 0);
  assert.equal(
    result.derivedGold.cases
      .filter((item) => item.semanticGold === 'negative')
      .every((item) => item.expectedFinalApproval === false),
    true
  );
});

test('v3 builds a fixed 60-attempt plan without accepting caller core or gold', () => {
  const plan = buildHeldoutAttemptPlanV3(sealedInputs);

  assert.equal(plan.length, 60);
  assert.equal(new Set(plan.map((item) => item.attemptId)).size, 60);
  assert.equal(plan.filter((item) => item.expectedSemanticGold === 'negative').length, 30);
  assert.equal(plan.every((item) => item.expectedPublicationEligible === false), true);
  assert.equal(plan.every((item) => item.expectedFinalApproval === false), true);
});

test('an exact synthetic 60-attempt bundle passes the v3 result comparator', () => {
  const result = evaluateProviderHeldoutGateV3({ attempts: passingAttempts(), sealedInputs });

  assert.equal(result.passed, true, JSON.stringify(result.failures));
  assert.equal(result.evaluatedExpectedAttemptCount, 60);
  assert.equal(result.contractMatchCount, 60);
  assert.equal(result.fullFingerprintMatchCount, 60);
  assert.equal(result.semanticGoldMatchCount, 60);
  assert.equal(result.publicationEligibilityMatchCount, 60);
  assert.equal(result.finalApprovalMatchCount, 60);
  assert.equal(result.negativeApprovalEscapeCount, 0);
});

test('caller-supplied core or gold fields are rejected instead of becoming expected truth', () => {
  const attempts = passingAttempts();
  const result = evaluateProviderHeldoutGateV3({
    attempts,
    sealedInputs,
    gold: { cases: [] }
  });

  assert.equal(result.passed, false);
  assert.equal(result.evaluatedExpectedAttemptCount, 0);
  assert.deepEqual(result.failures.map((item) => item.code), ['GATE_INPUT_SHAPE_MISMATCH']);
});

test('mutated sealed gold label and publication fields fail raw, canonical, and derivation binding', () => {
  const alteredInputs = {
    ...sealedInputs,
    goldRaw: mutateJsonRaw(sealedInputs.goldRaw, (gold) => {
      const item = gold.cases.find((entry) => entry.caseId === 'v2-case-02');
      item.semanticGold = 'positive';
      item.publicationEligible = true;
      item.expectedFinalApproval = true;
      gold.semanticNegativeIds = gold.semanticNegativeIds.filter((id) => id !== 'v2-case-02');
      gold.semanticPositiveIds.push('v2-case-02');
      gold.publicationEligibleIds.push('v2-case-02');
    })
  };
  const validation = validateAndDeriveSealedHeldoutV3(alteredInputs);
  const result = evaluateProviderHeldoutGateV3({ attempts: passingAttempts(), sealedInputs: alteredInputs });
  const codes = new Set(validation.errors.map((item) => item.code));

  assert.equal(validation.passed, false);
  assert.equal(codes.has('SEALED_RAW_SHA256_MISMATCH'), true);
  assert.equal(codes.has('GOLD_CANONICAL_SHA256_MISMATCH'), true);
  assert.equal(codes.has('SEALED_GOLD_CASE_DERIVATION_MISMATCH'), true);
  assert.equal(result.passed, false);
  assert.deepEqual(result.failures.map((item) => item.code), ['SEALED_EXPECTATION_INTEGRITY_FAILED']);
});

test('the audited semantic-negative approval attack is rejected six times against re-derived truth', () => {
  const attempts = passingAttempts();
  const attacked = attempts.filter((item) => item.caseId === 'v2-case-02');
  for (const item of attacked) {
    item.semanticGold = 'positive';
    item.publicationEligible = true;
    item.finalApproval = true;
  }
  const result = evaluateProviderHeldoutGateV3({ attempts, sealedInputs });

  assert.equal(attacked.length, 6);
  assert.equal(result.passed, false);
  assert.equal(result.semanticGoldMismatchCount, 6);
  assert.equal(result.publicationEligibilityMismatchCount, 6);
  assert.equal(result.finalApprovalMismatchCount, 6);
  assert.equal(result.negativeApprovalEscapeCount, 6);
  assert.equal(result.failures.filter((item) => item.code === 'NEGATIVE_APPROVAL_ESCAPE').length, 6);
});

test('a publicationEligible forgery cannot pass even when core, fingerprint, and semanticGold remain exact', () => {
  const attempts = passingAttempts();
  attempts[0].publicationEligible = true;
  const result = evaluateProviderHeldoutGateV3({ attempts, sealedInputs });

  assert.equal(result.passed, false);
  assert.equal(result.fullFingerprintMismatchCount, 0);
  assert.equal(result.semanticGoldMismatchCount, 0);
  assert.equal(result.publicationEligibilityMismatchCount, 1);
  assert.equal(result.finalApprovalMismatchCount, 0);
});

test('sealed consensus case reorder fails before any attempt is evaluated', () => {
  const alteredInputs = {
    ...sealedInputs,
    consensusRaw: mutateJsonRaw(sealedInputs.consensusRaw, (consensus) => {
      [consensus.orderedNormativeCore[0], consensus.orderedNormativeCore[1]] =
        [consensus.orderedNormativeCore[1], consensus.orderedNormativeCore[0]];
    })
  };
  const result = evaluateProviderHeldoutGateV3({ attempts: passingAttempts(), sealedInputs: alteredInputs });

  assert.equal(result.passed, false);
  assert.equal(result.evaluatedExpectedAttemptCount, 0);
  assert.equal(bindingCodes(result).has('SEALED_RAW_SHA256_MISMATCH'), true);
  assert.equal(bindingCodes(result).has('CONSENSUS_CANONICAL_SHA256_MISMATCH'), true);
  assert.equal(bindingCodes(result).has('CONSENSUS_ORDERED_CORE_CASE_ORDER_MISMATCH'), true);
});

test('sealed consensus case identity tamper fails before any attempt is evaluated', () => {
  const alteredInputs = {
    ...sealedInputs,
    consensusRaw: mutateJsonRaw(sealedInputs.consensusRaw, (consensus) => {
      consensus.orderedNormativeCore[0].caseId = 'v2-case-forged';
    })
  };
  const result = evaluateProviderHeldoutGateV3({ attempts: passingAttempts(), sealedInputs: alteredInputs });

  assert.equal(result.passed, false);
  assert.equal(result.evaluatedExpectedAttemptCount, 0);
  assert.equal(bindingCodes(result).has('CONSENSUS_ORDERED_CORE_CASE_ORDER_MISMATCH'), true);
  assert.equal(bindingCodes(result).has('CONSENSUS_EVIDENCE_CASE_IDENTITY_MISMATCH'), true);
});

test('sealed consensus normative core tamper fails both raw and ordered-core SHA binding', () => {
  const alteredInputs = {
    ...sealedInputs,
    consensusRaw: mutateJsonRaw(sealedInputs.consensusRaw, (consensus) => {
      consensus.orderedNormativeCore[0].semantic.targetRelationToSource = 'broader';
    })
  };
  const result = evaluateProviderHeldoutGateV3({ attempts: passingAttempts(), sealedInputs: alteredInputs });

  assert.equal(result.passed, false);
  assert.equal(bindingCodes(result).has('SEALED_RAW_SHA256_MISMATCH'), true);
  assert.equal(bindingCodes(result).has('CONSENSUS_ORDERED_CORE_SHA256_MISMATCH'), true);
});

test('result-seal SHA binding tamper fails raw, canonical projection, and artifact binding', () => {
  const alteredInputs = {
    ...sealedInputs,
    resultSealRaw: mutateJsonRaw(sealedInputs.resultSealRaw, (seal) => {
      const evidenceBinding = seal.sealedFiles.find(
        (entry) => entry.path === 'pilot/evaluation/v4/heldout-evidence-v2.json'
      );
      evidenceBinding.sha256 = '0'.repeat(64);
    })
  };
  const result = evaluateProviderHeldoutGateV3({ attempts: passingAttempts(), sealedInputs: alteredInputs });

  assert.equal(result.passed, false);
  assert.equal(bindingCodes(result).has('SEALED_RAW_SHA256_MISMATCH'), true);
  assert.equal(bindingCodes(result).has('RESULT_SEAL_SELF_PROJECTION_MISMATCH'), true);
  assert.equal(bindingCodes(result).has('RESULT_SEAL_ARTIFACT_BINDING_MISMATCH'), true);
});

test('unexpected attempts fail and exact-match metrics count only 59 evaluated expected IDs', () => {
  const attempts = passingAttempts();
  attempts[59] = { ...attempts[59], attemptId: 'unexpected|primary|999' };
  const result = evaluateProviderHeldoutGateV3({ attempts, sealedInputs });

  assert.equal(result.passed, false);
  assert.equal(result.observedAttemptCount, 60);
  assert.equal(result.uniqueAttemptCount, 60);
  assert.equal(result.evaluatedExpectedAttemptCount, 59);
  assert.equal(result.fullFingerprintMatchCount, 59);
  assert.equal(result.semanticGoldMatchCount, 59);
  assert.equal(result.publicationEligibilityMatchCount, 59);
  assert.equal(result.finalApprovalMatchCount, 59);
  assert.equal(result.failures.some((item) => item.code === 'ATTEMPT_MISSING'), true);
  assert.equal(result.failures.some((item) => item.code === 'ATTEMPT_UNEXPECTED'), true);
});

test('provider and all downstream permissions remain false pending a new sealed independent audit', () => {
  assert.deepEqual(providerHeldoutExecutionAuthorizationV3({ sealedInputs }), {
    providerHeldoutExecutionAuthorized: false,
    sealedExpectationIntegrityPassed: true,
    independentResultAuditV3Go: false,
    reason: 'INDEPENDENT_RESULT_AUDIT_V3_NOT_SEALED'
  });
  assert.deepEqual(currentDownstreamExecutionGatesV3(), {
    heldoutGatePassed: false,
    independentResultAuditV3Go: false,
    legacySevenAuthorized: false,
    sample100Authorized: false,
    v4BundleContractSealed: false,
    sample100UserApproval: false,
    gitPushAuthorized: false,
    productionDeployAuthorized: false
  });
});
