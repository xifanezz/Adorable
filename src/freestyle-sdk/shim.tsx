import { FreestyleSandboxes } from "freestyle-sandboxes";

export function shim(api: FreestyleSandboxes): FreestyleSandboxes & {
  requestDevServer: (args: { repo: string }) => Promise<{
    ephemeralUrl: string;
    devCommandRunning: boolean;
    installCommandRunning: boolean;
  }>;
} {
  api.requestDevServer = async ({ repo }) => {
    return await fetch(
      "https://api.freestyle.it.com/ephemeral/v1/dev-servers",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ` + process.env.FREESTYLE_API_KEY,
        },
        body: JSON.stringify({
          command: null,
          repo: "https://4c3fe764-6eb3-4c36-8462-aa96ee860bf9:Kgtep7u1p46bf2pK.QTkzG12n56GcKVGZ@git.freestyle.sh/2e3a44c2-34de-456e-99ae-ecb76f2379ea",
          domain: null,
        }),
      }
    )
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        return {
          ephemeralUrl: data.url,
          ...data,
        };
      });
  };

  return api;
}
