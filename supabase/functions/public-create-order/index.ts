import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function isUuid(value: string | null): boolean {
  return (
    value !== null &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'method_not_allowed' }, 405);

  const idempotencyKey = request.headers.get('idempotency-key');
  if (!isUuid(idempotencyKey)) return response({ error: 'invalid_idempotency_key' }, 422);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return response({ error: 'service_unavailable' }, 503);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return response({ error: 'invalid_json' }, 422);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return response({ error: 'invalid_checkout_payload' }, 422);
  }

  const body = payload as Record<string, unknown>;
  const unitSlug = typeof body.unit_slug === 'string' ? body.unit_slug : '';
  const orderPayload = {
    customer_name: body.customer_name,
    items: body.items,
    modality: body.modality,
    notes: body.notes,
  };
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.rpc('create_order_atomic', {
    p_idempotency_key: idempotencyKey,
    p_payload: orderPayload,
    p_unit_slug: unitSlug,
  });

  if (error) {
    if (error.code === '40001') return response({ error: 'idempotency_conflict' }, 409);
    if (error.code === '22023' || error.code === 'P0001' || error.code === 'P0002') {
      return response({ error: 'checkout_not_available' }, 422);
    }
    return response({ error: 'checkout_unavailable' }, 503);
  }

  const order = Array.isArray(data) ? data[0] : data;
  return response({ order }, 201);
});
