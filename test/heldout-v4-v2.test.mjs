import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  HELDOUT_V2_PATHS,
  admitHeldoutV2,
  compareOrderedNormativeCores,
  orderedNormativeCore,
  sha256Hex
} from '../scripts/lib/v4/heldout-admission-v2.mjs';
import {
  LANGUAGE_RULE_WITNESSES,
  applyVetoOnlyPolicy,
  deriveHeldoutGold,
  deriveSemanticGold,
  detectPolicyFingerprintViolations
} from '../scripts/lib/v4/meaning-policy-v2.mjs';
import {
  buildHeldoutAttemptPlan,
  deriveDownstreamExecutionGates,
  evaluateProviderHeldoutGate,
  providerHeldoutExecutionAuthorization
} from '../scripts/lib/v4/heldout-gate-v2.mjs';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const readBytes = (relativePath) => readFileSync(new URL(relativePath, `file://${REPO_ROOT}`));
const readJson = (relativePath) => JSON.parse(readBytes(relativePath).toString('utf8'));
const clone = (value) => structuredClone(value);

const materials = Object.fromEntries(
  Object.entries(HELDOUT_V2_PATHS).map(([key, relativePath]) => [key, readBytes(relativePath)])
);
const evidence = readJson(HELDOUT_V2_PATHS.evidenceV2);
const completedE = JSON.parse(materials.completedE.toString('utf8'));
const completedF = JSON.parse(materials.completedF.toString('utf8'));
const consensus = readJson('pilot/evaluation/v4/heldout-consensus-v2.json');
const gold = readJson('pilot/evaluation/v4/heldout-gold-v2.json');

function caseById(cases, caseId) {
  return cases.find((item) => item.caseId === caseId);
}

function errorCodes(result) {
  return new Set(result.errors.map((item) => item.code));
}

function serializeMutatedForm(form, mutate) {
  const copy = clone(form);
  mutate(copy);
  return Buffer.from(JSON.stringify(copy), 'utf8');
}

function passingAttempts() {
  return buildHeldoutAttemptPlan(consensus.orderedNormativeCore, gold).map((expected) => ({
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

test('actual E/F bundle is admitted and the ordered normative cores are byte-identical', () => {
  const admission = admitHeldoutV2(materials);
  const comparison = compareOrderedNormativeCores(completedE, completedF);

  assert.equal(admission.passed, true, JSON.stringify(admission.errors));
  assert.equal(admission.assertionCount, 498);
  assert.equal(admission.caseCount, 10);
  assert.equal(admission.usageConstCount, 50);
  assert.equal(admission.fullCoverageCaseCount, 10);
  assert.equal(comparison.equal, true);
  assert.equal(comparison.byteLengthE, 4672);
  assert.equal(comparison.sha256E, 'c160a61001fbc07ba9cd28d08b73ddc444debbfb71944a0954fda50135a74de3');
  assert.equal(comparison.sha256F, comparison.sha256E);
  assert.deepEqual(admission.orderedCore, consensus.orderedNormativeCore);
});

test('consensus artifacts mechanically derive five semantic positives, five negatives, and zero publication-eligible cases', () => {
  const derived = deriveHeldoutGold(consensus.orderedNormativeCore, evidence);

  assert.deepEqual(derived.semanticPositiveIds, [
    'v2-case-01', 'v2-case-03', 'v2-case-06', 'v2-case-08', 'v2-case-10'
  ]);
  assert.deepEqual(derived.semanticNegativeIds, [
    'v2-case-02', 'v2-case-04', 'v2-case-05', 'v2-case-07', 'v2-case-09'
  ]);
  assert.deepEqual(derived.publicationEligibleIds, []);
  assert.equal(derived.semanticPositiveCount, 5);
  assert.equal(derived.semanticNegativeCount, 5);
  assert.equal(derived.publicationEligibleCount, 0);
  assert.equal(derived.quantityAdmissionPassed, true);
  assert.deepEqual(derived.cases, gold.cases);
  assert.equal(
    sha256Hex(readBytes('pilot/evaluation/v4/heldout-consensus-v2.json')),
    '9cf1741b5c93be72452464d4f39b9c1f30cd67ef76a5bf7791c73508f6c0b241'
  );
  assert.equal(
    sha256Hex(readBytes('pilot/evaluation/v4/heldout-gold-v2.json')),
    '16eb2c60026269c782216af128e5e72d8b056c271138deaa16e7fa43c34f0e07'
  );
});

test('one normative field disagreement fails direct E/F consensus without selecting a value', () => {
  const alteredF = clone(completedF);
  alteredF.cases[0].semantic.targetRelationToSource = 'broader';
  const comparison = compareOrderedNormativeCores(completedE, alteredF);
  const violations = detectPolicyFingerprintViolations(
    orderedNormativeCore(completedE)[0],
    orderedNormativeCore(alteredF)[0]
  );

  assert.equal(comparison.equal, false);
  assert.notEqual(comparison.sha256E, comparison.sha256F);
  assert.deepEqual(violations.map((item) => item.path), ['semantic.targetRelationToSource']);
});

test('fewer than four positives fails the preregistered quantity gate', () => {
  const alteredCore = clone(consensus.orderedNormativeCore);
  caseById(alteredCore, 'v2-case-01').semantic.targetRelationToSource = 'broader';
  caseById(alteredCore, 'v2-case-03').semantic.targetRelationToSource = 'broader';
  const derived = deriveHeldoutGold(alteredCore, evidence);

  assert.equal(derived.semanticPositiveCount, 3);
  assert.equal(derived.semanticNegativeCount, 7);
  assert.equal(derived.quantityAdmissionPassed, false);
});

test('raw SHA tampering is rejected fail-closed', () => {
  const alteredMaterials = { ...materials, evidenceV2: Buffer.concat([materials.evidenceV2, Buffer.from('\n')]) };
  const result = admitHeldoutV2(alteredMaterials);

  assert.equal(result.passed, false);
  assert.equal(errorCodes(result).has('RAW_SHA256_MISMATCH'), true);
});

test('read-list tampering is independently rejected after parsing', () => {
  const alteredMaterials = {
    ...materials,
    completedE: serializeMutatedForm(completedE, (form) => {
      form.readListAttestation.files[0].path = 'pilot/evaluation/v4/not-the-sealed-evidence.json';
    })
  };
  const result = admitHeldoutV2(alteredMaterials);

  assert.equal(result.passed, false);
  assert.equal(errorCodes(result).has('RAW_SHA256_MISMATCH'), true);
  assert.equal(errorCodes(result).has('READ_LIST_ENTRY_BINDING_MISMATCH'), true);
});

test('usage const tampering is rejected and also breaks E/F equality', () => {
  const alteredE = clone(completedE);
  alteredE.cases[0].usage.register = 'match';
  const alteredMaterials = { ...materials, completedE: Buffer.from(JSON.stringify(alteredE)) };
  const result = admitHeldoutV2(alteredMaterials);

  assert.equal(result.passed, false);
  assert.equal(errorCodes(result).has('USAGE_CONST_MISMATCH'), true);
  assert.equal(errorCodes(result).has('ORDERED_CORE_BYTE_MISMATCH'), true);
  assert.equal(compareOrderedNormativeCores(alteredE, completedF).equal, false);
});

test('example coverage and verdict combinations are both enforced', () => {
  const coverageMaterials = {
    ...materials,
    completedE: serializeMutatedForm(completedE, (form) => {
      form.cases[0].example.evaluatedSourceExampleIds = [];
    })
  };
  const combinationMaterials = {
    ...materials,
    completedE: serializeMutatedForm(completedE, (form) => {
      form.cases[1].example.counterexampleSourceExampleId = null;
    })
  };

  assert.equal(errorCodes(admitHeldoutV2(coverageMaterials)).has('EXAMPLE_COVERAGE_MISMATCH'), true);
  assert.equal(errorCodes(admitHeldoutV2(coverageMaterials)).has('FULL_COVERAGE_CASE_COUNT_MISMATCH'), true);
  assert.equal(errorCodes(admitHeldoutV2(combinationMaterials)).has('EXAMPLE_FAIL_COMBINATION_INVALID'), true);
});

test('grammatical plural does not convert a singular member sense into a collective sense', () => {
  const evidenceCase = caseById(evidence.cases, 'v2-case-03');
  const expected = caseById(consensus.orderedNormativeCore, 'v2-case-03');
  const altered = clone(expected);
  altered.semantic.targetRelationToSource = 'broader';

  assert.deepEqual(LANGUAGE_RULE_WITNESSES.grammaticalPluralNotLexicalCollective, ['v2-case-03']);
  assert.match(evidenceCase.source.definitionEn, /A literary composition/);
  assert.match(evidenceCase.source.rawExampleEntries.find((item) => item.usable).text, /plays/);
  assert.equal(expected.semantic.targetRelationToSource, 'exact');
  assert.equal(expected.example.verdict, 'pass');
  assert.equal(
    detectPolicyFingerprintViolations(expected, altered)[0].code,
    'GRAMMATICAL_PLURAL_POLICY_FINGERPRINT_MISMATCH'
  );
});

test('a lexical person/group referent remains distinct from an event or state', () => {
  const evidenceCase = caseById(evidence.cases, 'v2-case-04');
  const expected = caseById(consensus.orderedNormativeCore, 'v2-case-04');
  const altered = clone(expected);
  altered.semantic.targetRelationToSource = 'exact';

  assert.match(evidenceCase.source.definitionEn, /person or group of people/);
  assert.match(evidenceCase.target.definitionEn, /act of looking/);
  assert.equal(expected.semantic.targetRelationToSource, 'disjoint');
  assert.equal(
    detectPolicyFingerprintViolations(expected, altered)[0].code,
    'LEXICAL_GROUP_REFERENT_POLICY_FINGERPRINT_MISMATCH'
  );
});

test('target example lists are non-exclusive evidence and cannot narrow an attested exact sense', () => {
  const evidenceCase = caseById(evidence.cases, 'v2-case-08');
  const expected = caseById(consensus.orderedNormativeCore, 'v2-case-08');
  const altered = clone(expected);
  altered.example.verdict = 'fail';

  assert.match(evidenceCase.source.rawExampleEntries[0].text, /flag/);
  assert.match(evidenceCase.source.rawExampleEntries[1].text, /bills/);
  assert.equal(evidenceCase.target.examples.some((item) => /flag|bills/i.test(item.text)), false);
  assert.equal(expected.semantic.targetRelationToSource, 'exact');
  assert.equal(expected.example.verdict, 'pass');
  assert.equal(
    detectPolicyFingerprintViolations(expected, altered)[0].code,
    'NON_EXCLUSIVE_EXAMPLE_POLICY_FINGERPRINT_MISMATCH'
  );
});

test('Korean capitalization is unknown here, never inferred as target conflict', () => {
  assert.equal(consensus.orderedNormativeCore.every((item) => item.usage.capitalization === 'unknown'), true);
  const expected = caseById(consensus.orderedNormativeCore, 'v2-case-01');
  const altered = clone(expected);
  altered.usage.capitalization = 'conflict';

  assert.equal(
    detectPolicyFingerprintViolations(expected, altered)[0].code,
    'KOREAN_CAPITALIZATION_POLICY_FINGERPRINT_MISMATCH'
  );
});

test('source-only usage is preserved without promoting semantic exactness', () => {
  const expected = caseById(consensus.orderedNormativeCore, 'v2-case-02');
  const evidenceCase = caseById(evidence.cases, 'v2-case-02');
  const alteredUsage = clone(expected);
  const alteredSemantic = clone(expected);
  alteredUsage.usage.domain = 'match';
  alteredSemantic.semantic.targetRelationToSource = 'exact';

  assert.equal(expected.usage.domain, 'source-only-preservable');
  assert.equal(deriveSemanticGold(expected, evidenceCase), 'negative');
  assert.equal(
    detectPolicyFingerprintViolations(expected, alteredUsage)[0].code,
    'SOURCE_ONLY_USAGE_POLICY_FINGERPRINT_MISMATCH'
  );
  assert.equal(
    detectPolicyFingerprintViolations(expected, alteredSemantic)[0].code,
    'SOURCE_ONLY_USAGE_SEMANTIC_PROMOTION_VIOLATION'
  );
});

test('deterministic policy is monotone veto-only and never rewrites observed values', () => {
  const cleanCase = {
    caseId: 'synthetic-clean', sourceId: 'source', targetId: 'target',
    semantic: { targetRelationToSource: 'exact' },
    usage: {
      register: 'match', domain: 'match', temporal: 'match', regional: 'match', capitalization: 'match'
    },
    example: {
      verdict: 'pass', evaluatedSourceExampleIds: ['example-1'],
      targetSenseAttested: true, counterexampleSourceExampleId: null
    }
  };
  const integrity = { schemaValid: true, provenanceValid: true, coverageValid: true, error: null };
  const upstreamRejected = applyVetoOnlyPolicy({
    upstreamApproval: false,
    expectedCase: cleanCase,
    actualCase: cleanCase,
    expectedSemanticGold: 'positive',
    actualSemanticGold: 'positive',
    expectedPublicationEligible: true,
    actualPublicationEligible: true,
    integrity
  });
  const upstreamApproved = applyVetoOnlyPolicy({
    upstreamApproval: true,
    expectedCase: cleanCase,
    actualCase: cleanCase,
    expectedSemanticGold: 'positive',
    actualSemanticGold: 'positive',
    expectedPublicationEligible: true,
    actualPublicationEligible: true,
    integrity
  });
  const nonExact = clone(cleanCase);
  nonExact.semantic.targetRelationToSource = 'broader';
  const vetoed = applyVetoOnlyPolicy({
    upstreamApproval: true,
    expectedCase: cleanCase,
    actualCase: nonExact,
    expectedSemanticGold: 'positive',
    actualSemanticGold: 'negative',
    expectedPublicationEligible: true,
    actualPublicationEligible: false,
    integrity
  });

  assert.equal(upstreamRejected.approval, false);
  assert.equal(upstreamApproved.approval, true);
  assert.equal(vetoed.approval, false);
  assert.equal(vetoed.vetoed, true);
  assert.equal(vetoed.observedCase.semantic.targetRelationToSource, 'broader');
  assert.deepEqual(vetoed.correctedFields, []);
});

test('the fixed provider plan contains exactly 60 unique, zero-retry attempts', () => {
  const plan = buildHeldoutAttemptPlan(consensus.orderedNormativeCore, gold);

  assert.equal(plan.length, 60);
  assert.equal(new Set(plan.map((item) => item.attemptId)).size, 60);
  assert.deepEqual(new Set(plan.map((item) => item.modelRole)), new Set(['primary', 'blind-verifier']));
  assert.deepEqual(new Set(plan.map((item) => item.temperature)), new Set([0]));
  assert.deepEqual(new Set(plan.map((item) => item.retryIndex)), new Set([0]));
  assert.equal(plan.every((item) => item.promptContract === 'bilingual-equivalence/v4-preregistered-1'), true);
});

test('a synthetic complete 60-attempt result is the only passing held-out shape', () => {
  const result = evaluateProviderHeldoutGate({
    attempts: passingAttempts(),
    orderedCore: consensus.orderedNormativeCore,
    gold
  });

  assert.equal(result.passed, true, JSON.stringify(result.failures));
  assert.equal(result.observedAttemptCount, 60);
  assert.equal(result.uniqueAttemptCount, 60);
  assert.equal(result.fullFingerprintMatchCount, 60);
  assert.equal(result.semanticGoldMatchCount, 60);
  assert.equal(result.publicationEligibilityMatchCount, 60);
  assert.equal(result.finalApprovalMatchCount, 60);
  assert.equal(result.errorCount, 0);
  assert.equal(result.negativeApprovalEscapeCount, 0);
  assert.equal(result.semanticPositiveMissCount, 0);
  assert.equal(result.retryViolationCount, 0);
});

test('every preregistered held-out failure class closes the gate', async (t) => {
  const cases = [
    ['missing attempt', (attempts) => attempts.pop(), 'ATTEMPT_COUNT_MISMATCH'],
    ['duplicate attempt', (attempts) => { attempts[59] = clone(attempts[0]); }, 'ATTEMPT_ID_DUPLICATE'],
    ['contract mismatch', (attempts) => { attempts[0].model = 'unregistered-model'; }, 'ATTEMPT_CONTRACT_MISMATCH'],
    ['retry', (attempts) => { attempts[0].retryIndex = 1; }, 'RETRY_PROHIBITED'],
    ['attempt error', (attempts) => { attempts[0].status = 'error'; attempts[0].error = 'synthetic'; }, 'ATTEMPT_ERROR_OR_INTEGRITY_FAILURE'],
    ['schema failure', (attempts) => { attempts[0].schemaValid = false; }, 'ATTEMPT_ERROR_OR_INTEGRITY_FAILURE'],
    ['provenance failure', (attempts) => { attempts[0].provenanceValid = false; }, 'ATTEMPT_ERROR_OR_INTEGRITY_FAILURE'],
    ['coverage failure', (attempts) => { attempts[0].coverageValid = false; }, 'ATTEMPT_ERROR_OR_INTEGRITY_FAILURE'],
    ['fingerprint mismatch', (attempts) => { attempts[0].normativeFingerprintSha256 = '0'.repeat(64); }, 'FULL_FINGERPRINT_MISMATCH'],
    ['semantic gold mismatch', (attempts) => { attempts[0].semanticGold = 'negative'; }, 'SEMANTIC_GOLD_MISMATCH'],
    ['publication mismatch', (attempts) => { attempts[0].publicationEligible = true; }, 'PUBLICATION_ELIGIBILITY_MISMATCH'],
    ['final approval mismatch', (attempts) => { attempts[0].finalApproval = true; }, 'FINAL_APPROVAL_MISMATCH'],
    ['negative approval escape', (attempts) => {
      const item = attempts.find((attempt) => attempt.semanticGold === 'negative');
      item.finalApproval = true;
    }, 'NEGATIVE_APPROVAL_ESCAPE'],
    ['semantic-positive miss', (attempts) => {
      const item = attempts.find((attempt) => attempt.semanticGold === 'positive');
      item.normativeFingerprintSha256 = 'f'.repeat(64);
    }, 'SEMANTIC_POSITIVE_MISS']
  ];

  for (const [name, mutate, expectedCode] of cases) {
    await t.test(name, () => {
      const attempts = passingAttempts();
      mutate(attempts);
      const result = evaluateProviderHeldoutGate({ attempts, orderedCore: consensus.orderedNormativeCore, gold });
      assert.equal(result.passed, false);
      assert.equal(result.failures.some((failure) => failure.code === expectedCode), true, JSON.stringify(result.failures));
    });
  }
});

test('provider, legacy-seven, and sample-100 gates remain closed until every separate prerequisite is true', () => {
  assert.deepEqual(
    providerHeldoutExecutionAuthorization({ admissionPassed: true, independentResultAuditGo: false }),
    {
      providerHeldoutExecutionAuthorized: false,
      admissionPassed: true,
      independentResultAuditGo: false
    }
  );
  assert.equal(
    providerHeldoutExecutionAuthorization({ admissionPassed: true, independentResultAuditGo: true })
      .providerHeldoutExecutionAuthorized,
    true
  );

  assert.deepEqual(
    deriveDownstreamExecutionGates({ heldoutGatePassed: false, independentResultAuditGo: false }),
    {
      legacySevenAuthorized: false,
      sample100Authorized: false,
      heldoutGatePassed: false,
      independentResultAuditGo: false,
      v4BundleContractSealed: false,
      sample100UserApproval: false
    }
  );
  assert.equal(
    deriveDownstreamExecutionGates({ heldoutGatePassed: true, independentResultAuditGo: false })
      .legacySevenAuthorized,
    false
  );
  const heldoutAndAuditOnly = deriveDownstreamExecutionGates({
    heldoutGatePassed: true,
    independentResultAuditGo: true
  });
  assert.equal(heldoutAndAuditOnly.legacySevenAuthorized, true);
  assert.equal(heldoutAndAuditOnly.sample100Authorized, false);
  assert.equal(
    deriveDownstreamExecutionGates({
      heldoutGatePassed: true,
      independentResultAuditGo: true,
      v4BundleContractSealed: true,
      sample100UserApproval: false
    }).sample100Authorized,
    false
  );
  assert.equal(
    deriveDownstreamExecutionGates({
      heldoutGatePassed: true,
      independentResultAuditGo: true,
      v4BundleContractSealed: true,
      sample100UserApproval: true
    }).sample100Authorized,
    true
  );
});
