import { caseNormativeFingerprintSha256 } from './meaning-policy-v2.mjs';

export const HELDOUT_PROVIDER_PROMPT_CONTRACT = 'bilingual-equivalence/v4-preregistered-1';
export const HELDOUT_PROVIDER_TEMPERATURE = 0;

export const HELDOUT_PROVIDER_MODEL_SPECS = Object.freeze([
  Object.freeze({
    role: 'primary',
    model: '@cf/openai/gpt-oss-20b',
    seeds: Object.freeze([317, 331, 347])
  }),
  Object.freeze({
    role: 'blind-verifier',
    model: '@cf/qwen/qwen3-30b-a3b-fp8',
    seeds: Object.freeze([719, 733, 751])
  })
]);

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildHeldoutAttemptPlan(orderedCore, gold) {
  if (!Array.isArray(orderedCore) || !Array.isArray(gold?.cases) || orderedCore.length !== 10) {
    throw new TypeError('ten-case ordered core and derived gold are required');
  }
  const goldByCase = new Map(gold.cases.map((item) => [item.caseId, item]));
  const attempts = [];
  for (const coreCase of orderedCore) {
    const expectedGold = goldByCase.get(coreCase.caseId);
    if (!expectedGold) throw new Error(`missing gold for ${coreCase.caseId}`);
    for (const modelSpec of HELDOUT_PROVIDER_MODEL_SPECS) {
      for (let repetitionIndex = 0; repetitionIndex < modelSpec.seeds.length; repetitionIndex += 1) {
        const seed = modelSpec.seeds[repetitionIndex];
        attempts.push(Object.freeze({
          attemptId: `${coreCase.caseId}|${modelSpec.role}|${seed}`,
          caseId: coreCase.caseId,
          modelRole: modelSpec.role,
          model: modelSpec.model,
          repetition: repetitionIndex + 1,
          seed,
          temperature: HELDOUT_PROVIDER_TEMPERATURE,
          promptContract: HELDOUT_PROVIDER_PROMPT_CONTRACT,
          retryIndex: 0,
          expectedNormativeCore: structuredClone(coreCase),
          expectedNormativeFingerprintSha256: caseNormativeFingerprintSha256(coreCase),
          expectedSemanticGold: expectedGold.semanticGold,
          expectedPublicationEligible: expectedGold.publicationEligible,
          expectedFinalApproval: expectedGold.publicationEligible
        }));
      }
    }
  }
  if (attempts.length !== 60 || new Set(attempts.map((item) => item.attemptId)).size !== 60) {
    throw new Error('held-out attempt plan must contain exactly 60 unique attempts');
  }
  return Object.freeze(attempts);
}

export function evaluateProviderHeldoutGate({ attempts, orderedCore, gold }) {
  const expectedPlan = buildHeldoutAttemptPlan(orderedCore, gold);
  const expectedById = new Map(expectedPlan.map((item) => [item.attemptId, item]));
  const observedAttempts = Array.isArray(attempts) ? attempts : [];
  const failures = [];
  const fail = (code, attemptId = null) => failures.push(Object.freeze({ code, attemptId }));

  if (observedAttempts.length !== 60) fail('ATTEMPT_COUNT_MISMATCH');
  const observedIds = observedAttempts.map((item) => item?.attemptId);
  if (new Set(observedIds).size !== observedIds.length) fail('ATTEMPT_ID_DUPLICATE');
  for (const expected of expectedPlan) {
    if (!observedIds.includes(expected.attemptId)) fail('ATTEMPT_MISSING', expected.attemptId);
  }
  for (const observed of observedAttempts) {
    if (!expectedById.has(observed?.attemptId)) fail('ATTEMPT_UNEXPECTED', observed?.attemptId ?? null);
  }

  let fullFingerprintMismatchCount = 0;
  let semanticGoldMismatchCount = 0;
  let publicationEligibilityMismatchCount = 0;
  let finalApprovalMismatchCount = 0;
  let errorCount = 0;
  let negativeApprovalEscapeCount = 0;
  let semanticPositiveMissCount = 0;
  let retryViolationCount = 0;

  for (const observed of observedAttempts) {
    const expected = expectedById.get(observed?.attemptId);
    if (!expected) continue;
    const contractMatches =
      observed.caseId === expected.caseId &&
      observed.modelRole === expected.modelRole &&
      observed.model === expected.model &&
      observed.repetition === expected.repetition &&
      observed.seed === expected.seed &&
      observed.temperature === expected.temperature &&
      observed.promptContract === expected.promptContract;
    if (!contractMatches) fail('ATTEMPT_CONTRACT_MISMATCH', expected.attemptId);
    if (observed.retryIndex !== 0) {
      retryViolationCount += 1;
      fail('RETRY_PROHIBITED', expected.attemptId);
    }

    const attemptHasError =
      observed.status !== 'completed' ||
      observed.error !== null ||
      observed.refusal !== false ||
      observed.truncated !== false ||
      observed.timedOut !== false ||
      observed.schemaValid !== true ||
      observed.provenanceValid !== true ||
      observed.coverageValid !== true;
    if (attemptHasError) {
      errorCount += 1;
      fail('ATTEMPT_ERROR_OR_INTEGRITY_FAILURE', expected.attemptId);
    }

    const fingerprintMatches =
      sameJson(observed.normativeCore, expected.expectedNormativeCore) &&
      observed.normativeFingerprintSha256 === expected.expectedNormativeFingerprintSha256;
    if (!fingerprintMatches) {
      fullFingerprintMismatchCount += 1;
      fail('FULL_FINGERPRINT_MISMATCH', expected.attemptId);
    }
    if (observed.semanticGold !== expected.expectedSemanticGold) {
      semanticGoldMismatchCount += 1;
      fail('SEMANTIC_GOLD_MISMATCH', expected.attemptId);
    }
    if (observed.publicationEligible !== expected.expectedPublicationEligible) {
      publicationEligibilityMismatchCount += 1;
      fail('PUBLICATION_ELIGIBILITY_MISMATCH', expected.attemptId);
    }
    if (observed.finalApproval !== expected.expectedFinalApproval) {
      finalApprovalMismatchCount += 1;
      fail('FINAL_APPROVAL_MISMATCH', expected.attemptId);
    }
    if (expected.expectedSemanticGold === 'negative' && observed.finalApproval === true) {
      negativeApprovalEscapeCount += 1;
      fail('NEGATIVE_APPROVAL_ESCAPE', expected.attemptId);
    }
    if (
      expected.expectedSemanticGold === 'positive' &&
      (!fingerprintMatches || observed.semanticGold !== 'positive')
    ) {
      semanticPositiveMissCount += 1;
      fail('SEMANTIC_POSITIVE_MISS', expected.attemptId);
    }
  }

  const passed =
    observedAttempts.length === 60 &&
    new Set(observedIds).size === 60 &&
    failures.length === 0 &&
    fullFingerprintMismatchCount === 0 &&
    semanticGoldMismatchCount === 0 &&
    publicationEligibilityMismatchCount === 0 &&
    finalApprovalMismatchCount === 0 &&
    errorCount === 0 &&
    negativeApprovalEscapeCount === 0 &&
    semanticPositiveMissCount === 0 &&
    retryViolationCount === 0;

  return Object.freeze({
    passed,
    expectedAttemptCount: 60,
    observedAttemptCount: observedAttempts.length,
    uniqueAttemptCount: new Set(observedIds).size,
    fullFingerprintMatchCount: observedAttempts.length - fullFingerprintMismatchCount,
    semanticGoldMatchCount: observedAttempts.length - semanticGoldMismatchCount,
    publicationEligibilityMatchCount: observedAttempts.length - publicationEligibilityMismatchCount,
    finalApprovalMatchCount: observedAttempts.length - finalApprovalMismatchCount,
    fullFingerprintMismatchCount,
    semanticGoldMismatchCount,
    publicationEligibilityMismatchCount,
    finalApprovalMismatchCount,
    errorCount,
    negativeApprovalEscapeCount,
    semanticPositiveMissCount,
    retryViolationCount,
    failures: Object.freeze(failures)
  });
}

export function providerHeldoutExecutionAuthorization({ admissionPassed, independentResultAuditGo }) {
  return Object.freeze({
    providerHeldoutExecutionAuthorized:
      admissionPassed === true && independentResultAuditGo === true,
    admissionPassed: admissionPassed === true,
    independentResultAuditGo: independentResultAuditGo === true
  });
}

export function deriveDownstreamExecutionGates({
  heldoutGatePassed,
  independentResultAuditGo,
  v4BundleContractSealed = false,
  sample100UserApproval = false
}) {
  const commonGate = heldoutGatePassed === true && independentResultAuditGo === true;
  return Object.freeze({
    legacySevenAuthorized: commonGate,
    sample100Authorized:
      commonGate && v4BundleContractSealed === true && sample100UserApproval === true,
    heldoutGatePassed: heldoutGatePassed === true,
    independentResultAuditGo: independentResultAuditGo === true,
    v4BundleContractSealed: v4BundleContractSealed === true,
    sample100UserApproval: sample100UserApproval === true
  });
}
