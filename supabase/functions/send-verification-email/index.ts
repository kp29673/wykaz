import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  email: string;
  studentName: string;
  indexNumber: string;
  verificationUrl: string;
}

interface VerificationEmailRequest {
  recipients: Recipient[];
  courseName: string;
  assignmentTitle: string;
  fileName: string;
  fileUrl: string;
  comment: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, courseName, assignmentTitle, fileName, fileUrl, comment }: VerificationEmailRequest = await req.json();

    // Download file from storage to attach it
    let fileAttachment = null;
    try {
      const fileResponse = await fetch(fileUrl);
      if (fileResponse.ok) {
        const fileBuffer = await fileResponse.arrayBuffer();
        const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
        fileAttachment = {
          filename: fileName.split('/').pop() || 'submission',
          content: base64Content,
        };
      }
    } catch (error) {
      console.error("Error downloading file for attachment:", error);
    }

    // Build list of students for email
    const studentsList = recipients.map(r => `${r.studentName} — nr indeksu: ${r.indexNumber}`).join('<br>');

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      const emailData: any = {
        from: "Portal Wykładowcy <onboarding@resend.dev>",
        to: recipient.email,
        subject: `Potwierdzenie przesłania pracy zaliczeniowej — kurs: ${courseName}`,
        html: `
          <p>Szanowna Pani / Szanowny Panie,</p>
          <p>Proszę o potwierdzenie przesłanego pliku.</p>
          
          <p><strong>Kurs:</strong> ${courseName}<br>
          <strong>Zadanie:</strong> ${assignmentTitle}</p>
          
          <p>Poniżej znajdują się szczegóły zgłoszenia:</p>
          
          <p><strong>Studenci:</strong><br>${studentsList}</p>
          
          ${comment ? `<p><strong>Komentarz od zgłaszającego:</strong><br>${comment}</p>` : ''}
          
          <p><strong>Załącznik:</strong> ${fileName.split('/').pop()}</p>
          
          <p>Aby potwierdzić, że to Pan/Pani wysłał(a) tę pracę, prosimy kliknąć poniższy przycisk lub skopiować link tekstowy i otworzyć go w przeglądarce.</p>
          
          <a href="${recipient.verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Potwierdź przesłanie
          </a>
          
          <p style="color: #666; font-size: 14px;">( Link ważny przez 24 godziny )</p>
          
          <p style="font-size: 14px; color: #666;">Jeżeli nie rozpoznaje Pan/Pani tej przesyłki lub nie wysyłał(a) Pan/Pani tego pliku, proszę o weryfikację tego u osoby przesyłającej plik.</p>
          
          <p style="margin-top: 32px;">Z poważaniem,<br>Kosma Piekarski</p>
        `,
      };

      if (fileAttachment) {
        emailData.attachments = [fileAttachment];
      }

      return resend.emails.send(emailData);
    });

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Verification emails sent: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successful, 
      failed: failed 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
