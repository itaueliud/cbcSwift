import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, role } = await request.json();
    
    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
    }

    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey) {
      console.warn("SENDGRID_API_KEY is not set. Email not sent, returning success for dev mode.");
      return NextResponse.json({ success: true, warning: "API key missing, simulating success." });
    }

    // Assuming we have a token generation flow, we'd normally save it to DB.
    // For this mock/demo route, we generate a dummy token.
    const token = Math.random().toString(36).substring(2, 15);
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`;

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sendgridKey}`
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
            subject: `Invitation to join CBC Swift as ${role}`
          }
        ],
        from: { email: "no-reply@cbcswift.com", name: "CBC Swift Support" },
        content: [
          {
            type: "text/html",
            value: `
              <h2>Welcome to CBC Swift!</h2>
              <p>You have been invited to join the platform as a <strong>${role}</strong>.</p>
              <p>Click the link below to set up your account:</p>
              <a href="${inviteLink}" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Accept Invitation</a>
            `
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid API Error:", errorText);
      return NextResponse.json({ error: "Failed to send email via SendGrid." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
