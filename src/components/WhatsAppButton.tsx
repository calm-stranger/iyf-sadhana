import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";

export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
}: {
  phone: string;
  message?: string;
  label?: string;
}) {
  return (
    <a
      href={whatsappLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-good/10 px-3 py-1.5 text-sm font-medium text-good"
    >
      <MessageCircle size={16} />
      {label}
    </a>
  );
}
