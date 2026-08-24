import { caseNormativeFingerprintSha256 } from './meaning-policy-v2.mjs';
import { validateAndDeriveSealedHeldoutV3 } from './heldout-sealed-contract-v3.mjs';

export const HELDOUT_PROVIDER_PROMPT_CONTRACT_V3 = 'bilingual-equivalence/v4-preregistered-1';
export const HELDOUT_PROVIDER_TEMPERATURE_V3 = 0;

export const HELDOUT_PROVIDER_MODEL_SPECS_V3 = Object.freeze([
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

const GATE_INPUT_KEYS = Object.freeze(['attempts', 'sealedInputs']);

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

function buildPlanFromValidatedContract(contract) {
  const goldByCase = new Map(contract.derivedGold.cases.map((item) => [item.caseId, item]));
  const attempts = [];
  for (const coreCase of contract.orderedNormativeCore) {
    const expectedGold = goldByCase.get(coreCase.caseId);
    if (!expectedGold) throw new Error(`sealed gold missing ${coreCase.caseId}`);
    for (const modelSpec of HELDOUT_PROVIDER_MODEL_SPECS_V3) {
      for (let repetitionIndex = 0; repetitionIndex < modelSpec.seeds.length; repetitionIndex += 1) {
        const seed = modelSpec.seeds[repetitionIndex];
        attempts.push(Object.freeze({
          attemptId: `${coreCase.caseId}|${modelSpec.role}|${seed}`,
          caseId: coreCase.caseId,
          modelRole: modelSpec.role,
          model: modelSpec.model,
          repetition: repetitionIndex + 1,
          seed,
          temperature: HELDOUT_PROVIDER_TEMPERATURE_V3,
          promptContract: HELDOUT_PROVIDER_PROMPT_CONTRACT_V3,
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
    throw new Error('sealed held-out plan must contain exactly 60 unique attempts');
  }
  return Object.freeze(attempts);
}

export class SealedHeldoutContractError extends Error {
  constructor(errors) {
    super('sealed held-out expectation integrity failed');
    this.name = 'SealedHeldoutContractError';
    this.code = 'SEALED_EXPECTATION_INTEGRITY_FAILED';
    this.bindingErrors = Object.freeze(errors.map((item) => Object.freeze({ ...item })));
  }
}

export function buildHeldoutAttemptPlanV3(sealedInputs) {
  const contract = validateAndDeriveSealedHeldoutV3(sealedInputs);
  if (!contract.passed) throw new SealedHeldoutContractError(contract.errors);
  return buildPlanFromValidatedContract(contract);
}

function failedBeforeExpectedEvaluation({ attempts, failures, bindingErrors = [] }) {
  const observedAttempts = Array.isArray(attempts) ? attempts : [];
  return Object.freeze({
    passed: false,
    expectedAttemptCount: 60,
    observedAttemptCount: observedAttempts.length,
    uniqueAttemptCount: new Set(observedAttempts.map((item) => item?.attemptId)).size,
    evaluatedExpectedAttemptCount: 0,
    contractMatchCount: 0,
    fullFingerprintMatchCount: 0,
    semanticGoldMatchCount: 0,
    publicationEligibilityMatchCount: 0,
    finalApprovalMatchCount: 0,
    fullFingerprintMismatchCount: 0,
    semanticGoldMismatchCount: 0,
    publicationEligibilityMismatchCount: 0,
    finalApprovalMismatchCount: 0,
    errorCount: 0,
    negativeApprovalEscapeCount: 0,
    semanticPositiveMissCount: 0,
    retryViolationCount: 0,
    failures: Object.freeze(failures.map((item) => Object.freeze({ ...item }))),
    bindingErrors: Object.freeze(bindingErrors.map((item) => Object.freeze({ ...item })))
  });
}

export function evaluateProviderHeldoutGateV3(input) {
  const observedAttempts = Array.isArray(input?.attempts) ? input.attempts : [];
  if (!exactKeys(input, GATE_INPUT_KEYS)) {
    return failedBeforeExpectedEvaluation({
      attempts: observedAttempts,
      failures: [{ code: 'GATE_INPUT_SHAPE_MISMATCH', attemptId: null }]
    });
  }

  const contract = validateAndDeriveSealedHeldoutV3(input.sealedInputs);
  if (!contract.passed) {
    return failedBeforeExpectedEvaluation({
      attempts: observedAttempts,
      failures: [{ code: 'SEALED_EXPECTATION_INTEGRITY_FAILED', attemptId: null }],
      bindingErrors: contract.errors
    });
  }

  const expectedPlan = buildPlanFromValidatedContract(contract);
  const expectedById = new Map(expectedPlan.map((item) => [item.attemptId, item]));
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

  const evaluatedExpectedIds = new Set();
  let contractMatchCount = 0;
  let fullFingerprintMatchCount = 0;
  let semanticGoldMatchCount = 0;
  let publicationEligibilityMatchCount = 0;
  let finalApprovalMatchCount = 0;
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
    if (!expected || evaluatedExpectedIds.has(expected.attemptId)) continue;
    evaluatedExpectedIds.add(expected.attemptId);

    const contractMatches =
      observed.caseId === expected.caseId &&
      observed.modelRole === expected.modelRole &&
      observed.model === expected.model &&
      observed.repetition === expected.repetition &&
      observed.seed === expected.seed &&
      observed.temperature === expected.temperature &&
      observed.promptContract === expected.promptContract;
    if (contractMatches) contractMatchCount += 1;
    else fail('ATTEMPT_CONTRACT_MISMATCH', expected.attemptId);

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
    if (fingerprintMatches) fullFingerprintMatchCount += 1;
    else {
      fullFingerprintMismatchCount += 1;
      fail('FULL_FINGERPRINT_MISMATCH', expected.attemptId);
    }

    if (observed.semanticGold === expected.expectedSemanticGold) semanticGoldMatchCount += 1;
    else {
      semanticGoldMismatchCount += 1;
      fail('SEMANTIC_GOLD_MISMATCH', expected.attemptId);
    }
    if (observed.publicationEligible === expected.expectedPublicationEligible) {
      publicationEligibilityMatchCount += 1;
    } else {
      publicationEligibilityMismatchCount += 1;
      fail('PUBLICATION_ELIGIBILITY_MISMATCH', expected.attemptId);
    }
    if (observed.finalApproval === expected.expectedFinalApproval) finalApprovalMatchCount += 1;
    else {
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
    evaluatedExpectedIds.size === 60 &&
    failures.length === 0 &&
    contractMatchCount === 60 &&
    fullFingerprintMatchCount === 60 &&
    semanticGoldMatchCount === 60 &&
    publicationEligibilityMatchCount === 60 &&
    finalApprovalMatchCount === 60 &&
    errorCount === 0 &&
    negativeApprovalEscapeCount === 0 &&
    semanticPositiveMissCount === 0 &&
    retryViolationCount === 0;

  return Object.freeze({
    passed,
    expectedAttemptCount: 60,
    observedAttemptCount: observedAttempts.length,
    uniqueAttemptCount: new Set(observedIds).size,
    evaluatedExpectedAttemptCount: evaluatedExpectedIds.size,
    contractMatchCount,
    fullFingerprintMatchCount,
    semanticGoldMatchCount,
    publicationEligibilityMatchCount,
    finalApprovalMatchCount,
    fullFingerprintMismatchCount,
    semanticGoldMismatchCount,
    publicationEligibilityMismatchCount,
    finalApprovalMismatchCount,
    errorCount,
    negativeApprovalEscapeCount,
    semanticPositiveMissCount,
    retryViolationCount,
    failures: Object.freeze(failures),
    bindingErrors: Object.freeze([])
  });
}

export function providerHeldoutExecutionAuthorizationV3({ sealedInputs } = {}) {
  const contract = validateAndDeriveSealedHeldoutV3(sealedInputs);
  return Object.freeze({
    providerHeldoutExecutionAuthorized: false,
    sealedExpectationIntegrityPassed: contract.passed,
    independentResultAuditV3Go: false,
    reason: contract.passed
      ? 'INDEPENDENT_RESULT_AUDIT_V3_NOT_SEALED'
      : 'SEALED_EXPECTATION_INTEGRITY_FAILED'
  });
}

export function currentDownstreamExecutionGatesV3() {
  return Object.freeze({
    heldoutGatePassed: false,
    independentResultAuditV3Go: false,
    legacySevenAuthorized: false,
    sample100Authorized: false,
    v4BundleContractSealed: false,
    sample100UserApproval: false,
    gitPushAuthorized: false,
    productionDeployAuthorized: false
  });
}
