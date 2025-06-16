import { FreestyleSandboxes } from "freestyle-sandboxes";

export const freestyle = new FreestyleSandboxes({
  apiKey: process.env.FREESTYLE_API_KEY!,
  baseUrl: process.env.FREESTYLE_API_URL ?? "https://api.freestyle.sh",
  headers: {
    "Freestyle-Firecracker-Dev-Servers": "true",
    "Freestyle-Firecracker-Build-Servers": "true",
    Authorization: `Bearer ${process.env.FREESTYLE_API_KEY}`,
  },
});
