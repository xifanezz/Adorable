"use client";

import { create } from 'zustand';
import path from "path";
import git from "isomorphic-git";
import { fs } from "@/lib/fs";
import http from "isomorphic-git/http/web";

export interface FileItem {
  path: string;
  type: "tree" | "blob";
  size?: number;
  content?: string;
  contentType?: string;
  encoding?: string;
}

export interface FileContent {
  content: string | Uint8Array;
  encoding: string;
  contentType: string;
  size: number;
  path: string;
  commit: {
    oid: string;
    message: string;
    date: number;
  };
}

type FileInfo =
  | {
      size?: number;
      type?: string;
      content?: string | Uint8Array;
      path?: string;
      isBinary?: boolean;
      isLarge?: boolean;
    }
  | {
      error: string;
    };

interface FilesystemState {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  currentPath: string;
  repoId: string | null;
  repoUrl: string | null;
  
  setRepoInfo: (repoId: string, repoUrl: string) => void;
  fetchRepoFiles: () => Promise<void>;
  navigateToFolder: (folderPath: string) => void;
  navigateUp: () => void;
  getFileContent: (filePath: string) => Promise<FileContent | null>;
}

async function ensureRepoCloned({
  repoId,
  repoUrl,
}: {
  repoId: string;
  repoUrl: string;
}) {
  const dir = `/${repoId}`;
  const isRepoCloned = await fs.promises
    .stat(dir)
    .then(() => true)
    .catch(() => false);

  if (!isRepoCloned) {
    await cloneRepo({ repoId, repoUrl });
  }
}

async function cloneRepo({
  repoId,
  repoUrl,
}: {
  repoId: string;
  repoUrl: string;
}) {
  await git.clone({
    url: repoUrl,
    fs,
    http,
    dir: `/${repoId}`,
  });
}

// Function to recursively read directory and files
async function processDirectory(
  dirPath: string,
  relativeDir: string = ""
): Promise<Record<string, FileInfo>> {
  const entries = await fs.promises.readdir(dirPath);

  const files = await Promise.all(
    entries
      .filter((entry) => entry !== ".git")
      .map(async (entry) => {
        const fullPath = path.join(dirPath, entry);
        const relativePath = relativeDir
          ? path.join(relativeDir, entry)
          : entry;

        const entryInfo = await fs.promises.stat(fullPath);

        if (entryInfo.type == "dir") {
          // Recursively process subdirectories
          return await processDirectory(fullPath, relativePath);
        } else {
          const filesRecord: Record<string, FileInfo> = {};

          // Process files
          try {
            const fileInfo: Partial<FileInfo> = {
              size: entryInfo.size,
              type: "file",
              path: relativePath,
            };

            // For small text files, include content directly
            if (entryInfo.size < 500000) {
              // 500KB limit
              try {
                const content = await fs.promises.readFile(fullPath, "utf8");
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

          return filesRecord;
        }
      })
  ).then((records) =>
    records.reduce((acc, record) => ({ ...acc, ...record }), {})
  );

  return files;
}

async function getRepoInfo(props: { repoId: string; repoUrl: string }) {
  await ensureRepoCloned(props);
  const repoDir = `/${props.repoId}`;

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

  // Process all files in the repository
  const filesRecord = await processDirectory(repoDir);
  console.log(`Processed ${Object.keys(filesRecord).length} files`);

  return {
    files: filesRecord,
    repo: repoInfo,
    clonedAt: new Date().toISOString(),
  };
}

// Helper function to determine content type
export const getContentType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypeMap: Record<string, string> = {
    ".js": "application/javascript",
    ".jsx": "application/javascript",
    ".ts": "application/typescript",
    ".tsx": "application/typescript",
    ".html": "text/html",
    ".css": "text/css",
    ".json": "application/json",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".yaml": "application/yaml",
    ".yml": "application/yaml",
  };

  return contentTypeMap[ext] || "text/plain";
};

export const useFilesystemStore = create<FilesystemState>((set, get) => ({
  files: [],
  loading: false,
  error: null,
  currentPath: "",
  repoId: null,
  repoUrl: null,

  setRepoInfo: (repoId, repoUrl) => {
    set({ repoId, repoUrl });
    get().fetchRepoFiles();
  },

  fetchRepoFiles: async () => {
    const state = get();
    const { repoId, repoUrl, currentPath } = state;
    
    if (!repoId || !repoUrl) {
      set({ error: "Repository information not provided" });
      return;
    }
    
    set({ loading: true, error: null });

    try {
      console.log(`Repository URL: ${repoUrl}`);
      const data = await getRepoInfo({
        repoId,
        repoUrl,
      });

      // Convert the files record to an array for the current path
      const allFiles = data.files || {};
      const filesList: FileItem[] = [];

      // Get files and directories at the current path
      const pathPrefix = currentPath ? currentPath + "/" : "";

      // Process each file path
      Object.entries(allFiles).forEach(
        ([filePath, fileInfo]) => {
          // Skip files not in the current directory
          if (!currentPath && filePath.includes("/")) {
            // Root directory - only show top-level files and directories
            const topLevelName = filePath.split("/")[0];
            if (!filesList.find((f) => f.path === topLevelName)) {
              filesList.push({
                path: topLevelName,
                type: "tree",
                size: 0,
              });
            }
            return;
          } else if (currentPath && !filePath.startsWith(pathPrefix)) {
            // Not in the current directory
            return;
          }

          // For directory listings, we only want direct children
          const remainingPath = filePath.substring(pathPrefix.length);
          if (remainingPath.includes("/")) {
            // This is a nested file, only add the directory
            const dirName = remainingPath.split("/")[0];
            if (!filesList.find((f) => f.path === dirName)) {
              filesList.push({
                path: dirName,
                type: "tree",
                size: 0,
              });
            }
          } else if (remainingPath) {
            // This is a file in the current directory
            filesList.push({
              path: remainingPath,
              type: "blob",
              size: 'error' in fileInfo ? 0 : fileInfo.size,
              content: 'error' in fileInfo ? '' : (fileInfo.content as string),
              contentType: getContentType(remainingPath),
              encoding: "utf-8",
            });
          }
        }
      );

      set({ files: filesList });
    } catch (err) {
      console.error("Error fetching repository files:", err);
      set({ 
        error: err instanceof Error ? err.message : "Unknown error occurred" 
      });
    } finally {
      set({ loading: false });
    }
  },

  navigateToFolder: (folderPath) => {
    set({ currentPath: folderPath });
    get().fetchRepoFiles();
  },

  navigateUp: () => {
    const { currentPath } = get();
    const pathParts = currentPath.split("/");
    pathParts.pop();
    const newPath = pathParts.join("/");
    
    set({ currentPath: newPath });
    get().fetchRepoFiles();
  },

  getFileContent: async (filePath) => {
    const { currentPath, files, repoId } = get();
    
    try {
      const fullPath = currentPath ? `${currentPath}/${filePath}` : filePath;

      // Find the file in our existing files data
      const selectedFileData = files.find((f) => {
        const fileFullPath = currentPath ? `${currentPath}/${f.path}` : f.path;
        return fileFullPath === fullPath || f.path === fullPath;
      });

      if (!selectedFileData) {
        throw new Error(`File not found: ${fullPath}`);
      }

      // If the file has content, use it directly
      if (selectedFileData.content) {
        return {
          content: selectedFileData.content,
          encoding: selectedFileData.encoding || "utf-8",
          contentType: selectedFileData.contentType || "text/plain",
          size: selectedFileData.size || 0,
          path: fullPath,
          commit: {
            oid: "latest",
            message: "Current version",
            date: Date.now(),
          },
        };
      } else {
        // If content wasn't loaded in the directory listing, try to load it directly
        if (repoId) {
          try {
            const repoDir = `/${repoId}`;
            const content = await fs.promises.readFile(`${repoDir}/${fullPath}`, "utf8");
            
            return {
              content,
              encoding: "utf-8",
              contentType: getContentType(fullPath),
              size: content.length,
              path: fullPath,
              commit: {
                oid: "latest",
                message: "Current version",
                date: Date.now(),
              },
            };
          } catch (err) {
            console.error("Error loading file content directly:", err);
          }
        }
        
        // Set some basic info if content isn't available
        return {
          content: "File content not available (possibly too large)",
          encoding: "utf-8",
          contentType: selectedFileData.contentType || "text/plain",
          size: selectedFileData.size || 0,
          path: fullPath,
          commit: {
            oid: "latest",
            message: "Current version",
            date: Date.now(),
          },
        };
      }
    } catch (err) {
      console.error("Error loading file content:", err);
      return null;
    }
  }
}));