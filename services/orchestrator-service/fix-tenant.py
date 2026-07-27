import re
from pathlib import Path

path = Path('src/orchestrator.service.ts')
content = path.read_text(encoding='utf-8')

# 1. Add tenantId to all async method params objects if missing
params_methods = [
    'onFraudScoreComputed',
    'onDocumentNeedsReview',
    'onComplaintCreated',
    'onComplaintSlaBreached',
    'onFraudCaseEscalated',
    'createSagaStep',
    'createSanhabFollowupWorkItem',
    'createUnderwritingReviewWorkItem',
    'createOverrideReviewWorkItem',
    'createSuspiciousCaseWorkItem',
    'onPaymentEvent',
    'startSaga',
    'startClaimPaymentSaga',
    'listWorkItems',
    'assignWorkItem',
    'completeWorkItem',
]

for name in params_methods:
    pattern = re.compile(rf'  async {name}\(params: \{{')
    def repl(m, name=name):
        s = m.group(0)
        if 'tenantId' in s:
            return s
        return s + '\n    tenantId: string;'
    content = pattern.sub(repl, content)

# 2. Add tenantId parameter to methods with single/other args
simple_methods = [
    ('getSaga', r'getSaga\(sagaId: string\)', 'getSaga(tenantId: string, sagaId: string)'),
    ('getSagaSteps', r'getSagaSteps\(sagaId: string\)', 'getSagaSteps(tenantId: string, sagaId: string)'),
    ('getSagaStepMetrics', r'getSagaStepMetrics\(sagaId: string\)', 'getSagaStepMetrics(tenantId: string, sagaId: string)'),
    ('startSagaStep', r'startSagaStep\(stepId: string\)', 'startSagaStep(tenantId: string, stepId: string)'),
    ('completeSagaStep', r'completeSagaStep\(stepId: string, outputPayload', 'completeSagaStep(tenantId: string, stepId: string, outputPayload'),
    ('failSagaStep', r'failSagaStep\(stepId: string, errorMessage: string, errorCode', 'failSagaStep(tenantId: string, stepId: string, errorMessage: string, errorCode'),
    ('initiateCompensation', r'initiateCompensation\(sagaId: string, reason: string, triggeredBy', 'initiateCompensation(tenantId: string, sagaId: string, reason: string, triggeredBy'),
    ('retryCompensation', r'retryCompensation\(sagaId: string\)', 'retryCompensation(tenantId: string, sagaId: string)'),
    ('getCompensationStatus', r'getCompensationStatus\(sagaId: string\)', 'getCompensationStatus(tenantId: string, sagaId: string)'),
]

for _, pat, repl in simple_methods:
    content = re.sub(rf'  async {pat}', repl, content)

# 3. Ensure internal call getSagaSteps passes tenantId
content = content.replace('const steps = await this.getSagaSteps(sagaId);', 'const steps = await this.getSagaSteps(tenantId, sagaId);')

# 4. Add tenantId to startClaimPaymentSaga internal call
content = content.replace(
    'return this.startClaimPaymentSaga({ claimId: String(params.claimId), correlationId: params.correlationId, context });',
    'return this.startClaimPaymentSaga({ tenantId: params.tenantId, claimId: String(params.claimId), correlationId: params.correlationId, context });',
)

# 5. Add tenantId to sagaRepo.create(...) blocks that do not already have tenantId
def add_tenant_to_saga_create(m):
    block = m.group(0)
    if re.search(r'\ntenantId:', block) or re.search(r'tenantId: params\.tenantId', block):
        return block
    # Insert tenantId after sagaId: uuidv4(),
    if 'sagaId: uuidv4(),' in block:
        return block.replace('sagaId: uuidv4(),', 'sagaId: uuidv4(),\n      tenantId: params.tenantId,', 1)
    return block

# Match sagaRepo.create({ ... }) calls spanning multiple lines
content = re.sub(r'this\.sagaRepo\.create\(\{[\s\S]{0,1200}?\}\);', add_tenant_to_saga_create, content)

# 6. Add tenantId to sagaStep creation in createSagaStep
def add_tenant_to_saga_step(m):
    block = m.group(1)
    if 'tenantId' in block:
        return m.group(0)
    new_block = block.replace('stepId: uuidv4(),', 'stepId: uuidv4(),\n      tenantId: params.tenantId,', 1)
    return 'this.sagaStepRepo.create({' + new_block + '});'

content = re.sub(r'this\.sagaStepRepo\.create\(\{([\s\S]{0,500}?)\}\);', add_tenant_to_saga_step, content)

# 7. Tenant-scope work item queries
content = content.replace(
    "const workItem = await this.workItemRepo.findOne({ where: { workItemId: params.workItemId } });",
    "const workItem = await this.workItemRepo.findOne({ where: { workItemId: params.workItemId, tenantId: params.tenantId } });",
)

content = content.replace(
    "return this.workItemRepo.findOne({ where: { workItemId } });",
    "return this.workItemRepo.findOne({ where: { workItemId, tenantId } });",
)

# 8. Tenant-scope listWorkItems query builder
content = content.replace(
    "async listWorkItems(params: { status?: string; assignedTo?: string; priority?: string; limit: number; offset: number }): Promise<{ rows: WorkItem[]; total: number }> {\n    const qb = this.workItemRepo.createQueryBuilder('wi');",
    "async listWorkItems(params: { tenantId: string; status?: string; assignedTo?: string; priority?: string; limit: number; offset: number }): Promise<{ rows: WorkItem[]; total: number }> {\n    const qb = this.workItemRepo.createQueryBuilder('wi');\n\n    qb.andWhere('wi.tenant_id = :tenantId', { tenantId: params.tenantId });",
)

# 9. Tenant-scope sagaRepo findOne/QueryBuilder calls
content = content.replace(
    "return this.sagaRepo.findOne({ where: { sagaId } });",
    "return this.sagaRepo.findOne({ where: { sagaId, tenantId } });",
)

# findExistingSagaByDedupeKey and startClaimPaymentSaga query builder - add tenantId
content = content.replace(
    ".where('s.saga_type = :sagaType', { sagaType: 'ClaimPayment' })\n      .andWhere('s.claim_id = :claimId', { claimId: params.claimId })",
    ".where('s.saga_type = :sagaType', { sagaType: 'ClaimPayment' })\n      .andWhere('s.tenant_id = :tenantId', { tenantId: params.tenantId })\n      .andWhere('s.claim_id = :claimId', { claimId: params.claimId })",
)

content = content.replace(
    "async findExistingSagaByDedupeKey(params: { sagaType: string; dedupeKey: string })",
    "async findExistingSagaByDedupeKey(params: { tenantId: string; sagaType: string; dedupeKey: string })",
)

content = content.replace(
    ".where('s.saga_type = :sagaType', { sagaType: params.sagaType })\n      .andWhere('s.context->>\\'dedupeKey\\' = :dedupeKey', { dedupeKey: params.dedupeKey })",
    ".where('s.saga_type = :sagaType', { sagaType: params.sagaType })\n      .andWhere('s.tenant_id = :tenantId', { tenantId: params.tenantId })\n      .andWhere(\"s.context->>'dedupeKey' = :dedupeKey\", { dedupeKey: params.dedupeKey })",
)

# initiateCompensation, retryCompensation, getCompensationStatus queries
content = content.replace(
    "const saga = await this.sagaRepo.findOne({ where: { sagaId } });",
    "const saga = await this.sagaRepo.findOne({ where: { sagaId, tenantId } });",
)

# getSagaSteps
content = content.replace(
    "return await this.sagaStepRepo.find({\n      where: { sagaId },",
    "return await this.sagaStepRepo.find({\n      where: { sagaId, tenantId },",
)

# startSagaStep / completeSagaStep / failSagaStep queries
content = content.replace(
    "const step = await this.sagaStepRepo.findOne({ where: { stepId } });",
    "const step = await this.sagaStepRepo.findOne({ where: { stepId, tenantId } });",
)

# sagaRepo in completeSaga (internal use?) check
# completeSaga may be called with saga object, no change.

# Fix broken tenantId indentation in createWorkItem and publishSagaEvent calls
content = re.sub(r'sagaId: saga\.sagaId,\n      tenantId: saga\.tenantId,', 'sagaId: saga.sagaId,\n      tenantId: saga.tenantId,', content)
content = re.sub(r'sagaId: saga\.sagaId,\n        tenantId: saga\.tenantId,', 'sagaId: saga.sagaId,\n        tenantId: saga.tenantId,', content)

path.write_text(content, encoding='utf-8')
print('Updated src/orchestrator.service.ts')
