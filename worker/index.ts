import handler from "vinext/server/app-router-entry";
import accountProjects from "../netlify/functions/account-projects.mjs";
import contact from "../netlify/functions/contact.mjs";
import createCheckout from "../netlify/functions/create-checkout.mjs";
import freeSnapshot from "../netlify/functions/free-snapshot.mjs";
import operatorOverview from "../netlify/functions/operator-overview.mjs";
import operatorPricingContext from "../netlify/functions/operator-pricing-context.mjs";
import pricingContext from "../netlify/functions/pricing-context.mjs";
import projectIntake from "../netlify/functions/project-intake.mjs";
import stripeWebhook from "../netlify/functions/stripe-webhook.mjs";

const routes = new Map<string, (request: Request) => Promise<Response>>([
  ["/api/account-projects", accountProjects],
  ["/api/contact", contact],
  ["/api/create-checkout", createCheckout],
  ["/api/free-snapshot", freeSnapshot],
  ["/api/operator-overview", operatorOverview],
  ["/api/pricing-context", pricingContext],
  ["/api/project-intake", projectIntake],
  ["/api/stripe-webhook", stripeWebhook],
  ["/.netlify/functions/pricing-context", pricingContext],
  ["/.netlify/functions/operator-pricing-context", operatorPricingContext],
]);

const worker = {
  fetch(request: Request, env: unknown, context: ExecutionContext) {
    const pathname = new URL(request.url).pathname;
    const route = routes.get(pathname);
    if (route) return route(request);
    return handler.fetch(request, env, context);
  },
};

export default worker;
