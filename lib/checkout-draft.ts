export const checkoutDraftKey = "social-current-checkout-v1";
export type CheckoutDraft = {
  serviceSlug: string; offerId: string; quantity: number; commentsText: string;
  link: string; email: string; paymentMethod: string; order?: string; selectionKey?: string; savedAt: number;
};
export function parseCheckoutDraft(raw: string | null, now = Date.now()): CheckoutDraft | null {
  try {
    const draft = JSON.parse(raw || "null");
    if (!draft || typeof draft !== "object" || typeof draft.savedAt !== "number"
      || draft.savedAt > now || now-draft.savedAt > 60*60*1000
      || ![draft.serviceSlug,draft.offerId,draft.commentsText,draft.link,draft.email,draft.paymentMethod].every(x=>typeof x === "string")
      || !Number.isInteger(draft.quantity) || draft.quantity <= 0
      || draft.link.length > 2048 || draft.email.length > 254 || draft.commentsText.length > 100_000
      || (draft.order !== undefined && typeof draft.order !== "string")
      || (draft.selectionKey !== undefined && typeof draft.selectionKey !== "string")) return null;
    return draft;
  } catch {return null;}
}
export function persistCheckoutDraft(draft: Omit<CheckoutDraft,"savedAt">) {
  try {sessionStorage.setItem(checkoutDraftKey,JSON.stringify({...draft,savedAt:Date.now()}));} catch {}
}
