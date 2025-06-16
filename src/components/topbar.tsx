// Note: No "use client" directive, so it can be used in a server component

import { ArrowUpRightIcon, HomeIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { requestDevServer } from "./webview-actions";
import { useQuery } from "@tanstack/react-query";

// ssh -i ./.linux/ubuntu-24.04.id_rsa   -o ProxyCommand="bash -c 'exec 3<&0; { echo $1; cat <&3; } | nc localhost 2222'" root@dummy

export function TopBar({
  appName,
  children,
  repoId,
  baseId,
}: {
  appName: string;
  children?: React.ReactNode;
  repoId: string;
  baseId: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["code-server-url", baseId, repoId],
    queryFn: async () => {
      // calling requestDevServer right away breaks the web view for some reason
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = await requestDevServer({
        baseId: baseId,
        repoId: repoId,
      });
      return data;
    },
    refetchInterval: 10000,
  });

  function getSshCommand() {
    if (!data || !data.codeServerUrl) {
      return;
    }

    const key = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAjSuGRiN4zuBGxGY9ItZYJNEjtHVAV5a+bBMzCMsSosgAAAJiAyamtgMmp
rQAAAAtzc2gtZWQyNTUxOQAAACAjSuGRiN4zuBGxGY9ItZYJNEjtHVAV5a+bBMzCMsSosg
AAAEDYJzeP73E84nWF1yOiRSF3U4Ydq6pyQdBLRpECmk1cXCNK4ZGI3jO4EbEZj0i1lgk0
SO0dUBXlr5sEzMIyxKiyAAAAD3Jvb3RAbWljcm92bXMtMQECAwQFBg==
-----END OPENSSH PRIVATE KEY-----`;

    const id = new URL(data.codeServerUrl).host.split(".").at(0);
    return `
touch /tmp/${id}.id_rsa && echo "${key}" > /tmp/${id}.id_rsa && chmod 600 /tmp/${id}.id_rsa && \
ssh -i /tmp/${id}.id_rsa -o ProxyCommand="bash -c 'exec 3<&0; { echo ${id}; cat <&3; } | nc 34.94.83.177 2222'" root@${id}`;
  }

  function getVSCodeOpenScript() {
    if (!data || !data.codeServerUrl) return;

    const key = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACAjSuGRiN4zuBGxGY9ItZYJNEjtHVAV5a+bBMzCMsSosgAAAJiAyamtgMmp
rQAAAAtzc2gtZWQyNTUxOQAAACAjSuGRiN4zuBGxGY9ItZYJNEjtHVAV5a+bBMzCMsSosg
AAAEDYJzeP73E84nWF1yOiRSF3U4Ydq6pyQdBLRpECmk1cXCNK4ZGI3jO4EbEZj0i1lgk0
SO0dUBXlr5sEzMIyxKiyAAAAD3Jvb3RAbWljcm92bXMtMQECAwQFBg==
-----END OPENSSH PRIVATE KEY-----`;

    const id = new URL(data.codeServerUrl).host.split(".")[0];

    return `bash -c '
id=${id}
key_path=/tmp/$id.id_rsa

# Write private key
cat <<EOF > "$key_path"
${key}
EOF

chmod 600 "$key_path"

# Ensure ~/.ssh/config has a valid entry
config_entry="Host $id
  HostName $id
  User root
  IdentityFile $key_path
  ProxyCommand bash -c '\\''exec 3<&0; { echo $id; cat <&3; } | nc 34.94.83.177 2222'\\''"

mkdir -p ~/.ssh
touch ~/.ssh/config
if ! grep -q "Host $id" ~/.ssh/config; then
  echo -e "\\n$config_entry" >> ~/.ssh/config
fi

# Launch VS Code with remote folder
code --folder-uri "vscode-remote://ssh-remote+$id/home/root"
'`;
  }

  function getConsoleUrl() {
    if (!data || !data.codeServerUrl) {
      return;
    }

    const id = new URL(data.codeServerUrl).host.split(".").at(0);
    return "http://" + id + ".vm.freestyle.sh/__console";
  }

  return (
    <div className="h-12 sticky top-0 flex items-center px-4 border-b border-gray-200 bg-background justify-between">
      <Link href={"/"}>
        <HomeIcon />
      </Link>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant={"outline"}>
            {/* <img src="/vscode-logo.svg" className="h-4 w-4" alt="VS Code" /> */}
            Open In
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Code Editor Options</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {data && (
              <>
                <div>
                  <a
                    href={data.codeServerUrl}
                    target="_blank"
                    className="w-full"
                  >
                    <Button
                      variant="default"
                      className="w-full flex justify-between items-center"
                    >
                      <span>Open VS Code in Browser</span>
                      <ArrowUpRightIcon className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
                <div>
                  <a href={getConsoleUrl()} target="_blank" className="w-full">
                    <Button
                      variant="default"
                      className="w-full flex justify-between items-center"
                    >
                      <span>Open Console</span>
                      <ArrowUpRightIcon className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
                <div>
                  <Button
                    variant="outline"
                    className="w-full flex justify-between items-center"
                    onClick={() => {
                      navigator.clipboard.writeText(getSshCommand());
                      setModalOpen(false);
                    }}
                  >
                    <span>Copy SSH Command</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Copy
                    </span>
                  </Button>
                  {/* <div className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                    <code>{getSshCommand()}</code>
                  </div> */}
                </div>
                <div>
                  <Button
                    variant="outline"
                    className="w-full flex justify-between items-center"
                    onClick={() => {
                      navigator.clipboard.writeText(getVSCodeOpenScript());
                      setModalOpen(false);
                    }}
                  >
                    <span>Copy VS Code Command</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Copy
                    </span>
                  </Button>
                  {/* <div className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                    <code>{getSshCommand()}</code>
                  </div> */}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
