import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log("Webhook Payload:", JSON.stringify(payload, null, 2));

    // Supabase webhook payload
    const { type, record } = payload;

    // We only care if an email is provided
    if (!record || !record.email) {
      return new Response("No email provided, skipping.", { status: 200 });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Fetch RSVP details
    const { data: rsvpData, error: rsvpError } = await supabase
      .from("loop_rsvps")
      .select("status, plus_ones, attendee:loop_attendees(name), event:loop_events(title, event_date, location)")
      .eq("id", record.rsvp_id)
      .single();

    if (rsvpError || !rsvpData) {
      console.error("Failed to fetch RSVP data:", rsvpError);
      return new Response("Failed to fetch RSVP details", { status: 500 });
    }

    const { status, plus_ones, attendee, event } = rsvpData;
    
    // Only send email if they are going or maybe (or we can send for not_going too)
    const attendeeName = attendee.name;
    const eventTitle = event.title;
    const eventDate = new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    
    let subject = "";
    let htmlContent = "";

    if (status === "going") {
      subject = `RSVP Confirmed: ${eventTitle}`;
      const plusOneText = plus_ones > 0 ? ` and your +${plus_ones}` : "";
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #8b5cf6;">You're on the list! 🎉</h2>
          <p>Hi ${attendeeName},</p>
          <p>We're so excited to have you${plusOneText} join us for <strong>${eventTitle}</strong>!</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>When:</strong> ${eventDate}</p>
            <p style="margin: 0;"><strong>Where:</strong> ${event.location || "Location TBA"}</p>
          </div>
          <p>If anything changes, you can always update your RSVP using your original link.</p>
          <p>See you soon!</p>
        </div>
      `;
    } else if (status === "maybe") {
      subject = `RSVP Received: ${eventTitle}`;
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #f59e0b;">We've got your RSVP! ⏳</h2>
          <p>Hi ${attendeeName},</p>
          <p>We noted that you're a "Maybe" for <strong>${eventTitle}</strong>.</p>
          <p>Whenever you know for sure, just update your RSVP using your original link so we can finalize the numbers!</p>
          <p>Hope you can make it!</p>
        </div>
      `;
    } else {
      subject = `Sorry you can't make it to ${eventTitle}`;
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #6b7280;">We'll miss you! 😢</h2>
          <p>Hi ${attendeeName},</p>
          <p>We're sorry you won't be able to join us for <strong>${eventTitle}</strong>.</p>
          <p>If your plans change, feel free to update your RSVP anytime.</p>
        </div>
      `;
    }

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: "Loop Events <hello@loop.mondero.nz>",
        to: [record.email],
        subject: subject,
        html: htmlContent
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API Error:", errorText);
      return new Response(`Failed to send email: ${errorText}`, { status: 500 });
    }

    console.log(`Successfully sent ${status} email to ${record.email}`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Internal Error:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
});
