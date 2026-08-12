import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const upstreamUrl = Deno.env.get("MESHFORGE_MODEL_API_URL");

    if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Service is not configured" }, 503);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    // Verify the user with their auth token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Authentication required" }, 401);

    const payload = await req.json();
    const generationId = payload.generation_id;
    if (!generationId || typeof generationId !== "string") {
      return json({ error: "Generation ID is required" }, 400);
    }

    // Use service-role client to update the generation record
    const admin = createClient(supabaseUrl, serviceKey);

    // If no upstream engine configured, mark as completed with placeholder
    if (!upstreamUrl) {
      await admin.from("generations").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        model_url: null,
      }).eq("id", generationId);
      return json({ status: "completed", provider: "meshforge", note: "Engine not connected — placeholder generation" });
    }

    if (typeof payload.image !== "string" || !payload.image.startsWith("data:image/")) {
      await admin.from("generations").update({
        status: "failed",
        error_message: "Invalid image",
      }).eq("id", generationId);
      return json({ error: "A valid image is required" }, 400);
    }

    const upstreamResponse = await fetch(`${upstreamUrl.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: payload.image,
        remove_background: payload.remove_background !== false,
        texture: payload.texture === true,
        seed: typeof payload.seed === "number" ? payload.seed : 1234,
        octree_resolution: payload.quality === "High" ? 384 : payload.quality === "Draft" ? 192 : 256,
        num_inference_steps: payload.quality === "High" ? 8 : 5,
        guidance_scale: 5,
        num_chunks: 8000,
        face_count: payload.texture === true ? 40000 : 20000,
        type: "glb",
      }),
    });

    if (!upstreamResponse.ok) {
      await admin.from("generations").update({
        status: "failed",
        error_message: "Upstream engine error",
      }).eq("id", generationId);
      return json({ error: "The model engine could not start this generation" }, 502);
    }

    const result = await upstreamResponse.json();
    if (!result || typeof result.uid !== "string") {
      await admin.from("generations").update({
        status: "failed",
        error_message: "Invalid upstream response",
      }).eq("id", generationId);
      return json({ error: "The model engine returned an invalid task" }, 502);
    }

    await admin.from("generations").update({
      task_id: result.uid,
    }).eq("id", generationId);

    return json({ uid: result.uid, provider: "meshforge", generation_id: generationId });
  } catch (error) {
    console.error("meshforge-generate failed", error);
    return json({ error: "Generation service unavailable" }, 500);
  }
});
