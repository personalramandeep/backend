CREATE OR REPLACE FUNCTION fn_update_coach_rating_summary()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN
    INSERT INTO coach_rating_summary (
      coach_user_id,
      avg_rating,
      total_count,
      count_1,
      count_2,
      count_3,
      count_4,
      count_5,
      updated_at
    )
    SELECT
      coach_user_id,
      ROUND(AVG(rating)::NUMERIC, 2),
      COUNT(*),
      COUNT(*) FILTER (WHERE rating = 1),
      COUNT(*) FILTER (WHERE rating = 2),
      COUNT(*) FILTER (WHERE rating = 3),
      COUNT(*) FILTER (WHERE rating = 4),
      COUNT(*) FILTER (WHERE rating = 5),
      NOW()
    FROM coach_ratings
    WHERE
      coach_user_id = COALESCE(NEW.coach_user_id, OLD.coach_user_id)
      AND is_flagged = FALSE
    GROUP BY coach_user_id
    ON CONFLICT (coach_user_id) DO UPDATE SET
      avg_rating  = EXCLUDED.avg_rating,
      total_count = EXCLUDED.total_count,
      count_1     = EXCLUDED.count_1,
      count_2     = EXCLUDED.count_2,
      count_3     = EXCLUDED.count_3,
      count_4     = EXCLUDED.count_4,
      count_5     = EXCLUDED.count_5,
      updated_at  = NOW();
    RETURN NEW;
  END;
$$;

DROP TRIGGER IF EXISTS trg_coach_rating_summary ON coach_ratings;
CREATE TRIGGER trg_coach_rating_summary
AFTER INSERT OR UPDATE ON coach_ratings
FOR EACH ROW EXECUTE FUNCTION fn_update_coach_rating_summary();
