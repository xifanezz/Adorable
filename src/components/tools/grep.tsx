"use client";

import { useState } from "react";
import { GrepSchema } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon, FileIcon } from "lucide-react";
import { ToolInvocation } from "ai";

type MatchResult = {
  file: string;
  line: number;
  content: string;
  column?: number;
  matches?: Array<{
    start: number;
    end: number;
  }>;
};

function getNaturalDescription(args: GrepSchema): string {
  const pattern = args.pattern;
  const path = args.path ? ` in ${args.path}` : '';
  const recursive = args.recursive === false ? ' (non-recursive)' : '';
  const caseSensitive = args.caseSensitive ? ' (case-sensitive)' : '';
  const filePattern = args.filePattern ? ` in ${args.filePattern} files` : '';
  
  return `Searching for "${pattern}"${path}${filePattern}${recursive}${caseSensitive}`;
}

function getFilename(path: string): string {
  if (!path) return "";
  return path.split("/").pop() || path;
}

function MatchItem({ match, searchPattern }: { match: MatchResult, searchPattern: string }) {
  const [expanded, setExpanded] = useState(false);
  const filename = getFilename(match.file);
  
  // Highlight matches in content if column info is available
  const highlightedContent = () => {
    if (!match.matches || match.matches.length === 0) {
      // Try to find the pattern ourselves
      const pattern = new RegExp(searchPattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      const parts = [];
      let lastIndex = 0;
      let result;
      
      const content = match.content;
      while ((result = pattern.exec(content)) !== null) {
        if (result.index > lastIndex) {
          parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, result.index)}</span>);
        }
        parts.push(
          <span key={`match-${result.index}`} className="bg-yellow-200 dark:bg-yellow-800">
            {content.slice(result.index, result.index + result[0].length)}
          </span>
        );
        lastIndex = result.index + result[0].length;
      }
      
      if (lastIndex < content.length) {
        parts.push(<span key={`text-end`}>{content.slice(lastIndex)}</span>);
      }
      
      return parts.length > 0 ? parts : content;
    }
    
    // Use provided match information
    const content = match.content;
    const parts = [];
    let lastIndex = 0;
    
    match.matches.forEach((range, i) => {
      if (range.start > lastIndex) {
        parts.push(<span key={`text-${i}-${lastIndex}`}>{content.slice(lastIndex, range.start)}</span>);
      }
      parts.push(
        <span key={`match-${i}`} className="bg-yellow-200 dark:bg-yellow-800">
          {content.slice(range.start, range.end)}
        </span>
      );
      lastIndex = range.end;
    });
    
    if (lastIndex < content.length) {
      parts.push(<span key={`text-end`}>{content.slice(lastIndex)}</span>);
    }
    
    return parts;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden mb-2">
      <div 
        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 truncate">
          <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{filename}</span>
          <span className="text-xs text-gray-500 whitespace-nowrap">Line {match.line}</span>
        </div>
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="p-2 bg-white dark:bg-gray-900 overflow-x-auto">
          <pre className="text-xs whitespace-pre-wrap">{highlightedContent()}</pre>
        </div>
      )}
    </div>
  );
}

export const GrepRenderer = (props: {
  toolInvocation: ToolInvocation;
  className?: string;
}) => {
  const { toolInvocation } = props;
  const args = toolInvocation.args as GrepSchema;
  const [expanded, setExpanded] = useState(true);
  const description = getNaturalDescription(args);
  
  // Process result data if we have it
  const hasResult = toolInvocation.state === "result";
  const result = hasResult ? toolInvocation.result : null;
  const hasError = result && typeof result === "object" && "error" in result;
  
  // Parse matches
  let matches: MatchResult[] = [];
  if (hasResult && !hasError) {
    if (Array.isArray(result)) {
      matches = result;
    }
  }
  
  // Group matches by file
  const fileMatches: Record<string, MatchResult[]> = {};
  matches.forEach(match => {
    if (!fileMatches[match.file]) {
      fileMatches[match.file] = [];
    }
    fileMatches[match.file].push(match);
  });
  
  const totalFiles = Object.keys(fileMatches).length;
  const totalMatches = matches.length;

  return (
    <div className={cn("flex flex-col", props.className)}>
      <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
        <div className="flex items-center gap-2">
          <SearchIcon className="h-4 w-4 text-blue-500" />
          <div className="text-sm font-medium">{description}</div>
        </div>
        
        {/* When there's no result yet */}
        {!hasResult && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
            Searching...
          </div>
        )}
        
        {/* Show error state if there was an error */}
        {hasResult && hasError && (
          <div className="mt-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300 text-sm">
              Error: {result.error.message || JSON.stringify(result.error)}
            </p>
          </div>
        )}
        
        {/* Show search results if we have them */}
        {hasResult && !hasError && (
          <div className="mt-2">
            <div
              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex items-center gap-1.5">
                {expanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium">
                  {totalMatches > 0
                    ? `Found ${totalMatches} ${totalMatches === 1 ? 'match' : 'matches'} in ${totalFiles} ${totalFiles === 1 ? 'file' : 'files'}`
                    : "No matches found"}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {expanded ? "Click to collapse" : "Click to expand"}
              </span>
            </div>

            {expanded && totalMatches > 0 && (
              <div className="mt-2 max-h-96 overflow-y-auto">
                {matches.map((match, i) => (
                  <MatchItem key={i} match={match} searchPattern={args.pattern} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};