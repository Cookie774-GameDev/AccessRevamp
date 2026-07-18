import handler from "vinext/server/app-router-entry";

const worker = {
  fetch(request: Request, env: unknown, context: ExecutionContext) {
    return handler.fetch(request, env, context);
  },
};

export default worker;
