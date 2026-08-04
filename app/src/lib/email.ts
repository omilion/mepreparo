import { Resend } from "resend";

// Envío de correos transaccionales (recuperar clave, alertas de progreso,
// recibos). Mismo patrón que gemini.ts: si falta la clave, no revienta — el
// que llama decide qué hacer (loguear y seguir, nunca bloquear al usuario).

let resend: Resend | null = null;

export function tieneClaveEmail(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function cliente(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const REMITENTE =
  process.env.EMAIL_FROM || "mepreparo <onboarding@resend.dev>";

export async function enviarEmail(opts: {
  para: string;
  asunto: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!tieneClaveEmail()) {
    console.warn("RESEND_API_KEY no configurada; email NO enviado:", opts.asunto);
    return { ok: false, error: "SIN_CLAVE" };
  }
  try {
    const { error } = await cliente().emails.send({
      from: REMITENTE,
      to: opts.para,
      subject: opts.asunto,
      html: opts.html,
    });
    if (error) {
      console.error("Error enviando email:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("Fallo de red enviando email:", err);
    return { ok: false, error: "RED" };
  }
}

// Envuelve el contenido en la plantilla visual zen (inline CSS: los clientes de
// correo no cargan hojas de estilo externas). Sin imágenes, tipografía limpia,
// un solo botón de acción si aplica.
export function plantillaZen(opts: {
  titulo: string;
  cuerpoHtml: string; // párrafos ya armados en <p>, sin estilos (se heredan)
  cta?: { texto: string; url: string };
  piePagina?: string;
}): string {
  const { titulo, cuerpoHtml, cta, piePagina } = opts;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:18px;border:1px solid #e4e4e0;">
        <tr><td style="padding:36px 32px;">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#436b57;margin-bottom:12px;">
            mepreparo
          </div>
          <h1 style="font-size:22px;line-height:1.3;color:#1e2422;margin:0 0 16px;font-weight:600;">
            ${titulo}
          </h1>
          <div style="font-size:15px;line-height:1.6;color:#1e2422;">
            ${cuerpoHtml}
          </div>
          ${
            cta
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td style="border-radius:13px;background-color:#436b57;">
              <a href="${cta.url}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                ${cta.texto}
              </a>
            </td></tr>
          </table>`
              : ""
          }
        </td></tr>
      </table>
      <p style="max-width:480px;font-size:12px;color:#5a635e;margin-top:20px;line-height:1.5;">
        ${piePagina || "Recibiste este correo porque tienes una cuenta en mepreparo."}
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}
