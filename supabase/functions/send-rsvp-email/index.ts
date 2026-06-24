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
      .select("status, plus_ones, host_activity, attendee:loop_attendees(name), event:loop_events(id, slug, title, event_date, location, organizer_id)")
      .eq("id", record.rsvp_id)
      .single();

    if (rsvpError || !rsvpData) {
      console.error("Failed to fetch RSVP data:", rsvpError);
      return new Response("Failed to fetch RSVP details", { status: 500 });
    }

    const { status, plus_ones, host_activity, attendee, event } = rsvpData;
    
    // Only send email if they are going or maybe (or we can send for not_going too)
    const attendeeName = attendee.name;
    const eventTitle = event.title;
    const eventDate = new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    
    const eventLink = `https://loop.mondero.nz/#/event/${event.slug || event.id}`;
    const calStart = new Date(event.event_date).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const calEnd = new Date(new Date(event.event_date).getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const calLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${calStart}/${calEnd}&details=${encodeURIComponent("RSVP and details: " + eventLink)}&location=${encodeURIComponent(event.location || "")}`;

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
          <div style="margin-top: 24px; margin-bottom: 24px;">
            <a href="${eventLink}" style="display: inline-block; background: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px; margin-bottom: 10px;">View Event Details</a>
            <a href="${calLink}" style="display: inline-block; background: #f3f4f6; color: #333; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-bottom: 10px;">Add to Google Calendar</a>
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
          <div style="margin-top: 24px; margin-bottom: 24px;">
            <a href="${eventLink}" style="display: inline-block; background: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Event Details</a>
          </div>
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

    // 1. Send email to the Guest
    const guestRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: "Loop Events <loop@mondero.nz>",
        to: [record.email],
        subject: subject,
        html: htmlContent
      })
    });

    if (!guestRes.ok) {
      console.error("Resend API Error (Guest):", await guestRes.text());
    } else {
      console.log(`Successfully sent ${status} email to guest ${record.email}`);
    }

    // 2. Send notification to the Organizer
    if (event.organizer_id) {
      // Small delay to prevent Resend rate limits (2 per second on free tier)
      await new Promise(r => setTimeout(r, 1000));
      
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(event.organizer_id);
        const organizerEmail = userData?.user?.email;
        
        if (userError) {
          console.error("Failed to fetch organizer from auth.users:", userError);
        }
        
        if (organizerEmail) {
          const plusOneText = plus_ones > 0 ? ` + ${plus_ones}` : "";
          const hostActivityHtml = host_activity ? `<p style="margin: 0 0 8px;"><strong>Hosting:</strong> ${host_activity}</p>` : "";
          const plusOnesDataHtml = record.plus_ones_data?.length ? `<div style="margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;"><p style="margin: 0 0 8px; font-weight: bold;">+1 Details:</p>${record.plus_ones_data.map((p:any) => `<p style="margin: 0 0 4px; font-size: 14px;">- ${p.name || 'Unnamed'} ${p.phone ? `📞 ${p.phone}` : ''} ${p.email ? `✉️ ${p.email}` : ''}</p>`).join('')}</div>` : "";
          
          const orgSubject = `New RSVP: ${attendeeName} is ${status} for ${eventTitle}`;
          const orgHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #8b5cf6;">RSVP Update</h2>
              <p><strong>${attendeeName}</strong> has just updated their RSVP for <strong>${eventTitle}</strong>.</p>
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px;"><strong>Status:</strong> ${status.toUpperCase()} ${plusOneText}</p>
                ${hostActivityHtml}
                <p style="margin: 0 0 8px;"><strong>Guest Email:</strong> ${record.email}</p>
                ${record.contact_number ? `<p style="margin: 0;"><strong>Guest Phone:</strong> ${record.contact_number}</p>` : ''}
                ${plusOnesDataHtml}
              </div>
              <p>Check your Loop Dashboard for the full guest list!</p>
            </div>
          `;

          const orgRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
              from: "Loop Notifications <loop@mondero.nz>",
              to: [organizerEmail],
              subject: orgSubject,
              html: orgHtml
            })
          });

          if (!orgRes.ok) {
            console.error("Resend API Error (Organizer):", await orgRes.text());
          } else {
            console.log(`Successfully notified organizer ${organizerEmail}`);
          }
        }
      } catch (orgErr) {
        console.error("Error during organizer notification:", orgErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Internal Error:", err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
});
