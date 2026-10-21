import { canRestartCheckout } from "@/lib/checkout-recovery";
import { getNowPaymentsPayment, PaymentSetupError } from "@/lib/nowpayments";
import { recordPaymentEvent, type StoredOrder } from "@/lib/order-store";
export async function verifyCheckoutRestart(order:StoredOrder) {
  if(!canRestartCheckout(order)) return false;
  if(!order.payment_id) return true;
  const payment=await getNowPaymentsPayment(order.payment_id);
  if(payment.order_id!==order.public_id || String(payment.payment_id)!==order.payment_id
    || typeof payment.payment_status!=="string" || payment.price_currency!=="usd"
    || !Number.isFinite(Number(payment.price_amount)) || Math.abs(Number(payment.price_amount)-Number(order.amount_usd))>=0.01
    || payment.actually_paid===undefined || payment.actually_paid===null || !Number.isFinite(Number(payment.actually_paid))) {
    throw new PaymentSetupError("We couldn’t verify the earlier payment. Check order tracking or contact support before trying again.");
  }
  await recordPaymentEvent({publicId:order.public_id,paymentId:order.payment_id,paymentStatus:payment.payment_status.toLowerCase(),amountMatches:true,rawBody:`restart-check:${JSON.stringify(payment)}`,payload:payment});
  return ["expired","failed"].includes(payment.payment_status.toLowerCase()) && Number(payment.actually_paid)===0;
}
