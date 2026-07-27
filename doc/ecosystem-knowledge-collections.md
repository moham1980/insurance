# Ecosystem Knowledge Collections for Insurance

## Overview

When the insurance platform is integrated with the ecosystem, the `consultation-knowledge-service` (shared AI knowledge core) needs collections seeded for the `insurance` tenant. These collections provide domain-specific knowledge to the `ecosystem-ai-gateway` for RAG-based consultations.

## Collections to Create

### 1. `insurance-policies`
- **Description:** Policy types, coverage details, terms and conditions, exclusions
- **Source:** `policy-service` policy templates, product catalog from `product-service`
- **Document types:**
  - Policy type descriptions (third-party, comprehensive, cargo, life, health)
  - Coverage tables (what's covered, limits, deductibles)
  - Exclusion lists
  - Premium calculation rules
- **Update frequency:** On product/policy template changes (event-driven via `insurance.policy.issued`)

### 2. `insurance-claims-guide`
- **Description:** Claim filing procedures, required documents, assessment criteria, settlement processes
- **Source:** `claims-service` workflows, `document-service` document templates, `copilot-service` knowledge base
- **Document types:**
  - FNOL (First Notification of Loss) procedures
  - Required document checklists per claim type
  - Claim assessment workflows and decision trees
  - Settlement calculation guidelines
  - Subrogation and recovery procedures
- **Update frequency:** On workflow changes, quarterly review

### 3. `insurance-regulations`
- **Description:** Central Insurance of Iran regulations, Sanhab requirements, legal compliance
- **Source:** `regulatory-gateway-service` Sanhab integration, compliance documents
- **Document types:**
  - Central Insurance circulars and directives
  - Sanhab data submission requirements
  - Mandatory policy terms and minimum coverage
  - Claims handling regulations
  - Reporting requirements
- **Update frequency:** On regulatory updates, monthly sync

## Seeding Procedure

### Option A: API-based (recommended)

```bash
# Base URL for consultation-knowledge-service
KCS_URL=http://localhost:8090

# Create collections
curl -X POST $KCS_URL/api/v1/knowledge/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "insurance",
    "collectionName": "insurance-policies",
    "description": "Policy types, coverage, terms",
    "metadata": { "sourceSystem": "insurance-platform" }
  }'

curl -X POST $KCS_URL/api/v1/knowledge/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "insurance",
    "collectionName": "insurance-claims-guide",
    "description": "Claim procedures and assessment",
    "metadata": { "sourceSystem": "insurance-platform" }
  }'

curl -X POST $KCS_URL/api/v1/knowledge/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tenantId": "insurance",
    "collectionName": "insurance-regulations",
    "description": "Central Insurance regulations and Sanhab requirements",
    "metadata": { "sourceSystem": "insurance-platform" }
  }'
```

### Option B: Script-based

Create a seed script at `scripts/seed-knowledge-collections.sh` that runs the above curl commands with proper environment variables.

## Integration with ecosystem-ai-gateway

Once collections are created in `consultation-knowledge-service`, the `ecosystem-ai-gateway` (port 8540) will automatically include them in RAG queries when:

1. The `tenantId` in the request envelope is `insurance`
2. The query context matches insurance domain keywords
3. The `rag-compat` endpoint is called with insurance-specific context

## Fallback Behavior

When `ECOSYSTEM_AI_ENABLED=false` or the gateway is unavailable:
- `copilot-service` falls back to local `LLMService` (OpenAI/Gemini/DeepSeek/Ollama)
- `knowledge-service` provides local article CRUD and knowledge graph
- No data loss — ecosystem collections are additive, not replacement
