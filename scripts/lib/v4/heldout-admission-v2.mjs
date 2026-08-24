import { createHash } from 'node:crypto';

export const HELDOUT_V2_PATHS = Object.freeze({
  basePreregistrationV2: 'docs/AI_MAPPING_V4_PREREGISTRATION_V2.md',
  baseSealV2: 'pilot/evaluation/v4/preregistration-seal-v2.json',
  packetPreregistrationV2: 'docs/AI_MAPPING_V4_HELDOUT_PACKET_V2_PREREGISTRATION.md',
  packetSealV2: 'pilot/evaluation/v4/heldout-packet-seal-v2.json',
  evidenceV2: 'pilot/evaluation/v4/heldout-evidence-v2.json',
  protocolPreregistrationV3: 'docs/AI_MAPPING_V4_HELDOUT_PACKET_V3_PREREGISTRATION.md',
  instructionsV3: 'pilot/evaluation/v4/heldout-adjudication-instructions-v3.md',
  schemaV3: 'pilot/evaluation/v4/heldout-adjudication-schema-v3.json',
  protocolSealV3: 'pilot/evaluation/v4/heldout-packet-protocol-seal-v3.json',
  methodologyAuditV2: 'pilot/evaluation/v4/heldout-packet-methodology-audit-v2.json',
  methodologyAuditV3: 'pilot/evaluation/v4/heldout-packet-methodology-audit-v3.json',
  blankConformanceV3: 'pilot/evaluation/v4/heldout-blank-conformance-v3.json',
  executionSealV3: 'pilot/evaluation/v4/heldout-execution-seal-v3.json',
  blankE: 'pilot/evaluation/v4/heldout-adjudication-form-E-v3.blank.json',
  blankF: 'pilot/evaluation/v4/heldout-adjudication-form-F-v3.blank.json',
  completedE: 'pilot/evaluation/v4/heldout-adjudication-form-E-v3.completed.json',
  completedF: 'pilot/evaluation/v4/heldout-adjudication-form-F-v3.completed.json'
});

export const HELDOUT_V2_EXPECTED_SHA256 = Object.freeze({
  basePreregistrationV2: '958fc4b938674bfd224a94978468e8e0ec4ccfc0f6c49ef72ffffb2cc823e247',
  baseSealV2: '275dab2605a91ae0e04adf1ac99315cf0ab307d6b613b8fbeda3cb2b7c418867',
  packetPreregistrationV2: '4071a1054ce75d5e341b2effd21fda194f96eeef9710bbb15004c00e76f50b6d',
  packetSealV2: '543cacc834b3d4239a8c6b2b208e3b5c0ed15a8afe0df1efb18246a76a11ca1d',
  evidenceV2: 'a6b27e32c6c5ff28a1959eae37665c1ef6b23cc7e28402b4e411bb7cf36bd83f',
  protocolPreregistrationV3: '376960bd0a558b66af4b9ae92ee80f922f23349ec06d879762561e33228b90be',
  instructionsV3: '19732c603b9967e6bf8a8109a9d4a21391618aaeafc26748e60a43f90a61e189',
  schemaV3: 'f413ded822847b29d5a85417f7d9254a49c32e0b93a8668b3c7eb08e19026e88',
  protocolSealV3: '04180df753761cc4478ed6bb56188f3012debc922f5d5dcfa602c67761b51b00',
  methodologyAuditV2: '47645141ea18cbe85758c7fef2a0085208913a8b409b58d6bf243dbff7dfeb45',
  methodologyAuditV3: '70c19640f97f60ede0c44b630fd4d2c46d4e19db245125a5e7115e89fa3924d8',
  blankConformanceV3: 'a9553481a4111b72bdb5fa894962aeee7ff627f3ca03f6a0c3471395d2556128',
  executionSealV3: '6ba74ea9b3cdf97bb2a384a0d578d126d239509dd2e0bf87139ff50380ad7572',
  blankE: '28326ae33014f7447befcbdd705f61dcab5cfd1788f81faaf7733cbba4058860',
  blankF: '188a71634af12dac8a2472c962994286e72e50c05a487842c7a8faa82f09bcae',
  completedE: '916cf75e1fc9d7c0db267373fa3f191767ab33ba3d3c9f4066c3af492dbc799a',
  completedF: 'f6e388665329e64b85552f111f09358376b57541b42e0985bebc4b1800b9aa78'
});

export const ORDERED_CORE_KEY_CONTRACT = Object.freeze({
  case: Object.freeze(['caseId', 'sourceId', 'targetId', 'semantic', 'usage', 'example']),
  semantic: Object.freeze(['targetRelationToSource']),
  usage: Object.freeze(['register', 'domain', 'temporal', 'regional', 'capitalization']),
  example: Object.freeze([
    'verdict',
    'evaluatedSourceExampleIds',
    'targetSenseAttested',
    'counterexampleSourceExampleId'
  ])
});

const RELATIONS = new Set(['exact', 'broader', 'narrower', 'overlap', 'disjoint']);
const USAGE_VALUES = new Set([
  'match',
  'source-only-preservable',
  'target-only',
  'conflict',
  'not-applicable',
  'unknown'
]);
const EXAMPLE_VERDICTS = new Set(['pass', 'fail', 'insufficient']);

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === 'string') return Buffer.from(value, 'utf8');
  throw new TypeError('material must be a Buffer, Uint8Array, or UTF-8 string');
}

export function sha256Hex(value) {
  return createHash('sha256').update(toBuffer(value)).digest('hex');
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

export function sealProjectionSha256(document) {
  const projection = structuredClone(document);
  delete projection.sealSelfIntegrity;
  return sha256Hex(canonicalJson(projection));
}

function exactKeys(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key));
}

function parseJson(bytes, key, check) {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    check(false, 'JSON_PARSE_ERROR', key);
    return null;
  }
}

function lfSha256(values) {
  return sha256Hex(`${values.join('\n')}\n`);
}

export function orderedNormativeCore(form) {
  if (!form || !Array.isArray(form.cases)) {
    throw new TypeError('completed form must contain a cases array');
  }

  return form.cases.map((caseResult) => ({
    caseId: caseResult.caseId,
    sourceId: caseResult.sourceId,
    targetId: caseResult.targetId,
    semantic: {
      targetRelationToSource: caseResult.semantic?.targetRelationToSource
    },
    usage: {
      register: caseResult.usage?.register,
      domain: caseResult.usage?.domain,
      temporal: caseResult.usage?.temporal,
      regional: caseResult.usage?.regional,
      capitalization: caseResult.usage?.capitalization
    },
    example: {
      verdict: caseResult.example?.verdict,
      evaluatedSourceExampleIds: Array.isArray(caseResult.example?.evaluatedSourceExampleIds)
        ? [...caseResult.example.evaluatedSourceExampleIds]
        : caseResult.example?.evaluatedSourceExampleIds,
      targetSenseAttested: caseResult.example?.targetSenseAttested,
      counterexampleSourceExampleId: caseResult.example?.counterexampleSourceExampleId
    }
  }));
}

export function serializeOrderedNormativeCore(form) {
  return Buffer.from(JSON.stringify(orderedNormativeCore(form)), 'utf8');
}

export function compareOrderedNormativeCores(formE, formF) {
  const bytesE = serializeOrderedNormativeCore(formE);
  const bytesF = serializeOrderedNormativeCore(formF);
  return Object.freeze({
    equal: bytesE.equals(bytesF),
    byteLengthE: bytesE.length,
    byteLengthF: bytesF.length,
    sha256E: sha256Hex(bytesE),
    sha256F: sha256Hex(bytesF),
    bytesE,
    bytesF
  });
}

function validateCompletedForm({ form, slot, evidence, actualSha256, executionSeal, check }) {
  const own = slot === 'E'
    ? {
        formId: 'meaning-link-v4-heldout-10-v2-E-v3',
        outputPath: HELDOUT_V2_PATHS.completedE,
        blankPath: HELDOUT_V2_PATHS.blankE,
        blankKey: 'blankE'
      }
    : {
        formId: 'meaning-link-v4-heldout-10-v2-F-v3',
        outputPath: HELDOUT_V2_PATHS.completedF,
        blankPath: HELDOUT_V2_PATHS.blankF,
        blankKey: 'blankF'
      };
  const prefix = `form-${slot}`;
  const topKeys = [
    'schemaVersion',
    'protocolId',
    'packetId',
    'evidenceSha256',
    'formId',
    'adjudicatorSlot',
    'outputIdentity',
    'executionSealBindingCompleted',
    'executionSealSha256',
    'readListAttestation',
    'cases'
  ];

  check(exactKeys(form, topKeys, ['nonNormativeNotes']), 'FORM_CLOSED_SHAPE_MISMATCH', prefix);
  check(form?.schemaVersion === 'meaning-link-v4-heldout-adjudication-form/v3', 'FORM_SCHEMA_VERSION_MISMATCH', prefix);
  check(form?.protocolId === 'meaning-link-v4-heldout-10-v2-protocol-v3', 'FORM_PROTOCOL_ID_MISMATCH', prefix);
  check(form?.packetId === evidence.packetId, 'FORM_PACKET_ID_MISMATCH', prefix);
  check(form?.evidenceSha256 === actualSha256.evidenceV2, 'FORM_EVIDENCE_SHA_MISMATCH', prefix);
  check(form?.formId === own.formId && form?.adjudicatorSlot === slot, 'FORM_SLOT_IDENTITY_MISMATCH', prefix);
  check(
    JSON.stringify(form?.outputIdentity) === JSON.stringify({
      path: own.outputPath,
      mediaType: 'application/json',
      writeMode: 'create-new-preserve-blank'
    }),
    'FORM_OUTPUT_IDENTITY_MISMATCH',
    prefix
  );
  check(
    form?.executionSealBindingCompleted === true &&
      form?.executionSealSha256 === actualSha256.executionSealV3,
    'FORM_EXECUTION_SEAL_BINDING_MISMATCH',
    prefix
  );

  const attestation = form?.readListAttestation;
  check(
    exactKeys(attestation, [
      'exactReadListOnly',
      'fileCount',
      'otherAdjudicationSeen',
      'discussionOccurred',
      'providerOrProjectAiUsed',
      'files'
    ]),
    'READ_LIST_ATTESTATION_SHAPE_MISMATCH',
    prefix
  );
  check(
    attestation?.exactReadListOnly === true &&
      attestation?.fileCount === 5 &&
      attestation?.otherAdjudicationSeen === false &&
      attestation?.discussionOccurred === false &&
      attestation?.providerOrProjectAiUsed === false,
    'READ_LIST_ATTESTATION_VALUE_MISMATCH',
    prefix
  );

  const expectedReadList = [
    ['evidenceV2', HELDOUT_V2_PATHS.evidenceV2],
    ['instructionsV3', HELDOUT_V2_PATHS.instructionsV3],
    ['schemaV3', HELDOUT_V2_PATHS.schemaV3],
    [own.blankKey, own.blankPath],
    ['executionSealV3', HELDOUT_V2_PATHS.executionSealV3]
  ];
  check(Array.isArray(attestation?.files) && attestation.files.length === 5, 'READ_LIST_COUNT_MISMATCH', prefix);
  for (let index = 0; index < expectedReadList.length; index += 1) {
    const [materialKey, expectedPath] = expectedReadList[index];
    const entry = attestation?.files?.[index];
    check(exactKeys(entry, ['path', 'sha256']), 'READ_LIST_ENTRY_SHAPE_MISMATCH', `${prefix}/${index}`);
    check(
      entry?.path === expectedPath && entry?.sha256 === actualSha256[materialKey],
      'READ_LIST_ENTRY_BINDING_MISMATCH',
      `${prefix}/${index}`
    );
    if (index < 4) {
      const sealed = executionSeal.find((item) => item.path === expectedPath);
      check(sealed?.sha256 === entry?.sha256, 'READ_LIST_EXECUTION_SEAL_MISMATCH', `${prefix}/${index}`);
    }
  }

  check(Array.isArray(form?.cases) && form.cases.length === 10, 'FORM_CASE_COUNT_MISMATCH', prefix);
  let usageConstCount = 0;
  let fullCoverageCount = 0;
  for (let index = 0; index < evidence.cases.length; index += 1) {
    const evidenceCase = evidence.cases[index];
    const caseResult = form?.cases?.[index];
    const path = `${prefix}/${evidenceCase.caseId}`;
    check(exactKeys(caseResult, ORDERED_CORE_KEY_CONTRACT.case), 'CASE_CORE_SHAPE_MISMATCH', path);
    check(
      caseResult?.caseId === evidenceCase.caseId &&
        caseResult?.sourceId === evidenceCase.source.id &&
        caseResult?.targetId === evidenceCase.target.id,
      'CASE_IDENTITY_MISMATCH',
      path
    );
    check(
      exactKeys(caseResult?.semantic, ORDERED_CORE_KEY_CONTRACT.semantic) &&
        RELATIONS.has(caseResult?.semantic?.targetRelationToSource),
      'SEMANTIC_CORE_INVALID',
      path
    );
    check(exactKeys(caseResult?.usage, ORDERED_CORE_KEY_CONTRACT.usage), 'USAGE_CORE_SHAPE_MISMATCH', path);
    for (const axis of ORDERED_CORE_KEY_CONTRACT.usage) {
      check(USAGE_VALUES.has(caseResult?.usage?.[axis]), 'USAGE_ENUM_INVALID', `${path}/${axis}`);
      check(
        caseResult?.usage?.[axis] === evidenceCase.usageAxes[axis].deterministicValue,
        'USAGE_CONST_MISMATCH',
        `${path}/${axis}`
      );
      usageConstCount += 1;
    }
    check(exactKeys(caseResult?.example, ORDERED_CORE_KEY_CONTRACT.example), 'EXAMPLE_CORE_SHAPE_MISMATCH', path);
    const example = caseResult?.example;
    const usableIds = evidenceCase.source.usableSourceExampleIds;
    check(EXAMPLE_VERDICTS.has(example?.verdict), 'EXAMPLE_VERDICT_INVALID', path);
    check(
      Array.isArray(example?.evaluatedSourceExampleIds) &&
        JSON.stringify(example.evaluatedSourceExampleIds) === JSON.stringify(usableIds),
      'EXAMPLE_COVERAGE_MISMATCH',
      path
    );
    if (JSON.stringify(example?.evaluatedSourceExampleIds) === JSON.stringify(usableIds)) fullCoverageCount += 1;
    check(
      new Set(example?.evaluatedSourceExampleIds ?? []).size === (example?.evaluatedSourceExampleIds?.length ?? -1),
      'EXAMPLE_COVERAGE_DUPLICATE',
      path
    );
    if (example?.verdict === 'pass') {
      check(
        example.targetSenseAttested === true && example.counterexampleSourceExampleId === null,
        'EXAMPLE_PASS_COMBINATION_INVALID',
        path
      );
    } else if (example?.verdict === 'fail') {
      check(
        example.targetSenseAttested === true && usableIds.includes(example.counterexampleSourceExampleId),
        'EXAMPLE_FAIL_COMBINATION_INVALID',
        path
      );
    } else if (example?.verdict === 'insufficient') {
      check(
        example.targetSenseAttested === false && example.counterexampleSourceExampleId === null,
        'EXAMPLE_INSUFFICIENT_COMBINATION_INVALID',
        path
      );
    }
  }
  check(usageConstCount === 50, 'USAGE_CONST_COUNT_MISMATCH', prefix);
  check(fullCoverageCount === 10, 'FULL_COVERAGE_CASE_COUNT_MISMATCH', prefix);
  if (form?.nonNormativeNotes !== undefined) {
    check(
      Array.isArray(form.nonNormativeNotes) &&
        form.nonNormativeNotes.length <= 20 &&
        form.nonNormativeNotes.every((note) => typeof note === 'string' && note.length <= 2000),
      'NON_NORMATIVE_NOTES_INVALID',
      prefix
    );
  }
}

export function admitHeldoutV2(materials) {
  const errors = [];
  let assertionCount = 0;
  const check = (condition, code, path) => {
    assertionCount += 1;
    if (!condition) errors.push(Object.freeze({ code, path }));
  };
  const materialKeys = Object.keys(HELDOUT_V2_PATHS);
  check(
    exactKeys(materials, materialKeys),
    'MATERIAL_SET_MISMATCH',
    'materials'
  );

  const bytes = {};
  for (const key of materialKeys) {
    try {
      bytes[key] = toBuffer(materials?.[key]);
    } catch {
      bytes[key] = Buffer.alloc(0);
      check(false, 'MATERIAL_BYTES_INVALID', key);
    }
  }
  const actualSha256 = Object.fromEntries(materialKeys.map((key) => [key, sha256Hex(bytes[key])]));
  for (const key of materialKeys) {
    check(actualSha256[key] === HELDOUT_V2_EXPECTED_SHA256[key], 'RAW_SHA256_MISMATCH', key);
  }

  const baseSeal = parseJson(bytes.baseSealV2, 'baseSealV2', check);
  const packetSeal = parseJson(bytes.packetSealV2, 'packetSealV2', check);
  const evidence = parseJson(bytes.evidenceV2, 'evidenceV2', check);
  const protocolSeal = parseJson(bytes.protocolSealV3, 'protocolSealV3', check);
  const methodologyAuditV2 = parseJson(bytes.methodologyAuditV2, 'methodologyAuditV2', check);
  const methodologyAuditV3 = parseJson(bytes.methodologyAuditV3, 'methodologyAuditV3', check);
  const blankConformance = parseJson(bytes.blankConformanceV3, 'blankConformanceV3', check);
  const executionSeal = parseJson(bytes.executionSealV3, 'executionSealV3', check);
  const schema = parseJson(bytes.schemaV3, 'schemaV3', check);
  const completedE = parseJson(bytes.completedE, 'completedE', check);
  const completedF = parseJson(bytes.completedF, 'completedF', check);

  if ([baseSeal, packetSeal, evidence, protocolSeal, methodologyAuditV2, methodologyAuditV3,
    blankConformance, executionSeal, schema, completedE, completedF].some((value) => value === null)) {
    return Object.freeze({ passed: false, assertionCount, errors: Object.freeze(errors) });
  }

  check(
    baseSeal.sealedFiles?.some((item) =>
      item.path === HELDOUT_V2_PATHS.basePreregistrationV2 &&
      item.sha256 === actualSha256.basePreregistrationV2),
    'BASE_SEAL_BINDING_MISMATCH',
    'baseSealV2'
  );
  check(
    sealProjectionSha256(packetSeal) === packetSeal.sealSelfIntegrity?.projectionSha256,
    'PACKET_SEAL_SELF_PROJECTION_MISMATCH',
    'packetSealV2'
  );
  check(
    sealProjectionSha256(protocolSeal) === protocolSeal.sealSelfIntegrity?.projectionSha256,
    'PROTOCOL_SEAL_SELF_PROJECTION_MISMATCH',
    'protocolSealV3'
  );
  for (const key of ['packetPreregistrationV2', 'evidenceV2']) {
    check(
      packetSeal.sealedFiles?.some((item) =>
        item.path === HELDOUT_V2_PATHS[key] && item.sha256 === actualSha256[key]),
      'PACKET_SEAL_FILE_BINDING_MISMATCH',
      key
    );
  }
  for (const key of ['protocolPreregistrationV3', 'instructionsV3', 'schemaV3']) {
    check(
      protocolSeal.sealedProtocolFiles?.some((item) =>
        item.path === HELDOUT_V2_PATHS[key] && item.sha256 === actualSha256[key]),
      'PROTOCOL_SEAL_FILE_BINDING_MISMATCH',
      key
    );
  }
  check(protocolSeal.evidenceIdentity?.sha256 === actualSha256.evidenceV2, 'PROTOCOL_EVIDENCE_SHA_MISMATCH', 'protocolSealV3');
  check(
    methodologyAuditV2.verdict === 'NO-GO' &&
      methodologyAuditV2.methodAuditGo === false &&
      methodologyAuditV2.findingCounts?.P1 === 2,
    'HISTORICAL_METHOD_AUDIT_V2_STATE_MISMATCH',
    'methodologyAuditV2'
  );
  check(
    methodologyAuditV3.verdict === 'GO' &&
      methodologyAuditV3.methodAuditGo === true &&
      methodologyAuditV3.findingCounts?.P0 === 0 &&
      methodologyAuditV3.findingCounts?.P1 === 0,
    'METHOD_AUDIT_V3_NOT_GO',
    'methodologyAuditV3'
  );
  const protocolAuditInput = methodologyAuditV3.exactReadAttestation?.inputFiles?.find(
    (item) => item.path === HELDOUT_V2_PATHS.protocolSealV3
  );
  check(
    protocolAuditInput?.actualRawSha256 === actualSha256.protocolSealV3 &&
      protocolAuditInput?.actualProjectionSha256 === sealProjectionSha256(protocolSeal) &&
      protocolAuditInput?.match === true,
    'METHOD_AUDIT_PROTOCOL_BINDING_MISMATCH',
    'methodologyAuditV3'
  );
  check(
    blankConformance.overallVerdict === 'PASS' &&
      blankConformance.p2Closure?.status === 'CLOSED-PASS',
    'BLANK_CONFORMANCE_NOT_PASS',
    'blankConformanceV3'
  );
  for (const [slot, key] of [['E', 'blankE'], ['F', 'blankF']]) {
    const result = blankConformance.blankResults?.find((item) => item.slot === slot);
    check(
      result?.path === HELDOUT_V2_PATHS[key] &&
        result?.rawSha256 === actualSha256[key] &&
        result?.verdict === 'PASS',
      'BLANK_CONFORMANCE_BINDING_MISMATCH',
      key
    );
  }

  const expectedExecutionSeal = [
    ['evidenceV2', HELDOUT_V2_PATHS.evidenceV2],
    ['instructionsV3', HELDOUT_V2_PATHS.instructionsV3],
    ['schemaV3', HELDOUT_V2_PATHS.schemaV3],
    ['blankE', HELDOUT_V2_PATHS.blankE],
    ['blankF', HELDOUT_V2_PATHS.blankF]
  ];
  check(Array.isArray(executionSeal) && executionSeal.length === 5, 'EXECUTION_SEAL_COUNT_MISMATCH', 'executionSealV3');
  for (let index = 0; index < expectedExecutionSeal.length; index += 1) {
    const [key, expectedPath] = expectedExecutionSeal[index];
    const entry = executionSeal[index];
    check(
      exactKeys(entry, ['path', 'sha256']) &&
        Object.keys(entry).join(',') === 'path,sha256',
      'EXECUTION_SEAL_ENTRY_SHAPE_OR_KEY_ORDER_MISMATCH',
      `executionSealV3/${index}`
    );
    check(
      entry?.path === expectedPath && entry?.sha256 === actualSha256[key],
      'EXECUTION_SEAL_ENTRY_BINDING_MISMATCH',
      `executionSealV3/${index}`
    );
  }
  check(
    ![0x0a, 0x0d].includes(bytes.executionSealV3.at(-1)),
    'EXECUTION_SEAL_TRAILING_NEWLINE',
    'executionSealV3'
  );

  check(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'SCHEMA_DRAFT_MISMATCH', 'schemaV3');
  check(schema.properties?.packetId?.const === evidence.packetId, 'SCHEMA_PACKET_CONST_MISMATCH', 'schemaV3');
  check(schema.properties?.evidenceSha256?.const === actualSha256.evidenceV2, 'SCHEMA_EVIDENCE_SHA_CONST_MISMATCH', 'schemaV3');
  check(
    schema.properties?.cases?.prefixItems?.length === 10 && schema.properties?.cases?.items === false,
    'SCHEMA_CASE_ARRAY_CONTRACT_MISMATCH',
    'schemaV3'
  );

  check(evidence.packetId === 'meaning-link-v4-heldout-10-v2', 'EVIDENCE_PACKET_ID_MISMATCH', 'evidenceV2');
  check(evidence.caseCount === 10 && evidence.cases?.length === 10, 'EVIDENCE_CASE_COUNT_MISMATCH', 'evidenceV2');
  check(
    JSON.stringify(evidence.caseOrder) === JSON.stringify(evidence.cases.map((item) => item.caseId)),
    'EVIDENCE_CASE_ORDER_MISMATCH',
    'evidenceV2'
  );
  check(
    lfSha256(evidence.caseOrder) === protocolSeal.evidenceIdentity?.orderedCaseIdsLfSha256,
    'ORDERED_CASE_ID_SHA_MISMATCH',
    'evidenceV2'
  );
  check(
    lfSha256(evidence.cases.map((item) => item.source.id)) === protocolSeal.evidenceIdentity?.orderedSourceIdsLfSha256,
    'ORDERED_SOURCE_ID_SHA_MISMATCH',
    'evidenceV2'
  );
  check(
    lfSha256(evidence.cases.map((item) => item.target.id)) === protocolSeal.evidenceIdentity?.orderedTargetIdsLfSha256,
    'ORDERED_TARGET_ID_SHA_MISMATCH',
    'evidenceV2'
  );
  check(
    lfSha256(evidence.cases.map((item) => item.pairId)) === protocolSeal.evidenceIdentity?.orderedPairIdsLfSha256,
    'ORDERED_PAIR_ID_SHA_MISMATCH',
    'evidenceV2'
  );
  check(new Set(evidence.caseOrder).size === 10, 'EVIDENCE_CASE_ID_DUPLICATE', 'evidenceV2');

  validateCompletedForm({ form: completedE, slot: 'E', evidence, actualSha256, executionSeal, check });
  validateCompletedForm({ form: completedF, slot: 'F', evidence, actualSha256, executionSeal, check });

  check(
    JSON.stringify(protocolSeal.orderedCoreSerialization?.objectKeyOrder) === JSON.stringify(ORDERED_CORE_KEY_CONTRACT.case) &&
      JSON.stringify(protocolSeal.orderedCoreSerialization?.semanticKeyOrder) === JSON.stringify(ORDERED_CORE_KEY_CONTRACT.semantic) &&
      JSON.stringify(protocolSeal.orderedCoreSerialization?.usageKeyOrder) === JSON.stringify(ORDERED_CORE_KEY_CONTRACT.usage) &&
      JSON.stringify(protocolSeal.orderedCoreSerialization?.exampleKeyOrder) === JSON.stringify(ORDERED_CORE_KEY_CONTRACT.example) &&
      protocolSeal.orderedCoreSerialization?.trailingNewline === false,
    'PROTOCOL_CORE_SERIALIZATION_CONTRACT_MISMATCH',
    'protocolSealV3'
  );
  const comparison = compareOrderedNormativeCores(completedE, completedF);
  check(comparison.equal, 'ORDERED_CORE_BYTE_MISMATCH', 'completedE/completedF');
  check(comparison.sha256E === comparison.sha256F, 'ORDERED_CORE_SHA_MISMATCH', 'completedE/completedF');

  const passed = errors.length === 0;
  return Object.freeze({
    passed,
    assertionCount,
    errors: Object.freeze(errors),
    actualSha256: Object.freeze(actualSha256),
    packetSealProjectionSha256: sealProjectionSha256(packetSeal),
    protocolSealProjectionSha256: sealProjectionSha256(protocolSeal),
    orderedCoreSha256: comparison.sha256E,
    orderedCoreByteLength: comparison.byteLengthE,
    directCoreBytesEqual: comparison.equal,
    caseCount: evidence.cases.length,
    usageConstCount: evidence.cases.length * ORDERED_CORE_KEY_CONTRACT.usage.length,
    fullCoverageCaseCount: completedE.cases.filter((caseResult, index) =>
      JSON.stringify(caseResult.example.evaluatedSourceExampleIds) ===
      JSON.stringify(evidence.cases[index].source.usableSourceExampleIds)).length,
    evidence,
    orderedCore: orderedNormativeCore(completedE)
  });
}
