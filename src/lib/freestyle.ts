import { FreestyleSandboxes } from "freestyle-sandboxes";

export const freestyle = new FreestyleSandboxes({
  apiKey: process.env.FREESTYLE_PROD_API_KEY!,
  baseUrl: "https://api.freestyle.it.com",
});
