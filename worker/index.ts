import handler from "vinext/server/app-router-entry";
import operatorPricingContext from "../netlify/functions/operator-pricing-context.mjs";
import pricingContext from "../netlify/functions/pricing-context.mjs";

const worker = {
  fetch(request: Request, env: unknown, context: ExecutionContext) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/.netlify/functions/pricing-context") return pricingContext(request);
    if (pathname === "/.netlify/functions/operator-pricing-context") return operatorPricingContext(request);
    return handler.fetch(request, env, context);
  },
};

export default worker;
