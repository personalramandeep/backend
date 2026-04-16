UPDATE coach_rating_summary s
SET total_sessions = sub.cnt
FROM (
  SELECT coach_user_id, COUNT(*)::INT AS cnt
  FROM coach_review_requests
  WHERE status = 'completed'
  GROUP BY coach_user_id
) sub
WHERE s.coach_user_id = sub.coach_user_id;

CREATE OR REPLACE FUNCTION fn_update_coach_sessions_summary()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
  DECLARE
    v_coach_id UUID := COALESCE(NEW.coach_user_id, OLD.coach_user_id);
    v_count    INT;
  BEGIN
    SELECT COUNT(*)::INT INTO v_count
    FROM coach_review_requests
    WHERE
      coach_user_id = v_coach_id
      AND status    = 'completed';

    INSERT INTO coach_rating_summary (coach_user_id, total_sessions, updated_at)
    VALUES (v_coach_id, v_count, NOW())
    ON CONFLICT (coach_user_id) DO UPDATE
      SET
        total_sessions = EXCLUDED.total_sessions,
        updated_at     = NOW();

    RETURN COALESCE(NEW, OLD);
  END;
$$;

DROP TRIGGER IF EXISTS trg_coach_sessions_summary ON coach_review_requests;
CREATE TRIGGER trg_coach_sessions_summary
AFTER INSERT OR UPDATE OF status OR DELETE ON coach_review_requests
FOR EACH ROW EXECUTE FUNCTION fn_update_coach_sessions_summary();
