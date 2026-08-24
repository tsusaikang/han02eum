import { ORDERED_CORE_KEY_CONTRACT, sha256Hex } from './heldout-admission-v2.mjs';

export const PUBLICATION_ALLOWED_USAGE_VALUES = Object.freeze([
  'match',
  'source-only-preservable',
  'not-applicable'
]);

export const PUBLICATION_VETO_USAGE_VALUES = Object.freeze([
  'unknown',
  'conflict',
  'target-only'
]);

export const LANGUAGE_RULE_WITNESSES = Object.freeze({
  grammaticalPluralNotLexicalCollective: Object.freeze(['v2-case-03']),
  lexicalGroupReferentVersusEventOrState: Object.freeze(['v2-case-04']),
  targetExamplesAreNonExclusive: Object.freeze(['v2-case-08']),
  sourceOnlyUsagePreservation: Object.freeze(['v2-case-02', 'v2-case-05', 'v2-case-07', 'v2-case-09']),
  koreanCapitalizationNotDirectlyApplicable: Object.freeze([
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
  ])
});

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function deriveSemanticGold(coreCase, evidenceCase) {
  if (!coreCase || !evidenceCase || coreCase.caseId !== evidenceCase.caseId) {
    throw new TypeError('core case and evidence case identity must match');
  }
  const example = coreCase.example;
  const fullCoverage = sameJson(
    example.evaluatedSourceExampleIds,
    evidenceCase.source.usableSourceExampleIds
  );
  return coreCase.semantic.targetRelationToSource === 'exact' &&
    example.verdict === 'pass' &&
    fullCoverage &&
    example.targetSenseAttested === true &&
    example.counterexampleSourceExampleId === null
    ? 'positive'
    : 'negative';
}

export function derivePublicationEligible(coreCase, semanticGold) {
  if (!coreCase || !['positive', 'negative'].includes(semanticGold)) {
    throw new TypeError('a core case and semanticGold are required');
  }
  return semanticGold === 'positive' && ORDERED_CORE_KEY_CONTRACT.usage.every((axis) =>
    PUBLICATION_ALLOWED_USAGE_VALUES.includes(coreCase.usage[axis]));
}

export function caseNormativeFingerprintSha256(coreCase) {
  return sha256Hex(JSON.stringify(coreCase));
}

export function deriveHeldoutGold(orderedCore, evidence) {
  if (!Array.isArray(orderedCore) || !Array.isArray(evidence?.cases)) {
    throw new TypeError('ordered core and evidence cases are required');
  }
  if (orderedCore.length !== evidence.cases.length) {
    throw new Error('ordered core and evidence case count differ');
  }

  const cases = orderedCore.map((coreCase, index) => {
    const evidenceCase = evidence.cases[index];
    if (
      coreCase.caseId !== evidenceCase.caseId ||
      coreCase.sourceId !== evidenceCase.source.id ||
      coreCase.targetId !== evidenceCase.target.id
    ) {
      throw new Error(`case identity mismatch at index ${index}`);
    }
    const semanticGold = deriveSemanticGold(coreCase, evidenceCase);
    const publicationEligible = derivePublicationEligible(coreCase, semanticGold);
    const publicationVetoAxes = ORDERED_CORE_KEY_CONTRACT.usage.filter((axis) =>
      PUBLICATION_VETO_USAGE_VALUES.includes(coreCase.usage[axis]));
    return Object.freeze({
      caseId: coreCase.caseId,
      sourceId: coreCase.sourceId,
      targetId: coreCase.targetId,
      normativeFingerprintSha256: caseNormativeFingerprintSha256(coreCase),
      semanticGold,
      publicationEligible,
      expectedFinalApproval: publicationEligible,
      publicationVetoAxes: Object.freeze(publicationVetoAxes)
    });
  });

  const semanticPositiveIds = cases
    .filter((item) => item.semanticGold === 'positive')
    .map((item) => item.caseId);
  const semanticNegativeIds = cases
    .filter((item) => item.semanticGold === 'negative')
    .map((item) => item.caseId);
  const publicationEligibleIds = cases
    .filter((item) => item.publicationEligible)
    .map((item) => item.caseId);

  return Object.freeze({
    cases: Object.freeze(cases),
    semanticPositiveIds: Object.freeze(semanticPositiveIds),
    semanticNegativeIds: Object.freeze(semanticNegativeIds),
    publicationEligibleIds: Object.freeze(publicationEligibleIds),
    semanticPositiveCount: semanticPositiveIds.length,
    semanticNegativeCount: semanticNegativeIds.length,
    publicationEligibleCount: publicationEligibleIds.length,
    quantityAdmissionPassed: semanticPositiveIds.length >= 4 && semanticNegativeIds.length >= 4
  });
}

function collectDiffs(expected, actual, path = '') {
  if (Object.is(expected, actual)) return [];
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const diffs = [];
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      diffs.push(...collectDiffs(expected[index], actual[index], `${path}[${index}]`));
    }
    return diffs;
  }
  if (
    expected && actual &&
    typeof expected === 'object' && typeof actual === 'object' &&
    !Array.isArray(expected) && !Array.isArray(actual)
  ) {
    const diffs = [];
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      diffs.push(...collectDiffs(expected[key], actual[key], path ? `${path}.${key}` : key));
    }
    return diffs;
  }
  return [{ path, expected, actual }];
}

function ruleCodeForDiff(caseId, diff, expectedCase) {
  if (
    LANGUAGE_RULE_WITNESSES.grammaticalPluralNotLexicalCollective.includes(caseId) &&
    (diff.path.startsWith('semantic.') || diff.path.startsWith('example.'))
  ) return 'GRAMMATICAL_PLURAL_POLICY_FINGERPRINT_MISMATCH';
  if (
    LANGUAGE_RULE_WITNESSES.lexicalGroupReferentVersusEventOrState.includes(caseId) &&
    diff.path.startsWith('semantic.')
  ) return 'LEXICAL_GROUP_REFERENT_POLICY_FINGERPRINT_MISMATCH';
  if (
    LANGUAGE_RULE_WITNESSES.targetExamplesAreNonExclusive.includes(caseId) &&
    diff.path.startsWith('example.')
  ) return 'NON_EXCLUSIVE_EXAMPLE_POLICY_FINGERPRINT_MISMATCH';
  if (diff.path === 'usage.capitalization') {
    return 'KOREAN_CAPITALIZATION_POLICY_FINGERPRINT_MISMATCH';
  }
  if (
    diff.path.startsWith('usage.') &&
    diff.expected === 'source-only-preservable'
  ) return 'SOURCE_ONLY_USAGE_POLICY_FINGERPRINT_MISMATCH';
  if (
    diff.path === 'semantic.targetRelationToSource' &&
    expectedCase.semantic.targetRelationToSource !== 'exact' &&
    diff.actual === 'exact' &&
    Object.values(expectedCase.usage).includes('source-only-preservable')
  ) return 'SOURCE_ONLY_USAGE_SEMANTIC_PROMOTION_VIOLATION';
  return 'NORMATIVE_FINGERPRINT_MISMATCH';
}

export function detectPolicyFingerprintViolations(expectedCase, actualCase) {
  if (!expectedCase || !actualCase) {
    return Object.freeze([Object.freeze({
      code: 'NORMATIVE_FINGERPRINT_MISSING',
      path: '',
      expected: expectedCase ?? null,
      actual: actualCase ?? null
    })]);
  }
  const diffs = collectDiffs(expectedCase, actualCase);
  return Object.freeze(diffs.map((diff) => Object.freeze({
    code: ruleCodeForDiff(expectedCase.caseId, diff, expectedCase),
    path: diff.path,
    expected: diff.expected,
    actual: diff.actual
  })));
}

export function applyVetoOnlyPolicy({
  upstreamApproval,
  expectedCase,
  actualCase,
  expectedSemanticGold,
  actualSemanticGold,
  expectedPublicationEligible,
  actualPublicationEligible,
  integrity
}) {
  if (typeof upstreamApproval !== 'boolean') {
    throw new TypeError('upstreamApproval must be boolean');
  }
  const violations = [...detectPolicyFingerprintViolations(expectedCase, actualCase)];
  const observedIntegrity = integrity ?? {};
  if (observedIntegrity.schemaValid !== true) violations.push({ code: 'SCHEMA_INVALID', path: 'integrity.schemaValid' });
  if (observedIntegrity.provenanceValid !== true) violations.push({ code: 'PROVENANCE_INVALID', path: 'integrity.provenanceValid' });
  if (observedIntegrity.coverageValid !== true) violations.push({ code: 'EXAMPLE_COVERAGE_INVALID', path: 'integrity.coverageValid' });
  if (observedIntegrity.error !== null) violations.push({ code: 'ATTEMPT_ERROR', path: 'integrity.error' });
  if (actualSemanticGold !== expectedSemanticGold) {
    violations.push({ code: 'SEMANTIC_GOLD_MISMATCH', path: 'semanticGold' });
  }
  if (actualPublicationEligible !== expectedPublicationEligible) {
    violations.push({ code: 'PUBLICATION_ELIGIBILITY_MISMATCH', path: 'publicationEligible' });
  }
  if (actualCase?.semantic?.targetRelationToSource !== 'exact') {
    violations.push({ code: 'SEMANTIC_NON_EXACT_VETO', path: 'semantic.targetRelationToSource' });
  }
  if (['fail', 'insufficient'].includes(actualCase?.example?.verdict)) {
    violations.push({ code: 'EXAMPLE_NON_PASS_VETO', path: 'example.verdict' });
  }
  for (const axis of ORDERED_CORE_KEY_CONTRACT.usage) {
    if (PUBLICATION_VETO_USAGE_VALUES.includes(actualCase?.usage?.[axis])) {
      violations.push({ code: 'USAGE_PUBLICATION_VETO', path: `usage.${axis}` });
    }
  }
  if (expectedPublicationEligible !== true) {
    violations.push({ code: 'EXPECTED_PUBLICATION_INELIGIBLE', path: 'publicationEligible' });
  }

  const approval = upstreamApproval === true && violations.length === 0;
  return Object.freeze({
    upstreamApproval,
    approval,
    vetoed: upstreamApproval === true && approval === false,
    violations: Object.freeze(violations.map((item) => Object.freeze({ ...item }))),
    observedSemanticGold: actualSemanticGold,
    observedPublicationEligible: actualPublicationEligible,
    observedCase: structuredClone(actualCase),
    correctedFields: Object.freeze([])
  });
}
