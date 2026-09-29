export function directWhatsAppUrl(message: string): string {
  return `https://wa.me/50687959148?text=${encodeURIComponent(message)}`;
}
