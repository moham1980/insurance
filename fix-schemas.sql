DO $$
DECLARE
  r RECORD;
  schema_name TEXT;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != 'migrations' ORDER BY tablename LOOP
    schema_name := CASE
      WHEN r.tablename IN ('parties','kyc_reviews') THEN 'party'
      WHEN r.tablename IN ('policies','coverages','deductibles','policy_changes','policy_inquiries','policy_renewals','installment_plans','installments') THEN 'policy'
      WHEN r.tablename = 'claims' THEN 'claims'
      WHEN r.tablename IN ('fraud_score_audit','fraud_document_attachment_audit') THEN 'fraud'
      WHEN r.tablename IN ('complaints','complaint_attachments','complaint_audit','complaint_mobile_otp_challenges','complaint_sla_breaches') THEN 'complaints'
      WHEN r.tablename IN ('users','roles','user_roles','org_units','sessions') THEN 'auth'
      WHEN r.tablename IN ('aml_alerts','aml_alert_decisions','aml_consents','aml_rules') THEN 'aml'
      WHEN r.tablename IN ('products','pricing_rules') THEN 'product'
      WHEN r.tablename IN ('sales_kpi_daily','sales_partners','sales_policy_attributions','commission_contracts','commission_ledger') THEN 'sales'
      WHEN r.tablename = 'underwriting_requests' THEN 'underwriting'
      WHEN r.tablename IN ('re_treaties','re_cessions','re_statements','re_reconciliations','re_claim_recoveries','re_tickets','re_ticket_messages','re_ticket_attachments') THEN 'reinsurance'
      WHEN r.tablename IN ('workflow_definitions','workflow_instances','work_items') THEN 'workflow'
      WHEN r.tablename IN ('saga_instances','saga_steps') THEN 'orchestrator'
      WHEN r.tablename IN ('document_ai_jobs','document_ai_audit','document_ai_eval_cases','document_ai_eval_results','document_ai_eval_runs','document_ai_usage_daily') THEN 'document_ai'
      WHEN r.tablename = 'copilot_audit' THEN 'copilot'
      WHEN r.tablename = 'knowledge_articles' THEN 'knowledge'
      WHEN r.tablename IN ('feature_flags','ai_toggles') THEN 'flags'
      WHEN r.tablename IN ('model_definitions','model_invocations') THEN 'model_switchboard'
      WHEN r.tablename IN ('rules','rule_executions') THEN 'rule_engine'
      WHEN r.tablename = 'notification_logs' THEN 'notification'
      WHEN r.tablename LIKE 'rm_%' OR r.tablename LIKE 'kpi_%' THEN 'reporting'
      WHEN r.tablename = 'customer_sessions' THEN 'customer_portal'
      WHEN r.tablename = 'agent_sessions' THEN 'agent_portal'
      WHEN r.tablename = 'regulatory_failure_log' THEN 'regulatory'
      WHEN r.tablename = 'invoices' THEN 'billing'
      WHEN r.tablename IN ('access_audit','audit_archive') THEN 'auth'
      ELSE NULL
    END;

    IF schema_name IS NOT NULL THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA %I', r.tablename, schema_name);
        RAISE NOTICE 'Moved % to %', r.tablename, schema_name;
      EXCEPTION WHEN duplicate_table THEN
        EXECUTE format('DROP TABLE public.%I CASCADE', r.tablename);
        RAISE NOTICE 'Dropped duplicate % from public (already in %)', r.tablename, schema_name;
      END;
    END IF;
  END LOOP;
END $$;
