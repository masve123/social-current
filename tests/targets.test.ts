import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOrderTarget, parseProfileTarget } from "../lib/profile-target";
import { getService } from "../lib/services";
import { orderCapabilities } from "../lib/order-actions";
import type { StoredOrder } from "../lib/order-store";

for (const [platform, input, expected] of [
  ["Instagram", "@creator", "https://www.instagram.com/creator/"],
  ["TikTok", "https://www.tiktok.com/@creator?lang=en", "https://www.tiktok.com/@creator"],
  ["YouTube", "https://youtube.com/channel/UCabcdefghijklmnopqrstuv", "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"],
  ["YouTube", "https://youtube.com/c/creator", "https://www.youtube.com/c/creator"],
  ["YouTube", "https://youtube.com/user/creator", "https://www.youtube.com/user/creator"],
] as const) {
  test(`profile target accepts ${input}`, () => assert.equal(parseProfileTarget(platform, input)?.url, expected));
}
for (const input of ["https://instagram.com/p/ABC", "https://instagram.com/reel/ABC", "https://instagram.com.evil.test/creator", "https://user:pass@instagram.com/creator", "https://instagram.com:444/creator", "http://instagram.com/creator", "https://instagram.com/explore/"]) {
  test(`profile target rejects ${input}`, () => assert.equal(parseProfileTarget("Instagram", input), null));
}
for (const [slug, input, expected] of [
  ["instagram-likes", "https://instagram.com/reel/ABC_123?igsh=tracking#part", "https://instagram.com/reel/ABC_123"],
  ["tiktok-views", "https://vm.tiktok.com/ABC123/", "https://vm.tiktok.com/ABC123/"],
  ["tiktok-views", "https://www.tiktok.com/@creator/video/123456?lang=en", "https://www.tiktok.com/@creator/video/123456"],
  ["youtube-views", "https://youtu.be/abcdefghijk?si=tracking", "https://www.youtube.com/watch?v=abcdefghijk"],
  ["youtube-views", "https://youtube.com/shorts/abcdefghijk", "https://www.youtube.com/watch?v=abcdefghijk"],
  ["youtube-views", "https://youtube.com/watch?v=abcdefghijk&t=10", "https://www.youtube.com/watch?v=abcdefghijk"],
] as const) {
  test(`post target accepts ${input}`, () => assert.equal(parseOrderTarget(getService(slug)!, input)?.url, expected));
}
for (const [slug, input] of [
  ["instagram-likes", "https://instagram.com/creator"],
  ["instagram-likes", "https://evil.test/p/ABC"],
  ["tiktok-views", "https://www.tiktok.com/@creator"],
  ["youtube-views", "https://youtube.com/@creator"],
  ["youtube-views", "https://youtu.be/short"],
  ["youtube-views", "https://user:pass@youtu.be/abcdefghijk"],
] as const) {
  test(`post target rejects ${input}`, () => assert.equal(parseOrderTarget(getService(slug)!, input), null));
}

const delivered = {service_slug:"instagram-followers", offer_id:"standard", provider:"smmworld", provider_order_id:"123", provider_status:"Completed", payment_status:"finished"} as StoredOrder;
test("completed refill package permits refill and prevents cancellation", () => {
  assert.deepEqual(orderCapabilities(delivered), {can_refill:true,can_cancel:false});
});
test("No refill packages never offer refill", () => {
  assert.equal(orderCapabilities({...delivered,service_slug:"youtube-subscribers"}).can_refill, false);
});
test("refunded orders offer no supplier actions", () => {
  assert.deepEqual(orderCapabilities({...delivered,payment_status:"refunded"}), {can_refill:false,can_cancel:false});
});
test("pending paid order permits cancellation", () => {
  assert.deepEqual(orderCapabilities({...delivered,provider_status:"Pending"}), {can_refill:false,can_cancel:true});
});
