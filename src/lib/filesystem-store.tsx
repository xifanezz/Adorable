"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import path from "path";
import git from "isomorphic-git";
import { fs } from "@/lib/fs";
import http from "isomorphic-git/http/web";
import { process_patch } from "@/agent/apply-patch";

import {
  createGitAccessToken,
  createGitIdentity,
  grantRepoAccess,
} from "@/actions/git-credentials";
import { CatSchema, GrepSchema, LsSchema } from "./tools";

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

export interface GitCommitResult {
  success: boolean;
  error?: string;
  commitHash?: string;
}

export interface GitPushResult {
  success: boolean;
  error?: string;
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

// Type for grep match results
export interface GrepMatch {
  file: string;
  line: number;
  content: string;
  column?: number;
  matches?: Array<{
    start: number;
    end: number;
  }>;
}

interface FilesystemState {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  currentPath: string;
  repoId: string | null;
  repoUrl: string | null;
  lastCommitInfo: {
    hash: string;
    message: string;
    timestamp: Date;
  } | null;
  lastPushInfo: {
    success: boolean;
    timestamp: Date;
    error?: string;
  } | null;

  readFile: (path: string) => Promise<string | null>;
  applyPatch: (patchText: string) => Promise<string>;
  commitChanges: (message: string) => Promise<GitCommitResult>;
  pushChanges: () => Promise<GitPushResult>;
  cat: (options: CatSchema) => Promise<FileContent | null>;
  ls: (options: LsSchema) => Promise<FileItem[]>;
  grep: (options: GrepSchema) => Promise<GrepMatch[]>;
  setRepoInfo: (repoId: string, repoUrl: string) => void;
  navigateToFolder: (folderPath: string) => void;
  navigateUp: () => void;
  getFileContent: (filePath: string) => Promise<FileContent | null>;
  fetchRepoFiles: () => Promise<void>;
}

export interface LocalGitCredentialsStore {
  gitIdentityId: string | null;
  gitToken: string | null;

  ensureGitIdentity: () => Promise<string>;
  ensureGitToken: () => Promise<string>;

  getCredentials: () => Promise<{
    username: string;
    password: string;
  }>;
}

export const useLocalGitCredentialsStore = create<LocalGitCredentialsStore>()(
  persist(
    (set, get) => ({
      gitIdentityId: null,
      gitToken: null,

      async ensureGitIdentity() {
        const state = get();

        const repoId = useFilesystemStore.getState().repoId;
        if (!repoId) {
          throw new Error("Repository ID not found");
        }

        if (state.gitIdentityId === null) {
          const gitIdentityId = await createGitIdentity();
          set({ gitIdentityId });

          await grantRepoAccess(repoId, gitIdentityId);

          return gitIdentityId;
        }

        await grantRepoAccess(repoId, state.gitIdentityId);

        return state.gitIdentityId;
      },

      async ensureGitToken() {
        const state = get();
        if (state.gitToken === null) {
          const identityId = await state.ensureGitIdentity();
          const token = await createGitAccessToken(identityId);
          set({ gitToken: token });
          return token;
        }
        return state.gitToken;
      },

      async getCredentials() {
        const state = get();

        const identityId = await state.ensureGitIdentity();
        const token = await state.ensureGitToken();

        return {
          username: identityId,
          password: token,
        };
      },
    }),
    {
      name: "adorable-git-credentials",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

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

  await git.addRemote({
    fs,
    dir: `/${repoId}`,

    remote: "origin",
    url: repoUrl,
    force: true,
  });
}

// Function to recursively read directory and files
async function processDirectory(
  dirPath: string,
  relativeDir: string = "",
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
      }),
  ).then((records) =>
    records.reduce((acc, record) => ({ ...acc, ...record }), {}),
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

// Get all modified files in the repository
async function getChangedFiles(repoDir: string): Promise<string[]> {
  const statusMatrix = await git.statusMatrix({ fs, dir: repoDir });

  // Filter for modified, added, or deleted files
  const modifiedFiles = statusMatrix
    .filter(([, head, workdir]) => head !== workdir)
    .map(([filepath]) => filepath);

  return modifiedFiles;
}

// Stage specific files for commit
async function stageFiles(repoDir: string, files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await git.add({ fs, dir: repoDir, filepath: file });
    } catch (error) {
      console.error(`Error staging file ${file}:`, error);
      throw error;
    }
  }
}

// ensureGitCredentials: async () => {
//   const state = get();
//   const { gitIdentityId } = state;
//
//   if (gitIdentityId === null) {
//     const { id } = await freestyle.createGitIdentity();
//     set({ gitIdentityId: id });
//   }
// },

export const useFilesystemStore = create<FilesystemState>((set, get) => ({
  files: [],
  loading: false,
  error: null,
  currentPath: "",
  repoId: null,
  repoUrl: null,
  lastCommitInfo: null,
  lastPushInfo: null,

  setRepoInfo: (repoId, repoUrl) => {
    set({ repoId, repoUrl });
    get().fetchRepoFiles();
  },

  ls: async (options: LsSchema) => {
    const state = get();
    const { repoId, repoUrl } = state;

    if (!repoId || !repoUrl) {
      throw new Error("Repository information not provided");
    }

    await ensureRepoCloned({ repoId, repoUrl });
    const repoDir = `/${repoId}`;

    const folderPath = options.path || "";
    const fullPath = path.join(repoDir, folderPath);

    try {
      const entries = await fs.promises.readdir(fullPath);
      const filesList: FileItem[] = await Promise.all(
        entries
          .filter((entry) => entry !== ".git")
          .map(async (entry) => {
            const entryPath = path.join(fullPath, entry);
            const stats = await fs.promises.stat(entryPath);
            const relativePath = path.join(folderPath, entry);

            return {
              path: relativePath,
              type: stats.type === "dir" ? "tree" : "blob",
              size: stats.type === "file" ? stats.size : undefined,
              contentType:
                stats.type === "file" ? getContentType(entry) : undefined,
            };
          }),
      );

      return filesList;
    } catch (err) {
      console.error(`Error listing directory ${folderPath}:`, err);
      throw new Error(
        `Failed to list directory: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  },
  cat: async (options: CatSchema): Promise<FileContent | null> => {
    const state = get();
    const { repoId, repoUrl } = state;

    if (!repoId || !repoUrl) {
      throw new Error("Repository information not provided");
    }

    await ensureRepoCloned({ repoId, repoUrl });
    const repoDir = `/${repoId}`;
    const filePath = options.path;

    try {
      // Get file stats to check if it exists and get size
      const stats = await fs.promises.stat(path.join(repoDir, filePath));
      if (stats.type !== "file") {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      // Get the file content
      const content = await fs.promises.readFile(
        path.join(repoDir, filePath),
        "utf8",
      );

      // Get the latest commit info for this file
      const commits = await git.log({
        fs,
        dir: repoDir,
        filepath: filePath,
        depth: 1,
      });

      const latestCommit = commits[0] || {
        oid: "unknown",
        commit: {
          message: "No commit history found",
          author: { timestamp: Date.now() / 1000 },
        },
      };

      return {
        content,
        encoding: "utf-8",
        contentType: getContentType(filePath),
        size: stats.size,
        path: filePath,
        commit: {
          oid: latestCommit.oid,
          message: latestCommit.commit.message,
          date: latestCommit.commit.author.timestamp * 1000,
        },
      };
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err);
      return null;
    }
  },

  readFile: async (filePath: string) => {
    const state = get();
    const { repoId } = state;

    if (!repoId) {
      throw new Error("Repository information not provided");
    }

    const repoDir = `/${repoId}`;
    const fullPath = path.join(repoDir, filePath);

    try {
      const content = await fs.promises.readFile(fullPath, "utf8");
      return content as string;
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err);
      return null;
    }
  },

  commitChanges: async (message: string): Promise<GitCommitResult> => {
    const state = get();
    const { repoId } = state;

    if (!repoId) {
      return {
        success: false,
        error: "Repository information not provided",
      };
    }

    const repoDir = `/${repoId}`;

    try {
      // Get all changed files
      const changedFiles = await getChangedFiles(repoDir);

      if (changedFiles.length === 0) {
        return {
          success: true,
          error: "No changes to commit",
        };
      }

      // Stage all changed files
      await stageFiles(repoDir, changedFiles);

      // Create commit
      const commitResult = await git.commit({
        fs,
        dir: repoDir,
        message,
        author: {
          name: "Adorable AI",
          email: "ai@adorable.app",
        },
      });

      // Update last commit info
      set({
        lastCommitInfo: {
          hash: commitResult,
          message,
          timestamp: new Date(),
        },
      });

      return {
        success: true,
        commitHash: commitResult,
      };
    } catch (error) {
      console.error("Error committing changes:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  pushChanges: async (): Promise<GitPushResult> => {
    const state = get();
    const { repoId, repoUrl } = state;

    if (!repoId || !repoUrl) {
      const result = {
        success: false,
        error: "Repository information not provided",
      };

      set({
        lastPushInfo: {
          ...result,
          timestamp: new Date(),
        },
      });

      return result;
    }

    const repoDir = `/${repoId}`;

    try {
      // Get current branch
      const currentBranch = await git.currentBranch({
        fs,
        dir: repoDir,
      });

      if (!currentBranch) {
        const result = {
          success: false,
          error: "Could not determine current branch",
        };

        set({
          lastPushInfo: {
            ...result,
            timestamp: new Date(),
          },
        });

        return result;
      }

      // Push to remote
      await git
        .push({
          fs,
          http,
          dir: repoDir,

          onAuth: async (_url, auth) => {
            const credentials = await useLocalGitCredentialsStore
              .getState()
              .getCredentials();

            auth.username = credentials.username;
            auth.password = credentials.password;

            return auth;
          },
        })
        .catch((_e) => undefined);

      const result = { success: true };

      set({
        lastPushInfo: {
          ...result,
          timestamp: new Date(),
        },
      });

      return result;
    } catch (error) {
      console.error("Error pushing changes:", error);

      const result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      set({
        lastPushInfo: {
          ...result,
          timestamp: new Date(),
        },
      });

      return result;
    }
  },

  applyPatch: async (patchText: string) => {
    const state = get();
    const { repoId } = state;

    if (!repoId) {
      throw new Error("Repository information not provided");
    }

    const repoDir = `/${repoId}`;
    const timestamp = new Date().toISOString();

    try {
      // First, apply the patch
      const result = await process_patch(
        patchText,
        // Read function
        async (p) => {
          try {
            const fullPath = path.join(repoDir, p);
            const content = await fs.promises.readFile(fullPath, "utf8");
            return content.toString();
          } catch (err) {
            console.error(`Error reading file for patch: ${p}`, err);
            throw err;
          }
        },
        // Write function
        async (p, c) => {
          try {
            const fullPath = path.join(repoDir, p);
            const dirPath = path.dirname(fullPath);

            // Ensure directory exists
            await fs.promises
              .mkdir(dirPath, { recursive: true })
              .catch((e) => undefined);

            // Write file
            await fs.promises.writeFile(fullPath, c, "utf8");

            // Refresh file list after writing
            setTimeout(() => get().fetchRepoFiles(), 100);
          } catch (err) {
            console.error(`Error writing file for patch: ${p}`, err);
            throw err;
          }
        },
        // Delete function
        async (p) => {
          try {
            const fullPath = path.join(repoDir, p);
            await fs.promises.unlink(fullPath);

            // Refresh file list after deletion
            setTimeout(() => get().fetchRepoFiles(), 100);
          } catch (err) {
            console.error(`Error deleting file for patch: ${p}`, err);
            throw err;
          }
        },
      );

      // After patch is applied successfully, commit the changes
      const patchLines = patchText.split("\n");
      let commitMessage = "Applied changes via patch";

      // Try to generate a better commit message based on the patch content
      if (patchLines.length > 1) {
        const addedFiles = patchLines
          .filter((line) => line.startsWith("*** Add File:"))
          .map((line) => line.replace("*** Add File:", "").trim());

        const updatedFiles = patchLines
          .filter((line) => line.startsWith("*** Update File:"))
          .map((line) => line.replace("*** Update File:", "").trim());

        const deletedFiles = patchLines
          .filter((line) => line.startsWith("*** Delete File:"))
          .map((line) => line.replace("*** Delete File:", "").trim());

        const parts = [];

        if (addedFiles.length > 0) {
          parts.push(
            `Added ${addedFiles.length} file${addedFiles.length > 1 ? "s" : ""}`,
          );
        }

        if (updatedFiles.length > 0) {
          parts.push(
            `Updated ${updatedFiles.length} file${
              updatedFiles.length > 1 ? "s" : ""
            }`,
          );
        }

        if (deletedFiles.length > 0) {
          parts.push(
            `Deleted ${deletedFiles.length} file${
              deletedFiles.length > 1 ? "s" : ""
            }`,
          );
        }

        if (parts.length > 0) {
          commitMessage = parts.join(", ");
        }
      }

      // Add timestamp to commit message
      commitMessage += ` [${timestamp}]`;

      // Create commit
      const commitResult = await get().commitChanges(commitMessage);

      if (!commitResult.success) {
        console.warn("Failed to commit changes:", commitResult.error);
      } else if (commitResult.commitHash) {
        console.log("Created commit:", commitResult.commitHash);

        // Automatically push after every commit
        console.log("Pushing changes to remote...");
        const pushResult = await get().pushChanges();
        if (pushResult.success) {
          console.log("Successfully pushed changes to remote");
        } else {
          console.warn("Failed to push changes:", pushResult.error);
        }
      }

      return result;
    } catch (err) {
      console.error("Error applying patch:", err);
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
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
      Object.entries(allFiles).forEach(([filePath, fileInfo]) => {
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
            size: "error" in fileInfo ? 0 : fileInfo.size,
            content: "error" in fileInfo ? "" : (fileInfo.content as string),
            contentType: getContentType(remainingPath),
            encoding: "utf-8",
          });
        }
      });

      set({ files: filesList });
    } catch (err) {
      console.error("Error fetching repository files:", err);
      set({
        error: err instanceof Error ? err.message : "Unknown error occurred",
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
            const content = await fs.promises.readFile(
              `${repoDir}/${fullPath}`,
              "utf8",
            );

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
  },

  grep: async (options: GrepSchema) => {
    const state = get();
    const { repoId, repoUrl } = state;

    if (!repoId || !repoUrl) {
      throw new Error("Repository information not provided");
    }

    await ensureRepoCloned({ repoId, repoUrl });
    const repoDir = `/${repoId}`;

    const searchPath = options.path
      ? path.join(repoDir, options.path)
      : repoDir;
    const pattern = options.pattern;
    const recursive = options.recursive !== false; // Default to true
    const caseSensitive = options.caseSensitive || false;
    const filePattern = options.filePattern || "*";
    const maxResults = options.maxResults || Number.MAX_SAFE_INTEGER;

    try {
      // Get all files in the directory (recursively if specified)
      const getFilesRecursively = async (
        dir: string,
        basePath: string = "",
      ): Promise<string[]> => {
        const entries = await fs.promises.readdir(dir);
        const files = await Promise.all(
          entries
            .filter((entry) => entry !== ".git")
            .map(async (entry) => {
              const fullPath = path.join(dir, entry);
              const relativePath = path.join(basePath, entry);
              const stats = await fs.promises.stat(fullPath);

              if (stats.type === "dir") {
                return recursive
                  ? getFilesRecursively(fullPath, relativePath)
                  : [];
              } else {
                // Check if the file matches the file pattern
                if (filePattern === "*" || matchesPattern(entry, filePattern)) {
                  return [relativePath];
                }
                return [];
              }
            }),
        );

        return files.flat();
      };

      // Helper to check if filename matches pattern like "*.js" or "*.{ts,tsx}"
      const matchesPattern = (filename: string, pattern: string): boolean => {
        if (pattern === "*") return true;

        if (pattern.includes("{") && pattern.includes("}")) {
          // Handle patterns like "*.{js,ts,tsx}"
          const prefix = pattern.split("{")[0].replace("*", ".*");
          const exts = pattern.split("{")[1].split("}")[0].split(",");
          const regex = new RegExp(
            `${prefix}(${exts.join("|")})$`,
            caseSensitive ? "" : "i",
          );
          return regex.test(filename);
        } else {
          // Handle simple patterns like "*.js"
          const regex = new RegExp(
            pattern.replace(/\./g, "\\.").replace(/\*/g, ".*"),
            caseSensitive ? "" : "i",
          );
          return regex.test(filename);
        }
      };

      // Get all matching files
      const basePathForDisplay = options.path || "";
      const allFiles = await getFilesRecursively(searchPath);

      // Search through files for pattern
      const results: GrepMatch[] = [];
      const searchRegExp = new RegExp(pattern, caseSensitive ? "g" : "gi");

      for (const filePath of allFiles) {
        if (results.length >= maxResults) break;

        try {
          const fullPath = path.join(repoDir, filePath);
          const content = await fs.promises.readFile(fullPath, "utf8");
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;

            const line = lines[i];
            const matches: { start: number; end: number }[] = [];
            let match;

            // Create a new RegExp instance for each search to avoid state issues
            const lineRegExp = new RegExp(pattern, caseSensitive ? "g" : "gi");

            // Find all matches in the line
            while ((match = lineRegExp.exec(line)) !== null) {
              matches.push({
                start: match.index,
                end: match.index + match[0].length,
              });
            }

            if (matches.length > 0 || searchRegExp.test(line)) {
              results.push({
                file: path.join(basePathForDisplay, filePath),
                line: i + 1, // 1-based line numbers
                content: line,
                matches: matches.length > 0 ? matches : undefined,
              });
            }
          }
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
          // Continue with other files
        }
      }

      return results;
    } catch (err) {
      console.error(`Error searching in ${searchPath}:`, err);
      throw new Error(
        `Failed to search for pattern: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  },
}));
