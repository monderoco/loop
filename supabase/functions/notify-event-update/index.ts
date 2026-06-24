import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { eventId, updateType, message } = await req.json();
    
    // Create client with user's auth context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response("Missing auth header", { status: 401, headers: corsHeaders });
    }
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Verify organizer owns event
    const { data: event, error: eventError } = await supabase
      .from('loop_events')
      .select('title, slug, organizer_id, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event || event.organizer_id !== user.id) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    // Get all attendees with emails
    const { data: rsvps, error: rsvpsError } = await supabase
      .from('loop_rsvps')
      .select('status, attendee:loop_attendees(name), contact:loop_rsvp_contacts(email)')
      .eq('event_id', eventId);

    if (rsvpsError || !rsvps) {
      return new Response("Error fetching RSVPs", { status: 500, headers: corsHeaders });
    }

    // Filter to those who provided an email
    const emailsToSend = rsvps
      .filter((r: any) => r.contact && r.contact.email)
      .map((r: any) => ({
        email: r.contact.email,
        name: r.attendee.name,
        status: r.status // going, maybe, not_going
      }));

    if (emailsToSend.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const eventTitle = event.title;
    const isCancel = updateType === 'cancel';
    
    const batchData = emailsToSend.map((guest: any) => {
      let subject = isCancel ? `Event Cancelled: ${eventTitle}` : `Event Update: ${eventTitle}`;
      
      let htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: ${isCancel ? '#ef4444' : '#3b82f6'};">${isCancel ? 'Event Cancelled' : 'Event Update'}</h2>
          <p>Hi ${guest.name},</p>
          <p>The organizer has ${isCancel ? 'cancelled' : 'updated the details for'} <strong>${eventTitle}</strong>.</p>
          ${message ? `
            <div style="background: #f3f4f6; padding: 16px; border-left: 4px solid ${isCancel ? '#ef4444' : '#3b82f6'}; margin: 20px 0;">
              <p style="margin: 0; font-style: italic;">"${message}"</p>
            </div>
          ` : ''}
          <p>${isCancel ? 'We hope to see you at a future event!' : `Check out the updated details using your original RSVP link: <a href="https://loop.mondero.nz/event/${event.slug || eventId}">View Event</a>`}</p>
        </div>
      `;

      return {
        from: "Loop Events ✨ <invite@mondero.nz>",
        to: [guest.email],
        subject: subject,
        html: htmlContent
      };
    });

    // Send in chunks of 100
    for (let i = 0; i < batchData.length; i += 100) {
      const chunk = batchData.slice(i, i + 100);
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`
        },
        body: JSON.stringify(chunk)
      });

      if (!res.ok) {
        console.error("Resend Batch Error:", await res.text());
        return new Response("Failed to send some emails", { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ success: true, count: emailsToSend.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Internal Error:", err);
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
});
