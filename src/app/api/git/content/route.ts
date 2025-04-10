import { NextRequest, NextResponse } from 'next/server';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { mkdir, rmdir } from 'node:fs/promises';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Cache to store previously fetched file content
type ContentCache = {
  lastFetched: Date;
  data: any;
};

const contentCache: Record<string, ContentCache> = {};
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, filePath } = body;
    
    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Create a cache key based on repoUrl and filePath
    const cacheKey = `${repoUrl}:${filePath}`;
    
    // Check if we have cached data and it's still valid
    const cached = contentCache[cacheKey];
    const now = new Date();
    if (cached && (now.getTime() - cached.lastFetched.getTime()) < CACHE_EXPIRY_MS) {
      return NextResponse.json(cached.data);
    }

    // Create a temporary directory
    const tmpDir = path.join(os.tmpdir(), `git-content-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });

    try {
      // Clone the repository
      await git.clone({
        fs,
        http,
        dir: tmpDir,
        url: repoUrl,
        singleBranch: true,
        depth: 1,
        noTags: true,
      });

      let currentBranch = null;
      let latestCommit = null;
      let blob = null;

      try {
        // Try to get the current branch
        try {
          currentBranch = await git.currentBranch({ fs, dir: tmpDir });
        } catch (branchError) {
          console.warn("Failed to get current branch:", branchError);
          // Fall back to listing all refs
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
        
        if (!latestCommit) {
          return NextResponse.json({ error: 'No commits found in the repository' }, { status: 404 });
        }
        
        // Read the file content from git
        try {
          const result = await git.readBlob({
            fs,
            dir: tmpDir,
            oid: latestCommit.oid,
            filepath: filePath,
          });
          blob = result.blob;
        } catch (blobError) {
          console.warn("Failed to read blob from git:", blobError);
        }
      } catch (gitError) {
        console.error("Git operations failed:", gitError);
      }
      
      // If git blob read failed, try reading directly from filesystem
      if (!blob) {
        try {
          console.log("Falling back to filesystem for file content");
          const filePath2 = path.join(tmpDir, filePath);
          blob = await fs.readFile(filePath2);
        } catch (fsError) {
          console.error("Filesystem fallback failed:", fsError);
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
      }
      
      // Determine if the file is binary or text
      const isBinary = /[\x00-\x08\x0E-\x1F]/.test(
        String.fromCharCode.apply(null, new Uint8Array(blob.slice(0, 1000)))
      );
      
      let content, encoding;
      
      if (isBinary) {
        // For binary files, encode as base64
        content = Buffer.from(blob).toString('base64');
        encoding = 'base64';
      } else {
        // For text files, convert to UTF-8 string
        content = new TextDecoder('utf-8').decode(blob);
        encoding = 'utf-8';
      }
      
      // Get file extension to determine content type
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'text/plain';
      
      // Map extensions to content types
      const contentTypeMap: Record<string, string> = {
        '.js': 'application/javascript',
        '.jsx': 'application/javascript',
        '.ts': 'application/typescript',
        '.tsx': 'application/typescript',
        '.html': 'text/html',
        '.css': 'text/css',
        '.json': 'application/json',
        '.md': 'text/markdown',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
      };
      
      contentType = contentTypeMap[ext] || contentType;
      
      const responseData = {
        content,
        encoding,
        contentType,
        size: blob.byteLength,
        path: filePath,
        commit: {
          oid: latestCommit.oid,
          message: latestCommit.commit.message,
          date: latestCommit.commit.author.timestamp,
        },
      };
      
      // Update the cache
      contentCache[cacheKey] = {
        lastFetched: now,
        data: responseData,
      };
      
      return NextResponse.json(responseData);
    } finally {
      // Clean up the temporary directory
      await rmdir(tmpDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error handling Git file content:', error);
    
    // Handle specific git errors more gracefully
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}