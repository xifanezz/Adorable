import { FreestyleSandboxes } from "freestyle-sandboxes";

export function shim(api: FreestyleSandboxes): FreestyleSandboxes & {
  requestDevServer: (args: { repo: string }) => Promise<{
    ephemeralUrl: string;
    devCommandRunning: boolean;
    installCommandRunning: boolean;
  }>;
} {
  api.requestDevServer = async ({ repo }) => {
    return await fetch("https://api.freestyle.sh/ephemeral/v1/dev-servers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ` + process.env.FREESTYLE_API_KEY,
      },
      body: JSON.stringify({
        command: null,
        repo: repo,
        domain: null,
      }),
    })
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
