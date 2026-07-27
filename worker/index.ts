import handler from "vinext/server/app-router-entry";
import accountProjectFeedback from "../netlify/functions/account-project-feedback.mjs";
import accountProjects from "../netlify/functions/account-projects.mjs";
import authLoginComplete from "../netlify/functions/auth-login-complete.mjs";
import authLoginStart from "../netlify/functions/auth-login-start.mjs";
import authSignupResend from "../netlify/functions/auth-signup-resend.mjs";
import authSignupStart from "../netlify/functions/auth-signup-start.mjs";
import checkoutStatus from "../netlify/functions/checkout-status.mjs";
import contact from "../netlify/functions/contact.mjs";
import createCheckout from "../netlify/functions/create-checkout.mjs";
import freeSnapshot from "../netlify/functions/free-snapshot.mjs";
import operatorPricingContext from "../netlify/functions/operator-pricing-context.mjs";
import orderDraft from "../netlify/functions/order-draft.mjs";
import paymentHealth from "../netlify/functions/payment-health.mjs";
import pricingContext from "../netlify/functions/pricing-context.mjs";
import projectApproval from "../netlify/functions/project-approval.mjs";
import projectIntake from "../netlify/functions/project-intake.mjs";
import refundAuthorization from "../netlify/functions/refund-authorization.mjs";
import refundExecute from "../netlify/functions/refund-execute.mjs";
import stripeWebhook from "../netlify/functions/stripe-webhook.mjs";
import { installWorkerEnvironment } from "./environment.mjs";
import { createMediaRangeResponse } from "./media-range.mjs";

type WorkerEnvironment = {
  ASSETS: { fetch(request: Request): Promise<Response> };
} & Record<string, string | { fetch(request: Request): Promise<Response> }>;

const routes = new Map<string, (request: Request) => Promise<Response>>([
  ["/api/account-project-feedback", accountProjectFeedback],
  ["/api/account-projects", accountProjects],
  ["/api/auth-login-complete", authLoginComplete],
  ["/api/auth-login-start", authLoginStart],
  ["/api/auth-signup-resend", authSignupResend],
  ["/api/auth-signup-start", authSignupStart],
  ["/api/checkout-status", checkoutStatus],
  ["/api/contact", contact],
  ["/api/create-checkout", createCheckout],
  ["/api/free-snapshot", freeSnapshot],
  ["/api/order-draft", orderDraft],
  ["/api/payment-health", paymentHealth],
  ["/api/pricing-context", pricingContext],
  ["/api/project-approval", projectApproval],
  ["/api/project-intake", projectIntake],
  ["/api/refund-authorization", refundAuthorization],
  ["/api/refund-execute", refundExecute],
  ["/api/stripe-webhook", stripeWebhook],
  ["/.netlify/functions/pricing-context", pricingContext],
  ["/.netlify/functions/operator-pricing-context", operatorPricingContext],
]);

const isShowcaseVideo = (pathname: string) => pathname.startsWith("/media/showcases/") && pathname.endsWith(".mp4");

const worker = {
  async fetch(request: Request, env: WorkerEnvironment, context: ExecutionContext) {
    installWorkerEnvironment(env, process.env);
    const pathname = new URL(request.url).pathname;
    if (isShowcaseVideo(pathname)) {
      if (request.method === "GET" && request.headers.has("Range")) {
        const asset = await env.ASSETS.fetch(request);
        if (asset.status === 206 || !asset.ok) return asset;
        return createMediaRangeResponse(request, asset);
      }
      return env.ASSETS.fetch(request);
    }
    const route = routes.get(pathname);
    if (route) return route(request);
    return handler.fetch(request, env, context);
  },
};

export default worker;
