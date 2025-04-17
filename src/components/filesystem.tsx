"use client";

import { useState, useEffect } from "react";
import path from "path";
import git from "isomorphic-git";
import { fs } from "@/lib/fs";
import http from "isomorphic-git/http/web";

interface FileItem {
  path: string;
  type: "tree" | "blob";
  size?: number;
  content?: string;
  contentType?: string;
  encoding?: string;
}

interface FileContent {
  content: string;
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
    ref: "HEAD",
  });
}

// Function to recursively read directory and files
async function processDirectory(
  dirPath: string,
  relativeDir: string = "",
): Promise<Record<string, any>> {
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
          const filesRecord: Record<string, any> = {};

          // Process files
          try {
            const fileInfo: any = {
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

export default function FileSystem({ repoUrl }: { repoUrl: string }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const repoId = useCurrentRepo();

  const fetchRepoFiles = async () => {
    setLoading(true);
    setError(null);

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
      const pathSegmentsCount = currentPath.split("/").filter(Boolean).length;

      // Process each file path
      Object.entries(allFiles).forEach(
        ([filePath, fileInfo]: [string, any]) => {
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
              size: fileInfo.size,
              content: fileInfo.content,
              contentType: getContentType(remainingPath),
              encoding: "utf-8",
            });
          }
        },
      );

      setFiles(filesList);
    } catch (err) {
      console.error("Error fetching repository files:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine content type
  const getContentType = (filePath: string): string => {
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

  useEffect(() => {
    fetchRepoFiles();
  }, [currentPath]);

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
    setSelectedFile(null);
    setFileContent(null);
  };

  const navigateUp = () => {
    const pathParts = currentPath.split("/");
    pathParts.pop();
    setCurrentPath(pathParts.join("/"));
    setSelectedFile(null);
    setFileContent(null);
  };

  const viewFile = (filePath: string) => {
    setLoadingContent(true);
    setError(null);
    setSelectedFile(filePath);

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
        setFileContent({
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
        });
      } else {
        // Set some basic info if content isn't available
        setFileContent({
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
        });
      }
    } catch (err) {
      console.error("Error loading file content:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoadingContent(false);
    }
  };

  const formatSize = (size?: number): string => {
    if (size === undefined) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileList = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50 dark:bg-red-900/20">
          <p className="font-medium">Error loading repository</p>
          <p className="text-sm mt-1">{error}</p>
          <div className="mt-3">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchRepoFiles();
              }}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Note: The repository may be empty or may have issues with its HEAD
            reference.
          </p>
        </div>
      );
    }

    return (
      <div className="prose-container">
        <div className="flex items-center mb-4">
          <button
            onClick={navigateUp}
            disabled={!currentPath}
            className={`px-2 py-1 rounded text-sm ${
              !currentPath
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            }`}
          >
            ⬅️ Back
          </button>
          <div className="ml-2 text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            /{currentPath}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Size
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {files.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    This folder is empty
                  </td>
                </tr>
              ) : (
                files.map((file, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {file.type === "tree" ? (
                        <button
                          onClick={() =>
                            navigateToFolder(
                              currentPath
                                ? `${currentPath}/${file.path}`
                                : file.path,
                            )
                          }
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                        >
                          📁 {file.path}
                        </button>
                      ) : (
                        <button
                          onClick={() => viewFile(file.path)}
                          className="text-gray-800 dark:text-gray-200 hover:underline flex items-center"
                        >
                          📄 {file.path}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {file.type === "tree" ? "Directory" : "File"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatSize(file.size)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render file content
  const renderFileContent = () => {
    if (!selectedFile || !fileContent) return null;

    if (loadingContent) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // Check if it's an image
    const isImage = fileContent.contentType.startsWith("image/");
    const isMarkdown = fileContent.contentType === "text/markdown";
    const isText =
      fileContent.contentType.startsWith("text/") ||
      fileContent.contentType.includes("javascript") ||
      fileContent.contentType.includes("typescript") ||
      fileContent.contentType.includes("json");

    return (
      <div className="mt-6 border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b flex justify-between items-center">
          <div className="font-medium text-sm">{selectedFile}</div>
          <div className="text-xs text-gray-500">
            {formatSize(fileContent.size)}
          </div>
        </div>

        <div className="p-4">
          {isImage ? (
            <div className="flex justify-center">
              <img
                src={`data:${fileContent.contentType};base64,${fileContent.content}`}
                alt={selectedFile}
                className="max-w-full h-auto rounded"
              />
            </div>
          ) : isMarkdown ? (
            <div className="prose-container">
              <Markdown>{fileContent.content}</Markdown>
            </div>
          ) : isText ? (
            <pre className="text-sm overflow-x-auto p-2 bg-gray-50 dark:bg-gray-950 rounded max-h-96">
              <code>{fileContent.content}</code>
            </pre>
          ) : (
            <div className="text-center p-4 text-gray-500">
              <p>Binary file cannot be displayed</p>
              <p className="text-xs mt-1">{fileContent.contentType}</p>
            </div>
          )}
        </div>

        {fileContent.commit && (
          <div className="border-t px-4 py-2 text-xs text-gray-500">
            <div>Commit: {fileContent.commit.oid.substring(0, 7)}</div>
            <div className="truncate">{fileContent.commit.message}</div>
            <div>
              {new Date(fileContent.commit.date * 1000).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="overflow-y-auto flex-1">
        {renderFileList()}
        {selectedFile && renderFileContent()}
      </div>
    </div>
  );
}

// Import needed for Markdown rendering
import { Markdown } from "./ui/markdown";
import { useCurrentRepo } from "./app-wrapper";
