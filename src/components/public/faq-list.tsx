import { Plus } from "lucide-react";
import { getMessages } from "@/lib/i18n/server";
export async function FaqList({ limit }: { limit?: number }) {
  const { faqs } = await getMessages();
  return (
    <div className="faq-list">
      {faqs.slice(0, limit).map(([question, answer]) => (
        <details key={question}>
          <summary>
            {question}
            <Plus size={19} aria-hidden="true" />
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}
