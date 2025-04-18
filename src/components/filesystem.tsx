"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilesystemStore, FileContent } from "@/lib/filesystem-store";
import { useCurrentRepo } from "./app-wrapper";
import { ArrowLeftIcon, FileIcon, FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "./ui/markdown";

export default function FileSystem({ repoUrl }: { repoUrl: string }) {
  const repoId = useCurrentRepo();
  const {
    files,
    loading,
    error,
    currentPath,
    setRepoInfo,
    fetchRepoFiles,
    navigateToFolder,
    navigateUp,
    getFileContent,
  } = useFilesystemStore();

  // Local state for file selection
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const readme = useMemo(() => {
    if (loading || loadingContent) {
      return null;
    }
    return (
      files.find(
        (f) =>
          f.type === "blob" && (f.path === "README.md" || f.path === "README")
      )?.path ?? null
    );
  }, [files, loading, loadingContent]);

  useEffect(() => {
    if (readme !== null && selectedFile === null) {
      viewFile(readme);
    } else if (files.find((f) => f.path === selectedFile) === undefined) {
      setSelectedFile(null);
      setFileContent(null);
    }
  }, [readme, selectedFile, files]);

  useEffect(() => {
    setRepoInfo(repoId, repoUrl);
  }, [repoId, repoUrl, setRepoInfo]);

  const viewFile = async (filePath: string) => {
    setLoadingContent(true);
    setSelectedFile(filePath);
    
    try {
      const content = await getFileContent(filePath);
      setFileContent(content);
    } catch (err) {
      console.error("Error in viewFile:", err);
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
                useFilesystemStore.setState({ error: null });
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
        <div className="flex gap-2 items-center mb-4">
          {currentPath ? (
            <button
              onClick={navigateUp}
              disabled={!currentPath}
              className={cn(
                `px-2 py-1 rounded text-sm flex gap-1 justify-center items-center`,
                currentPath
                  ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  : "text-gray-400 cursor-not-allowed"
              )}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : null}
          <div className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
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
                                : file.path
                            )
                          }
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                        >
                          <div className="flex items-center gap-2">
                            <FolderIcon className="h-4 w-4" />{" "}
                            <span>{file.path}</span>
                          </div>
                        </button>
                      ) : (
                        <button
                          onClick={() => viewFile(file.path)}
                          className="text-gray-800 dark:text-gray-200 hover:underline flex items-center"
                        >
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4" />{" "}
                            <span>{file.path}</span>
                          </div>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {file.type === "tree" ? "Directory" : "File"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {file.type === "tree" ? (
                        <div className="h-px w-2 bg-border" />
                      ) : (
                        formatSize(file.size)
                      )}
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
                src={`data:${fileContent.contentType};base64,${typeof fileContent.content === 'string' ? fileContent.content : ''}`}
                alt={selectedFile}
                className="max-w-full h-auto rounded"
              />
            </div>
          ) : isMarkdown ? (
            <div className="prose-container">
              <Markdown>{typeof fileContent.content === 'string' ? fileContent.content : ''}</Markdown>
            </div>
          ) : isText ? (
            <pre className="text-sm overflow-x-auto p-2 bg-gray-50 dark:bg-gray-950 rounded max-h-96">
              <code>{typeof fileContent.content === 'string' ? fileContent.content : ''}</code>
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
              {new Date(fileContent.commit.date).toLocaleString()}
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
        {selectedFile ? renderFileContent() : null}
      </div>
    </div>
  );
}