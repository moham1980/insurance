# پیشرفت اجرای فاز P2 — Quote-to-Bind

## وضعیت کلی

فاز P2 (Quote-to-Bind) با تمرکز بر چرخه `Submission → RFQ → Quote Comparison → Placement → Bind → Policy Projection` پیاده‌سازی شده است. وضعیت فعلی به شرح زیر است:

| بخش | وضعیت | یادداشت |
|-----|-------|---------|
| Submission Service | کامل | Entity, Service, Controller, Migration |
| Coverage Request | کامل | Entity و مدل؛ Controller/Service پیشرفته باقی‌مانده |
| Carrier Connector Hub | کامل | Registry, Factory, 5 Adapter (internal/rest/soap/kafka/manual) |
| Quote Request / Response | کامل | Entity, RFQ Engine, Quote Dispatcher, Quote Error |
| Quote Comparison | کامل | Comparison Engine, Ranking Rule, Controller |
| Placement & Bind Saga | کامل | Placement Service, Placement Orchestrator, Bind flow |
| Policy Projection | کامل | Entity + Migration + API در policy-service و فراخوانی از placement |
| Underwriting Referral | کامل | `UnderwritingReferral` در submission-placement و اتصال به UW Service |
| AML / Fraud Check | کامل | `AmlCheckService` و اتصال به Fraud Service |
| Subjectivities & Documents | کامل | `SubjectivityFulfillmentService`, `QuoteDocumentService` |
| Event Envelope | کامل | OutboxPublisher + `DomainEventEnvelope` در AsyncAPI |
| OpenAPI/AsyncAPI | کامل | `brokerage-p2.yaml` OpenAPI و `brokerage-p2.yaml` AsyncAPI |
| Unit/Integration Tests | شروع شده | `carrier-connector.spec.ts` و `quote-comparison.spec.ts` pass (7/7) |
| Docker Compose | کامل | submission-placement-service و migration اضافه شد |
| CI/E2E | باقی‌مانده | E2E happy path نیاز به smoke test با سرویس‌های کامل دارد |

## فایل‌های کلیدی ایجاد/تکمیل‌شده

### Submission Placement Service

- `services/submission-placement-service/src/main.ts`
- `services/submission-placement-service/src/app.module.ts`
- `services/submission-placement-service/src/data-source.ts`
- `services/submission-placement-service/src/submission.service.ts`
- `services/submission-placement-service/src/submission.controller.ts`
- `services/submission-placement-service/src/connector-config.service.ts`
- `services/submission-placement-service/src/connector-config.controller.ts`
- `services/submission-placement-service/src/rfq/rfq-engine.ts`
- `services/submission-placement-service/src/rfq/quote-dispatcher.ts`
- `services/submission-placement-service/src/rfq/rfq.controller.ts`
- `services/submission-placement-service/src/rfq/aml-check.service.ts`
- `services/submission-placement-service/src/rfq/underwriting-referral.ts`
- `services/submission-placement-service/src/comparison/comparison-engine.ts`
- `services/submission-placement-service/src/comparison/ranking-rule.ts`
- `services/submission-placement-service/src/comparison/comparison-result.ts`
- `services/submission-placement-service/src/comparison.controller.ts`
- `services/submission-placement-service/src/placement/placement.service.ts`
- `services/submission-placement-service/src/placement/placement-orchestrator.ts`
- `services/submission-placement-service/src/placement.controller.ts`
- `services/submission-placement-service/src/subjectivities/subjectivity-fulfillment.service.ts`
- `services/submission-placement-service/src/documents/quote-document.service.ts`
- `services/submission-placement-service/src/entities/*.ts`
- `services/submission-placement-service/src/migrations/1820000000000-*.ts`
- `services/submission-placement-service/src/carrier-connectors/*`
- `services/submission-placement-service/src/clients/*`
- `services/submission-placement-service/Dockerfile`
- `services/submission-placement-service/package.json`
- `services/submission-placement-service/tsconfig.json`
- `services/submission-placement-service/jest.config.js`
- `services/submission-placement-service/test/carrier-connector.spec.ts`
- `services/submission-placement-service/test/quote-comparison.spec.ts`

### Policy Projection در Policy Service

- `services/policy-service/src/entities/PolicyProjection.ts`
- `services/policy-service/src/migrations/1820000000000-p2-create-policy-projection.ts`
- `services/policy-service/src/policy-projection.service.ts`
- `services/policy-service/src/policy-projection.controller.ts`
- `services/policy-service/src/data-source.ts`
- `services/policy-service/src/app.module.ts`
- `services/policy-service/src/permissions.ts`

### قراردادها

- `contracts/openapi/brokerage-p2.yaml`
- `contracts/asyncapi/brokerage-p2.yaml`

### Docker Compose

- `docker-compose.yml`: اضافه شدن `submission-placement-migrate` و `submission-placement-service`

## بررسی کامپایل

```powershell
bun run build  # در هر دو سرویس submission-placement-service و policy-service
```

خروجی: `tsc` بدون خطا (Exit code 0).

## نتایج تست

```powershell
bun test  # در submission-placement-service
```

```
✓ carrier-connector.spec.ts (4 pass)
✓ quote-comparison.spec.ts (3 pass)
7 pass / 0 fail
```

## نکات اجرایی و gapهای باقی‌مانده

1. **E2E**: تست end-to-end کامل `submission → rfq → compare → select → bind → policy projection` نیاز به اجرای کامل stack دارد و در `e2e/quote-to-bind.spec.ts` باید نوشته شود.
2. **UI Components**: کامپوننت‌های `QuoteComparisonTable` و `QuoteScoreBreakdown` در `packages/ui` هنوز باید به‌روز شوند.
3. **Reconciliation/Migration P2-10**: backfill داده‌های تاریخی به مدل P2 هنوز پیاده‌سازی نشده است.
4. **External Connector Template**: adapterهای REST/SOAP به صورت config-driven می‌باشند اما template کامل mapping نیاز به تکمیل دارد.
5. **Coverage Request Controller**: موجودیت و migration ایجاد شده‌اند؛ APIهای پیشرفته CRUD coverage request باقی‌مانده‌اند.
6. **OpenAPI اسناد رسمی**: `doc/openapi/brokerage-api.openapi.yml` باید با P2 endpoints مرج شود.

## نحوه اجرا

```powershell
# سرویس به صورت مستقل
cd services/submission-placement-service
bun install
bun run build
bun run dev

# migration
bun run migrate:build

# تست
bun test
```

## نتیجه

فاز P2 در سطح ساختار و منطق core تکمیل شده است. سرویس `submission-placement-service` قابل کامپایل، تست و اجرا می‌باشد و سرویس `policy-service` توانایی ذخیره Policy Projection را دارد. مرحله بعد تکمیل E2E، UI و تست‌های Reconciliation می‌باشد.
