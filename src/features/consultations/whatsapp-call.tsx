import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { site } from "@/config/site";
import { cancelWhatsAppCall, completeConsultationCall, requestWhatsAppCall } from "./meeting-actions";

export function WhatsAppCall({
  user,
  staff,
  completed,
  request,
  phone,
  applicationLink,
}: {
  user: string;
  staff: boolean;
  completed: boolean;
  request: { id: string; requested_by: string | null; note: string } | null;
  phone?: string;
  applicationLink?: string;
}) {
  const digits = phone?.replace(/\D/g, "");
  const contact = staff ? (digits && digits.length >= 7 ? `https://wa.me/${digits}` : "") : site.whatsapp;
  return (
    <section className="workspace-panel" id="consultation-call">
      <h2>WhatsApp consultation</h2>
      {completed && !staff && (
        <p>
          Your consultation is complete.{" "}
          <Link className="text-link" href={applicationLink || "/dashboard/application"}>
            Open scholarship application
          </Link>
        </p>
      )}
      {request ? (
        <>
          <p>{request.requested_by === user ? "Applicant requested a call." : "ISG requested a call."}</p>
          {request.note !== "WhatsApp call" && <p className="preserve-lines">{request.note}</p>}
          {contact && (
            <a className="text-link" href={contact} target="_blank" rel="noopener noreferrer">
              {staff ? "Message applicant on WhatsApp" : "Message ISG on WhatsApp"}
            </a>
          )}
          {(staff || request.requested_by === user) && (
            <ActionForm action={cancelWhatsAppCall} label="Cancel call request">
              <input type="hidden" name="user" value={user} />
              <input type="hidden" name="request" value={request.id} />
            </ActionForm>
          )}
        </>
      ) : (
        <ActionForm action={requestWhatsAppCall} label="Request WhatsApp call">
          <input type="hidden" name="user" value={user} />
          <label>
            Call availability (optional)
            <input name="note" placeholder="e.g. Weekdays after 3 pm EAT" maxLength={200} />
          </label>
        </ActionForm>
      )}
      {staff && !completed && (
        <details className="package-gallery">
          <summary>Complete consultation and unlock application</summary>
          <ActionForm action={completeConsultationCall} label="Unlock scholarship application">
            <input type="hidden" name="user" value={user} />
            <label className="checkbox-field">
              <input type="checkbox" name="met" required /> The consultation has taken place.
            </label>
          </ActionForm>
        </details>
      )}
    </section>
  );
}
