"use server";

import { FreestyleSandboxes } from "freestyle-sandboxes";
import { shim } from "./shim";

export async function requestDevServer({ repo }: { repo: string }) {

    const api = shim(
        new FreestyleSandboxes({
            apiKey: process.env.FREESTYLE_API_KEY!,
        })
    );

    const { ephemeralUrl, devCommandRunning } = await api.requestDevServer({
        repo,
    });

    return {
        ephemeralUrl,
        devCommandRunning,
    };
}