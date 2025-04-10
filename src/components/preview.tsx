"use client";

import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import { Markdown } from './ui/markdown';

interface FileItem {
  path: string;
  type: 'tree' | 'blob';
  size?: number;
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

export default function Preview() {
  const { messages } = useChat({
    api: '/api/chat',
  });
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Get the last assistant message
  const lastAssistantMessage = [...messages]
    .reverse()
    .find(message => message.role === 'assistant');

  const fetchRepoFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/git/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: 'https://92062196-4509-4157-9111-cada6bdd8837:5U5MHmSiqFjUoNVP.K7Y5z62ZcTyhVZDV@git.freestyle.it.com/d93a8af8-663c-4413-b127-39b32bec2466',
          path: currentPath,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching files: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching repository files:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchRepoFiles();
  }, [currentPath]);

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
    setSelectedFile(null);
    setFileContent(null);
  };
  
  const viewFile = async (filePath: string) => {
    setLoadingContent(true);
    setError(null);
    setSelectedFile(filePath);
    
    try {
      const fullPath = currentPath ? `${currentPath}/${filePath}` : filePath;
      
      const response = await fetch('/api/git/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: 'https://92062196-4509-4157-9111-cada6bdd8837:5U5MHmSiqFjUoNVP.K7Y5z62ZcTyhVZDV@git.freestyle.it.com/d93a8af8-663c-4413-b127-39b32bec2466',
          filePath: fullPath,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching file content: ${response.status}`);
      }
      
      const data = await response.json();
      setFileContent(data);
    } catch (err) {
      console.error('Error fetching file content:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoadingContent(false);
    }
  };

  const formatSize = (size?: number): string => {
    if (size === undefined) return '';
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
            Note: The repository may be empty or may have issues with its HEAD reference.
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
            className={`px-2 py-1 rounded text-sm ${!currentPath ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
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
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Size
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    This folder is empty
                  </td>
                </tr>
              ) : (
                files.map((file, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm font-medium">
                      {file.type === 'tree' ? (
                        <button 
                          onClick={() => navigateToFolder(currentPath ? `${currentPath}/${file.path}` : file.path)} 
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
                      {file.type === 'tree' ? 'Directory' : 'File'}
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
    const isImage = fileContent.contentType.startsWith('image/');
    const isMarkdown = fileContent.contentType === 'text/markdown';
    const isText = fileContent.contentType.startsWith('text/') || 
                  fileContent.contentType.includes('javascript') || 
                  fileContent.contentType.includes('typescript') || 
                  fileContent.contentType.includes('json');
    
    return (
      <div className="mt-6 border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b flex justify-between items-center">
          <div className="font-medium text-sm">
            {selectedFile}
          </div>
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
            <div>{new Date(fileContent.commit.date * 1000).toLocaleString()}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full pt-4 overflow-y-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Repository Files</h2>
      {renderFileList()}
      
      {selectedFile && renderFileContent()}
      
      {!selectedFile && lastAssistantMessage && (
        <div className="prose-container mt-8 border-t dark:border-gray-800 pt-4">
          <h3 className="text-lg font-medium mb-3">Last Assistant Message</h3>
          {lastAssistantMessage.content ? (
            <Markdown className="prose prose-sm dark:prose-invert max-w-none">
              {lastAssistantMessage.content}
            </Markdown>
          ) : (
            <div className="text-gray-500">No content in the last message</div>
          )}
        </div>
      )}
    </div>
  );
}