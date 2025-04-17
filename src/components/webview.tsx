"use client";

import { FreestyleDevServer } from "@/freestyle-sdk/repo-preview";

export default function WebView() {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Web View</h2>
      <div className="flex-grow w-full">
        {/* <iframe 
          src="https://jacob-test-3543.style.dev" 
          className="w-full h-full border-0 rounded-md"
          title="Jacob Test Website"
          sandbox="allow-scripts allow-same-origin allow-forms"
          /> */}
        <FreestyleDevServer repo="https://4c3fe764-6eb3-4c36-8462-aa96ee860bf9:Kgtep7u1p46bf2pK.QTkzG12n56GcKVGZ@git.freestyle.sh/2e3a44c2-34de-456e-99ae-ecb76f2379ea" />
      </div>
    </div>
  );
}
