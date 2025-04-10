"use client";

export default function WebView() {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Web View</h2>
      <div className="flex-grow w-full">
        <iframe 
          src="https://jacob-test-3543.style.dev" 
          className="w-full h-full border-0 rounded-md"
          title="Jacob Test Website"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}