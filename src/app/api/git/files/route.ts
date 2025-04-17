import { NextRequest, NextResponse } from "next/server";
import { mkdir, access, readdir, stat } from "node:fs/promises";
import { promises as fs } from "fs";
import path from "path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

// Cache to store previously fetched repository data
type RepoCache = {
  lastFetched: Date;
  data: any;
};

// File content cache at the module level
const repoCache: Record<string, RepoCache> = {};
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Get repo directory name from URL
function getRepoDirName(repoUrl: string): string {
  // Extract repo name from URL - last part before .git or just the last part
  const repoName = repoUrl.split("/").pop()?.replace(".git", "") || "repo";
  // Add timestamp to make it unique
  return `${repoName}-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 },
      );
    }

    // Create a cache key based on repoUrl
    const cacheKey = repoUrl;

    // Check if we have cached data and it's still valid
    const cached = repoCache[cacheKey];
    const now = new Date();
    if (
      cached &&
      now.getTime() - cached.lastFetched.getTime() < CACHE_EXPIRY_MS
    ) {
      console.log("Returning cached data for repo");
      return NextResponse.json(cached.data);
    }

    // Ensure /git directory exists at project root
    const baseDir = path.join(process.cwd(), "git");
    try {
      await access(baseDir);
    } catch {
      await mkdir(baseDir, { recursive: true });
      console.log(`Created git directory at ${baseDir}`);
    }

    // Create unique directory for this repo
    const repoDir = path.join(baseDir, getRepoDirName(repoUrl));
    await mkdir(repoDir, { recursive: true });

    console.log(`Cloning repo ${repoUrl} to ${repoDir}`);

    try {
      await git.clone({
        fs,
        http,
        url: repoUrl,
        dir: repoDir,
      });
      console.log("Repository cloned successfully");

      // Now build a record of files and their contents
      const filesRecord: Record<string, any> = {};

      // Get git info about the repo
      const currentBranch = await git.currentBranch({
        fs,
        dir: repoDir,
        fullname: true,
      });
      if (!currentBranch) {
        throw new Error("Detected detached HEAD");
      }

      const latestCommit = await git
        .log({
          fs,
          dir: repoDir,
          ref: currentBranch,
          depth: 1,
        })
        .then((logs) => logs.at(0));

      const repoInfo = {
        branch: currentBranch,
        commit: latestCommit
          ? {
              hash: latestCommit?.oid,
              message: latestCommit?.commit.message,
              author: latestCommit?.commit.author.name,
              timestamp: latestCommit?.commit.author.timestamp,
            }
          : undefined,
      };

      // Function to recursively read directory and files
      async function processDirectory(
        dirPath: string,
        relativeDir: string = "",
      ) {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          // Skip .git directory
          if (entry.name === ".git") continue;

          const fullPath = path.join(dirPath, entry.name);
          const relativePath = relativeDir
            ? path.join(relativeDir, entry.name)
            : entry.name;

          if (entry.isDirectory()) {
            // Recursively process subdirectories
            await processDirectory(fullPath, relativePath);
          } else {
            // Process files
            try {
              const fileStats = await stat(fullPath);

              // Basic file info
              const fileInfo: any = {
                size: fileStats.size,
                type: "file",
                path: relativePath,
              };

              // For small text files, include content directly
              if (fileStats.size < 500000) {
                // 500KB limit
                try {
                  const content = await fs.readFile(fullPath, "utf8");
                  fileInfo.content = content;
                } catch {
                  // If UTF-8 fails, it might be binary
                  fileInfo.isBinary = true;
                }
              } else {
                fileInfo.isLarge = true;
              }

              // Save file info to record
              filesRecord[relativePath] = fileInfo;
            } catch (fileError) {
              console.warn(`Error processing file ${relativePath}:`, fileError);
              filesRecord[relativePath] = { error: "Failed to process file" };
            }
          }
        }
      }

      // Process all files in the repository
      await processDirectory(repoDir);
      console.log(`Processed ${Object.keys(filesRecord).length} files`);

      // Prepare the response
      const responseData = {
        files: filesRecord,
        repo: repoInfo,
        clonedAt: new Date().toISOString(),
      };

      // Cache the response
      repoCache[cacheKey] = {
        lastFetched: now,
        data: responseData,
      };

      return NextResponse.json(responseData);
    } catch (error) {
      console.error("Error in git operations:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error handling request:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
