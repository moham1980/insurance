import re
from pathlib import Path

def add_first_prop(text, method_call, prop, replacement=None):
    """Insert `prop` as the first property inside the object literal of a method call."""
    if replacement:
        return text.replace(method_call, replacement)
    # insert after opening brace
    new_call = method_call.replace('{', '{\n      ' + prop + ',', 1)
    return text.replace(method_call, new_call, 1)

# Update orchestrator.service.ts onFraudScoreComputed to pass tenantId
svc_path = Path('src/orchestrator.service.ts')
svc = svc_path.read_text(encoding='utf-8')

# Ensure onFraudScoreComputed passes tenantId to createSuspiciousCaseWorkItem
svc = svc.replace(
    "await this.createSuspiciousCaseWorkItem({\n      correlationId: params.correlationId,\n      claimId: params.claimId,",
    "await this.createSuspiciousCaseWorkItem({\n      tenantId: params.tenantId,\n      correlationId: params.correlationId,\n      claimId: params.claimId,",
)

svc_path.write_text(svc, encoding='utf-8')

def update_controller(path):
    text = path.read_text(encoding='utf-8')

    # startSaga object calls
    text = re.sub(
        r'(this\.orchestratorService\.startSaga\(\{)\n\s*sagaType',
        r'\1\n        tenantId: String(tenantId),\n        sagaType',
        text,
    )

    # getSaga calls with one argument
    text = re.sub(
        r'this\.orchestratorService\.getSaga\((\w+)\)',
        r'this.orchestratorService.getSaga(String(tenantId), \1)',
        text,
    )

    # listWorkItems object calls
    text = re.sub(
        r'(this\.orchestratorService\.listWorkItems\(\{)\n\s*status',
        r'\1\n      tenantId: String(tenantId),\n      status',
        text,
    )
    text = re.sub(
        r'(this\.orchestratorService\.listWorkItems\(\{)\n\s*assignedTo',
        r'\1\n      tenantId: String(tenantId),\n      assignedTo',
        text,
    )

    # getWorkItem calls with one argument
    text = re.sub(
        r'this\.orchestratorService\.getWorkItem\((\w+)\)',
        r'this.orchestratorService.getWorkItem(String(tenantId), \1)',
        text,
    )

    # assignWorkItem object calls
    text = re.sub(
        r'(this\.orchestratorService\.assignWorkItem\(\{)\n\s*correlationId',
        r'\1\n        tenantId: String(tenantId),\n        correlationId',
        text,
    )

    # completeWorkItem object calls
    text = re.sub(
        r'(this\.orchestratorService\.completeWorkItem\(\{)\n\s*correlationId',
        r'\1\n        tenantId: String(tenantId),\n        correlationId',
        text,
    )

    # create*WorkItem object calls
    for method in ['createSanhabFollowupWorkItem', 'createUnderwritingReviewWorkItem', 'createSuspiciousCaseWorkItem', 'createOverrideReviewWorkItem']:
        text = re.sub(
            rf'(this\.orchestratorService\.{method}\(\{{)\n\s*correlationId',
            rf'\1\n        tenantId: String(tenantId),\n        correlationId',
            text,
        )

    # compensation methods
    text = re.sub(
        r'this\.orchestratorService\.initiateCompensation\((\w+),\s*body\.reason,\s*(\w+)\)',
        r'this.orchestratorService.initiateCompensation(String(tenantId), \1, body.reason, \2)',
        text,
    )
    text = re.sub(
        r'this\.orchestratorService\.retryCompensation\((\w+)\)',
        r'this.orchestratorService.retryCompensation(String(tenantId), \1)',
        text,
    )
    text = re.sub(
        r'this\.orchestratorService\.getCompensationStatus\((\w+)\)',
        r'this.orchestratorService.getCompensationStatus(String(tenantId), \1)',
        text,
    )

    path.write_text(text, encoding='utf-8')

for ctrl in ['src/work-items.controller.ts', 'src/workflows.controller.ts', 'src/orchestrations.controller.ts']:
    update_controller(Path(ctrl))

print('Controllers updated')
