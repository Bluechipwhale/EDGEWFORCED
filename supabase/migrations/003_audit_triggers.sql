-- ==============================================================================
-- EDGEWFORCE - AUDIT LOGGING TRIGGERS (003_audit_triggers.sql)
-- Automatic audit trails for orders, collections, and leave approvals
-- ==============================================================================

CREATE OR REPLACE FUNCTION audit_order_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (actor_id, actor_email, action, entity, entity_id, metadata, created_at)
    VALUES (
        NULL,
        'SYSTEM_ORDER_TRIGGER',
        CASE WHEN TG_OP = 'INSERT' THEN 'ORDER_CREATED' ELSE 'ORDER_UPDATED' END,
        'orders',
        NEW.id::TEXT,
        json_build_object('order_number', NEW.order_number, 'customer_id', NEW.customer_id, 'total_amount', NEW.total_amount, 'status', NEW.status)::JSONB,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_order ON orders;
CREATE TRIGGER trg_audit_order
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_order_event();

CREATE OR REPLACE FUNCTION audit_collection_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (actor_id, actor_email, action, entity, entity_id, metadata, created_at)
    VALUES (
        NULL,
        'SYSTEM_COLLECTION_TRIGGER',
        'PAYMENT_RECORDED',
        'collections',
        NEW.id::TEXT,
        json_build_object('customer_id', NEW.customer_id, 'amount', NEW.amount, 'payment_method', NEW.payment_method)::JSONB,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_collection ON collections;
CREATE TRIGGER trg_audit_collection
AFTER INSERT ON collections
FOR EACH ROW EXECUTE FUNCTION audit_collection_event();
