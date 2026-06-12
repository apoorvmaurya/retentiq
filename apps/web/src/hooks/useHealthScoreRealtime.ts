import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useHealthScoreRealtime(
  orgId: string | undefined,
  onScoreUpdate: (payload: {
    customer_id: string;
    score: number;
    risk_tier: string;
    churn_probability: number;
    top_risk_factors: string[];
    recommended_action: string;
  }) => void,
) {
  const [updatedRowId, setUpdatedRowId] = useState<string | null>(null);

  // Keep reference to latest callback to avoid sub/unsub cycles
  const callbackRef = useRef(onScoreUpdate);
  useEffect(() => {
    callbackRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`realtime-health-scores-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_scores',
          filter: `org_id=eq.${orgId}`,
        },
        (payload: any) => {
          if (payload.new) {
            const newRecord = payload.new;
            callbackRef.current({
              customer_id: newRecord.customer_id,
              score: Number(newRecord.score),
              risk_tier: newRecord.risk_tier,
              churn_probability: Number(newRecord.churn_probability),
              top_risk_factors: Array.isArray(newRecord.top_risk_factors)
                ? newRecord.top_risk_factors
                : [],
              recommended_action: newRecord.recommended_action || '',
            });

            // Trigger the 600ms yellow highlight animation
            setUpdatedRowId(newRecord.customer_id);
            const timer = setTimeout(() => {
              setUpdatedRowId(null);
            }, 600);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  return { updatedRowId };
}
