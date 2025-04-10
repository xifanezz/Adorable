import { NextRequest, NextResponse } from "next/server";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { mkdir, rmdir } from "node:fs/promises";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Cache to store previously fetched repository data
type RepoCache = {
  lastFetched: Date;
  data: any;
};

const repoCache: Record<string, RepoCache> = {};
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, path: repoPath = '' } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 }
      );
    }

    // Create a cache key based on repoUrl and path
    const cacheKey = `${repoUrl}:${repoPath}`;

    // Check if we have cached data and it's still valid
    const cached = repoCache[cacheKey];
    const now = new Date();
    if (
      cached &&
      now.getTime() - cached.lastFetched.getTime() < CACHE_EXPIRY_MS
    ) {
      return NextResponse.json(cached.data);
    }

    // Create a temporary directory
    const tmpDir = path.join(os.tmpdir(), `git-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });

    try {
      // Clone the repository
      await git.clone({
        fs,
        http,
        dir: tmpDir,
        url: repoUrl,

        // singleBranch: true,
        // depth: 1,
        noTags: true,
      });

      // Try to list files from git, with fallbacks for common errors
      let files = [];
      let currentBranch = null;
      let latestCommit = null;
      let treeEntries = [];

      try {
        // Try to get the current branch
        try {
          currentBranch = await git.currentBranch({ fs, dir: tmpDir });
        } catch (branchError) {
          console.warn("Failed to get current branch:", branchError);
          // Fall back to listing all refs to find the main branch
          const refs = await git.listRefs({ fs, dir: tmpDir });
          
          // Look for common branch names
          const commonBranches = ['main', 'master', 'develop', 'dev'];
          for (const branch of commonBranches) {
            if (refs.includes(`refs/heads/${branch}`)) {
              currentBranch = branch;
              break;
            }
          }
          
          // If still no branch, use the first ref if available
          if (!currentBranch && refs.length > 0) {
            const firstRef = refs[0].replace('refs/heads/', '');
            currentBranch = firstRef;
          }
        }

        // Try to get the latest commit
        try {
          const commits = await git.log({
            fs,
            dir: tmpDir,
            depth: 1,
            ref: currentBranch || "HEAD",
          });
          latestCommit = commits[0];
        } catch (logError) {
          console.warn("Failed to get commit log:", logError);
          
          // Try to get the HEAD SHA directly
          try {
            const sha = await git.resolveRef({ fs, dir: tmpDir, ref: 'HEAD' });
            const commit = await git.readCommit({ fs, dir: tmpDir, oid: sha });
            latestCommit = {
              oid: sha,
              commit: commit.object,
            };
          } catch (headError) {
            console.warn("Failed to resolve HEAD:", headError);
          }
        }

        // Read the tree from the latest commit if we have one
        if (latestCommit) {
          try {
            const { object: tree } = await git.readTree({
              fs,
              dir: tmpDir,
              oid: latestCommit.oid,
              filepath: repoPath,
            });
            
            // Convert the tree entries to our file format
            files = tree.entries.map((entry: any) => ({
              path: entry.path,
              type: entry.type, // 'blob' for files, 'tree' for directories
              size: entry.type === "blob" ? entry.oid.length : undefined,
            }));
          } catch (treeError) {
            console.warn("Failed to read tree:", treeError);
          }
        }
      } catch (gitError) {
        console.error("Git operations failed:", gitError);
      }

      // If git operations failed, fall back to filesystem
      if (files.length === 0) {
        try {
          console.log("Falling back to filesystem listing");
          const dirToRead = path.join(tmpDir, repoPath);
          const dirEntries = await fs.readdir(dirToRead, { withFileTypes: true });
          
          files = await Promise.all(
            dirEntries
              // Skip .git directory
              .filter(entry => entry.name !== '.git')
              .map(async (entry) => {
                const entryPath = path.join(dirToRead, entry.name);
                const stats = await fs.stat(entryPath);
                
                return {
                  path: entry.name,
                  type: entry.isDirectory() ? "tree" : "blob",
                  size: entry.isDirectory() ? undefined : stats.size,
                };
              })
          );
        } catch (fsError) {
          console.error("Filesystem fallback failed:", fsError);
          // If even the filesystem fallback fails, return empty array
          files = [];
        }
      }

      const responseData = {
        files,
        currentPath: repoPath,
        branch: currentBranch || "HEAD",
        commit: {
          oid: latestCommit?.oid,
          message: latestCommit?.commit?.message,
          date: latestCommit?.commit?.author?.timestamp || null,
        },
      };

      // Update the cache
      repoCache[cacheKey] = {
        lastFetched: now,
        data: responseData,
      };

      return NextResponse.json(responseData);
    } finally {
      // Clean up the temporary directory
      await rmdir(tmpDir, { recursive: true });
    }
  } catch (error) {
    console.error("Error handling Git repository:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
