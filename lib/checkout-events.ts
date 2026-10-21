export const browserCheckoutEvents = ["package_selected", "checkout_opened", "payment_returned", "checkout_recovered", "checkout_submit_started", "checkout_client_failed", "checkout_validation_failed"] as const;
export const serverCheckoutEvents = ["checkout_submitted", "checkout_failed", "payment_setup_succeeded", "payment_confirmed", "payment_expired"] as const;
export type CheckoutEventName = typeof browserCheckoutEvents[number] | typeof serverCheckoutEvents[number];
export type CheckoutEvent = {event:CheckoutEventName; eventId:string; sessionId?:string; order?:string; serviceSlug?:string; offerId?:string; currency?:string; quantity?:number; errorCode?:string};
export const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
