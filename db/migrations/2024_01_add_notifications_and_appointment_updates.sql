-- db/migrations/2024_01_add_notifications_and_appointment_updates.sql

-- ===================================
-- 1. DODAJ STUPCE U TERMINI TABELU
-- ===================================

ALTER TABLE termini ADD COLUMN IF NOT EXISTS last_updated_by_client BOOLEAN DEFAULT FALSE;
ALTER TABLE termini ADD COLUMN IF NOT EXISTS last_updated_by_salon BOOLEAN DEFAULT FALSE;
ALTER TABLE termini ADD COLUMN IF NOT EXISTS update_history JSONB DEFAULT '[]';
ALTER TABLE termini ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;

-- Index za brže upite
CREATE INDEX IF NOT EXISTS idx_termini_updated_at ON termini(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_termini_last_updated_client ON termini(last_updated_by_client);

-- ===================================
-- 2. NOVA TABELA: notification_tokens
-- ===================================

CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  client_id UUID REFERENCES salon_clients(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  whatsapp_number TEXT,
  device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('web', 'mobile', 'whatsapp')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, push_token)
);

-- Indeksi
CREATE INDEX IF NOT EXISTS idx_notification_tokens_client_id ON notification_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_salon_id ON notification_tokens(salon_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_is_active ON notification_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_device_type ON notification_tokens(device_type);

-- ===================================
-- 3. NOVA TABELA: appointment_updates
-- ===================================

CREATE TABLE IF NOT EXISTS appointment_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES termini(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  updated_by_role VARCHAR(50) NOT NULL CHECK (updated_by_role IN ('korisnik', 'salon')),
  old_datetime TIMESTAMP WITH TIME ZONE,
  new_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksi
CREATE INDEX IF NOT EXISTS idx_appointment_updates_appointment_id ON appointment_updates(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_updates_salon_id ON appointment_updates(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointment_updates_created_at ON appointment_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointment_updates_role ON appointment_updates(updated_by_role);

-- ===================================
-- 4. NOVA TABELA: notification_preferences
-- ===================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES salon_clients(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  email_enabled BOOLEAN DEFAULT TRUE,
  appointment_confirmation BOOLEAN DEFAULT TRUE,
  appointment_reminder BOOLEAN DEFAULT TRUE,
  appointment_reminder_minutes SMALLINT DEFAULT 60,
  appointment_cancellation BOOLEAN DEFAULT TRUE,
  appointment_rescheduling BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, salon_id)
);

-- Indeksi
CREATE INDEX IF NOT EXISTS idx_notification_preferences_client_id ON notification_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_salon_id ON notification_preferences(salon_id);

-- ===================================
-- 5. FUNKCIJA ZA AŽURIRANJE TERMINA SA BROADCAST-om
-- ===================================

CREATE OR REPLACE FUNCTION update_termin_with_broadcast(
  p_termin_id UUID,
  p_salon_id UUID,
  p_client_id UUID,
  p_nova_vrijeme TIMESTAMP WITH TIME ZONE,
  p_napomena TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_stara_vrijeme TIMESTAMP WITH TIME ZONE;
  v_result JSON;
BEGIN
  -- Učitaj staro vreme
  SELECT datum_vrijeme INTO v_stara_vrijeme
  FROM termini
  WHERE id = p_termin_id AND salon_id = p_salon_id AND client_id = p_client_id;

  IF v_stara_vrijeme IS NULL THEN
    RETURN json_build_object('error', 'Termin nije pronađen');
  END IF;

  -- Ažuriraj termin
  UPDATE termini
  SET 
    datum_vrijeme = p_nova_vrijeme,
    napomena = COALESCE(p_napomena, napomena),
    updated_at = NOW(),
    last_updated_by_client = TRUE
  WHERE id = p_termin_id 
    AND salon_id = p_salon_id
    AND client_id = p_client_id
    AND status = 'potvrđen'
  RETURNING json_build_object(
    'id', id,
    'termin_id', id,
    'salon_id', salon_id,
    'client_id', client_id,
    'nova_vrijeme', datum_vrijeme,
    'stara_vrijeme', v_stara_vrijeme,
    'status', 'success'
  ) INTO v_result;

  -- Unesi u istoriju
  IF v_result IS NOT NULL THEN
    INSERT INTO appointment_updates (
      appointment_id,
      salon_id,
      updated_by_role,
      old_datetime,
      new_datetime,
      change_reason
    ) VALUES (
      p_termin_id,
      p_salon_id,
      'korisnik',
      v_stara_vrijeme,
      p_nova_vrijeme,
      p_napomena
    );

    -- Pošalji notifikaciju preko Supabase Realtime
    PERFORM pg_notify(
      'salon_termini_' || p_salon_id::text,
      json_build_object(
        'tip', 'TERMIN_AŽURIRAN_OD_KORISNIKA',
        'termin_id', p_termin_id,
        'nova_vrijeme', p_nova_vrijeme,
        'stara_vrijeme', v_stara_vrijeme,
        'vrijeme_promene', NOW()
      )::text
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ===================================
-- 6. FUNKCIJA ZA OTKAZIVANJE SA ISTORIJOM
-- ===================================

CREATE OR REPLACE FUNCTION cancel_appointment_with_history(
  p_termin_id UUID,
  p_salon_id UUID,
  p_client_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
  -- Ažuriraj status
  UPDATE termini
  SET 
    status = 'otkazan',
    updated_at = NOW(),
    napomena = COALESCE(CONCAT('OTKAZANO: ', p_reason), napomena)
  WHERE id = p_termin_id 
    AND salon_id = p_salon_id
    AND client_id = p_client_id;

  -- Unesi u istoriju
  INSERT INTO appointment_updates (
    appointment_id,
    salon_id,
    updated_by_role,
    new_datetime,
    change_reason
  ) VALUES (
    p_termin_id,
    p_salon_id,
    'korisnik',
    NULL,
    p_reason
  );

  RETURN json_build_object(
    'success', TRUE,
    'message', 'Termin je otkazan'
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ===================================
-- 7. TRIGGER ZA AUTOMATSKU NOTIFIKACIJU
-- ===================================

CREATE OR REPLACE FUNCTION notify_salon_on_termin_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.datum_vrijeme != NEW.datum_vrijeme OR OLD.status != NEW.status THEN
    PERFORM pg_notify(
      'salon_termini_changes',
      json_build_object(
        'termin_id', NEW.id,
        'salon_id', NEW.salon_id,
        'event_type', CASE 
          WHEN NEW.status != OLD.status THEN 'status_changed'
          WHEN NEW.datum_vrijeme != OLD.datum_vrijeme THEN 'time_changed'
          ELSE 'updated'
        END,
        'old_time', OLD.datum_vrijeme,
        'new_time', NEW.datum_vrijeme,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'updated_at', NOW()
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_salon_on_update ON termini;
CREATE TRIGGER trigger_notify_salon_on_update
AFTER UPDATE ON termini
FOR EACH ROW
EXECUTE FUNCTION notify_salon_on_termin_update();

-- ===================================
-- 8. TRIGGER ZA AUTOMATSKU NOTIFIKACIJU NA INSERT
-- ===================================

CREATE OR REPLACE FUNCTION notify_salon_on_termin_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'salon_termini_changes',
    json_build_object(
      'termin_id', NEW.id,
      'salon_id', NEW.salon_id,
      'event_type', 'appointment_created',
      'status', NEW.status,
      'datetime', NEW.datum_vrijeme,
      'created_at', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_salon_on_insert ON termini;
CREATE TRIGGER trigger_notify_salon_on_insert
AFTER INSERT ON termini
FOR EACH ROW
EXECUTE FUNCTION notify_salon_on_termin_insert();

-- ===================================
-- 9. ROLE-BASED POLICIES (RLS)
-- ===================================

-- Klijenti mogu da vide svoje preference
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select ON notification_preferences
  FOR SELECT USING (client_id IN (
    SELECT id FROM salon_clients WHERE auth_id = auth.uid()
  ));

CREATE POLICY notification_preferences_update ON notification_preferences
  FOR UPDATE USING (client_id IN (
    SELECT id FROM salon_clients WHERE auth_id = auth.uid()
  ));

-- Klijenti mogu da upravljaju svojim tokenima
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_tokens_select ON notification_tokens
  FOR SELECT USING (client_id IN (
    SELECT id FROM salon_clients WHERE auth_id = auth.uid()
  ));

CREATE POLICY notification_tokens_delete ON notification_tokens
  FOR DELETE USING (client_id IN (
    SELECT id FROM salon_clients WHERE auth_id = auth.uid()
  ));

-- ===================================
-- 10. VIEW ZA STATISTIKU NOTIFIKACIJA
-- ===================================

CREATE OR REPLACE VIEW v_notification_stats AS
SELECT 
  s.id as salon_id,
  s.naziv as salon_name,
  COUNT(DISTINCT nt.id) as active_tokens,
  COUNT(DISTINCT CASE WHEN nt.device_type = 'web' THEN nt.id END) as web_tokens,
  COUNT(DISTINCT CASE WHEN nt.device_type = 'mobile' THEN nt.id END) as mobile_tokens,
  COUNT(DISTINCT CASE WHEN nt.device_type = 'whatsapp' THEN nt.id END) as whatsapp_tokens
FROM salons s
LEFT JOIN notification_tokens nt ON s.id = nt.salon_id AND nt.is_active = TRUE
GROUP BY s.id, s.naziv;

-- ===================================
-- 11. CLEANUP STARI TOKENI PROCEDURA
-- ===================================

CREATE OR REPLACE FUNCTION cleanup_inactive_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_tokens
  WHERE is_active = FALSE 
    AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- TESTNI PODACI (OPCIONO)
-- ===================================

-- Ako trebate testirati:
-- SELECT * FROM v_notification_stats;
-- SELECT * FROM appointment_updates ORDER BY created_at DESC LIMIT 10;
