'use client';

import { useState, useEffect } from 'react';
import { Copy, Image, Folder, Grid, List, Loader2, Plus, Trash2, Home } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'sonner';
import { FileMetadata, uploadFile, uploadFolder, deleteFile, deleteFolder, listFiles } from '@/services/cloudflare-r2';

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

interface Folder {
  name: string;
  path: string;
  children: Folder[];
}

// Initial folder structure
const initialFolders: Folder[] = [
  {
    name: 'Root',
    path: '/',
    children: []
  },
];

// Component for displaying a folder in list view
const FolderItemList = ({ folder, onNavigate, handleDeleteFolder }: {
  folder: Folder;
  onNavigate: (path: string) => void;
  handleDeleteFolder: (folder: Folder) => void;
}) => {
  return (
    <div 
      className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
    >
      <div 
        className="flex items-center gap-3 flex-1"
        onClick={() => onNavigate(folder.path)}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <Folder className="text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium">{folder.name}</p>
        </div>
      </div>
      <div className="flex items-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteFolder(folder);
          }}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors text-red-500"
          title="Delete folder"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const FileItemList = ({ file, handleFileClick, handleCopyUrl, handleDeleteFile }: {
  file: FileMetadata;
  handleFileClick: (file: FileMetadata) => void;
  handleCopyUrl: (file: FileMetadata) => void;
  handleDeleteFile: (file: FileMetadata) => void;
}) => {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg transition-colors">
      <div 
        className="flex items-start gap-3 cursor-pointer flex-1"
        onClick={() => handleFileClick(file)}
      >
        <div className="w-12 h-8 flex items-start justify-center mt-2">
          {file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
            <img src={file.publicUrl} alt={file.name} className="w-full h-full object-cover rounded" />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
              {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium m-0 p-0">{file.name}</p>
          <p className="text-xs text-gray-500 py-0">{file.publicUrl}</p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)} • {file.uploadDate}
          </p>
        </div>
      </div>
      <div className="flex items-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleCopyUrl(file);
          }}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          title="Copy URL"
        >
          <Copy className="w-4 h-4 text-gray-600" />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteFile(file);
          }}
          className="p-2 rounded-full hover:bg-gray-200 transition-colors text-red-500"
          title="Delete file"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Component for displaying a folder in grid view
const FolderItemGrid = ({ folder, onNavigate, handleDeleteFolder }: {
  folder: Folder;
  onNavigate: (path: string) => void;
  handleDeleteFolder: (folder: Folder) => void;
}) => {
  return (
    <div 
      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white cursor-pointer"
    >
      <div 
        className="flex items-center justify-center bg-yellow-50 h-32"
        onClick={() => onNavigate(folder.path)}
      >
        <Folder className="w-16 h-16 text-yellow-500" />
      </div>
      <div className="p-3">
        <div className="flex justify-between items-start">
          <p className="font-medium truncate text-sm">{folder.name}</p>
          <div className="flex">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder);
              }}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors text-red-500"
              title="Delete folder"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Folder
        </p>
      </div>
    </div>
  );
};

const FileItemGrid = ({ file, handleFileClick, handleCopyUrl, handleDeleteFile }: {
  file: FileMetadata;
  handleFileClick: (file: FileMetadata) => void;
  handleCopyUrl: (file: FileMetadata) => void;
  handleDeleteFile: (file: FileMetadata) => void;
}) => {
  return (
    <div 
      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
      onClick={() => handleFileClick(file)}
    >
      <div className="flex items-center justify-center bg-gray-50 h-32">
        {file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
          <img src={file.publicUrl} alt={file.name} className="max-w-full max-h-32 object-contain" />
        ) : (
          <div className="w-20 h-20 bg-gray-200 rounded flex flex-col items-center justify-center p-2">
            <div className="text-3xl text-gray-400 mb-1">.{file.name.split('.').pop() || ''}</div>
            <div className="text-xs text-gray-500 truncate max-w-full">{file.name}</div>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex justify-between items-start">
          <p className="font-medium truncate text-sm">{file.name}</p>
          <div className="flex">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleCopyUrl(file);
              }}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              title="Copy URL"
            >
              <Copy className="w-3 h-3 text-gray-600" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFile(file);
              }}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors text-red-500 ml-1"
              title="Delete file"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
  );
};

const FolderItem = ({ folder, isSelected, onSelect }: {
  folder: Folder;
  isSelected: boolean;
  onSelect: (path: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="pl-0">
      <div 
        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
          isSelected ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
        }`}
        onClick={() => onSelect(folder.path)}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-5 h-5 flex items-center justify-center"
        >
          {folder.children.length > 0 ? (
            <span className="text-gray-500">
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="w-5 h-5"></span>
          )}
        </button>
        <Folder className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-yellow-500'}`} />
        <span className="truncate">{folder.name}</span>
      </div>
      {isExpanded && folder.children.length > 0 && (
        <div className="ml-4">
          {folder.children.map(child => (
            <FolderItem 
              key={child.path}
              folder={child}
              isSelected={child.path === isSelected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Function to build a folder structure from file paths
const buildFolderStructure = (files: FileMetadata[]): Folder[] => {
  console.log('Building folder structure from files:', files);
  
  const root: Folder = { name: 'Root', path: '/', children: [] };
  const folderMap = new Map<string, Folder>();
  folderMap.set('/', root);

  // First pass: extract all potential folder paths from all files
  const allPaths = new Set<string>();
  
  // Add root folder
  allPaths.add('/');
  
  // Process all files to extract folder paths
  files.forEach(file => {
    const path = file.fileKey;
    const parts = path.split('/');
    
    // Build path hierarchy
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      if (!parts[i]) continue; // Skip empty parts
      
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      allPaths.add(`/${currentPath}`);
    }
  });
  
  // Sort paths by depth to ensure parent folders are created first
  const sortedPaths = Array.from(allPaths).sort((a, b) => {
    return a.split('/').length - b.split('/').length;
  });
  
  console.log('Sorted folder paths:', sortedPaths);
  
  // Second pass: create folder objects
  sortedPaths.forEach(path => {
    if (path === '/') return; // Skip root, already created
    
    // Get parent path and folder name
    const pathParts = path.split('/').filter(Boolean);
    const folderName = pathParts[pathParts.length - 1];
    
    // Construct parent path
    const parentPathParts = pathParts.slice(0, -1);
    const parentPath = parentPathParts.length === 0 ? '/' : `/${parentPathParts.join('/')}`;
    
    // Create folder if it doesn't exist
    if (!folderMap.has(path)) {
      const newFolder: Folder = {
        name: folderName,
        path: path,
        children: []
      };
      folderMap.set(path, newFolder);
      
      // Add to parent's children
      const parentFolder = folderMap.get(parentPath);
      if (parentFolder) {
        // Check if this folder is already in the parent's children
        const existingChild = parentFolder.children.find(child => child.path === path);
        if (!existingChild) {
          parentFolder.children.push(newFolder);
        }
      } else {
        console.warn(`Parent folder ${parentPath} not found for ${path}`);
      }
    }
  });
  
  console.log('Final folder structure:', root);

  return [root];
};

export default function FileExplorer() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('/');
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState<boolean>(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load files from R2 when the component mounts or folder changes or refresh is triggered
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        // Always get a fresh listing of ALL files to build the complete structure
        // This ensures we catch any new folders or files
        const allFiles = await listFiles('/');
        console.log('All files loaded:', allFiles);
        
        // Store all files in state
        setFiles(allFiles);
        
        // Build and set folder structure from all files
        const folderStructure = buildFolderStructure(allFiles);
        console.log('Built folder structure:', folderStructure);
        setFolders(folderStructure);
      } catch (error) {
        console.error('Error fetching files:', error);
        toast.error('Failed to load files');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [refreshTrigger]);

  const handleFileClick = (file: FileMetadata) => {
    window.open(file.publicUrl, '_blank');
  };

  const handleCopyUrl = (file: FileMetadata) => {
    navigator.clipboard.writeText(file.publicUrl);
    toast.success('Public URL copied to clipboard!');
  };

  const handleDeleteFile = async (file: FileMetadata) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteFile(file.fileKey);
      setFiles(prev => prev.filter(f => f.fileKey !== file.fileKey));
      toast.success(`${file.name} deleted successfully!`);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    // Don't allow deleting the root folder
    if (folder.path === '/') {
      toast.error("Cannot delete the root folder");
      return;
    }

    if (!confirm(`Are you sure you want to delete the folder "${folder.name}" and ALL its contents? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteFolder(folder.path);
      
      // Update the folder structure to remove this folder
      setFolders(prevFolders => {
        const updateFolders = (folders: Folder[]): Folder[] => {
          return folders.filter(f => f.path !== folder.path).map(f => ({
            ...f,
            children: updateFolders(f.children)
          }));
        };
        return updateFolders(prevFolders);
      });
      
      // If we're currently viewing the folder that was deleted, navigate to parent
      if (selectedFolder === folder.path) {
        // Extract parent path
        const pathParts = folder.path.split('/').filter(Boolean);
        const parentPathParts = pathParts.slice(0, -1);
        const parentPath = parentPathParts.length === 0 ? '/' : `/${parentPathParts.join('/')}`;
        setSelectedFolder(parentPath);
      }
      
      toast.success(`Folder "${folder.name}" deleted successfully!`);
      
      // Refresh files to update the view
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim() === '') {
      toast.error('Folder name cannot be empty');
      return;
    }
    
    // Sanitize folder name (remove invalid characters)
    const sanitizedFolderName = newFolderName.trim().replace(/[\/\\:*?"<>|]/g, '_');
    
    // Create a proper folder path
    const newFolderPath = selectedFolder === '/' 
      ? `/${sanitizedFolderName}`
      : `${selectedFolder}/${sanitizedFolderName}`;
    
    // Create a folder marker file in R2
    const markerBlob = new Blob([''], { type: 'text/plain' });
    const markerFile = new File([markerBlob], '.keep', { type: 'text/plain' });
    
    setLoading(true);
    try {
      // Create the folder path in R2 by uploading a placeholder file
      await uploadFile(markerFile, newFolderPath);
      
      // Create the folder object for the UI
      const newFolder: Folder = {
        name: sanitizedFolderName,
        path: newFolderPath,
        children: [],
      };

      // Update the folder structure in state
      setFolders(prevFolders => {
        const updateFolders = (folders: Folder[]): Folder[] => {
          return folders.map(folder => {
            if (folder.path === selectedFolder) {
              return {
                ...folder,
                children: [...folder.children, newFolder],
              };
            }
            if (folder.children.length > 0) {
              return {
                ...folder,
                children: updateFolders(folder.children),
              };
            }
            return folder;
          });
        };

        return updateFolders(prevFolders);
      });

      setNewFolderName('');
      setShowCreateFolderDialog(false);
      toast.success(`Folder "${sanitizedFolderName}" created`);
      
      // Refresh files to show the new folder
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles: File[], fileRejections: any[], event: any) => {
    console.log("Files dropped:", acceptedFiles);
    
    // Check if files came from a directory selection (by looking at webkitRelativePath)
    const hasDirectoryStructure = acceptedFiles.length > 0 && 
      acceptedFiles[0].webkitRelativePath && 
      acceptedFiles[0].webkitRelativePath.includes('/');
    
    // Handle folder uploads (when files have webkitRelativePath)
    if (hasDirectoryStructure) {
      setLoading(true);
      let hasUploadedItems = false;
      
      try {
        console.log("Processing folder upload from webkitRelativePath");
        
        // Group files by directory to maintain structure
        const directoryMap: { [key: string]: File[] } = {};
        
        // First pass: identify all directories and filter out files exceeding size limit
        acceptedFiles.forEach(file => {
          if (file.webkitRelativePath && file.size <= FILE_SIZE_LIMIT) {
            // Extract the directory path from webkitRelativePath
            const pathParts = file.webkitRelativePath.split('/');
            const folderName = pathParts[0]; // Root folder name
            
            if (!directoryMap[folderName]) {
              directoryMap[folderName] = [];
            }
            
            directoryMap[folderName].push(file);
          }
        });
        
        // Process each root directory
        for (const [folderName, files] of Object.entries(directoryMap)) {
          console.log(`Processing directory: ${folderName} with ${files.length} files`);
          
          // Create the main folder path
          const mainFolderPath = selectedFolder === '/' 
            ? `/${folderName}`
            : `${selectedFolder}/${folderName}`;
            
          // Create a .keep file to ensure the folder exists
          const markerBlob = new Blob([''], { type: 'text/plain' });
          const markerFile = new File([markerBlob], '.keep', { type: 'text/plain' });
          
          try {
            await uploadFile(markerFile, mainFolderPath);
            console.log(`Created main folder: ${mainFolderPath}`);
            
            // Process all valid files in this directory
            const validFiles = files.filter(file => file.size <= FILE_SIZE_LIMIT);
            const uploadPromises: Promise<FileMetadata>[] = [];
            
            validFiles.forEach(file => {
              if (file.webkitRelativePath) {
                // Extract path excluding the filename
                const pathParts = file.webkitRelativePath.split('/');
                const subPathParts = pathParts.slice(0, -1);
                
                if (subPathParts.length === 1) {
                  // Files directly in the main folder
                  uploadPromises.push(uploadFile(file, mainFolderPath));
                } else {
                  // Files in subdirectories
                  const subPath = `${mainFolderPath}/${subPathParts.slice(1).join('/')}`;
                  
                  // Create subdirectory first
                  const subMarkerFile = new File([new Blob([''], { type: 'text/plain' })], '.keep', { type: 'text/plain' });
                  uploadPromises.push(
                    uploadFile(subMarkerFile, subPath)
                      .then(() => uploadFile(file, subPath))
                  );
                }
              }
            });
            
            // Upload all files
            const uploadResults = await Promise.all(uploadPromises);
            
            if (uploadResults.length > 0) {
              hasUploadedItems = true;
              toast.success(`Folder '${folderName}' with ${uploadResults.length} items uploaded successfully!`);
            }
          } catch (error) {
            console.error(`Error processing folder ${folderName}:`, error);
            toast.error(`Failed to upload folder '${folderName}'`);
          }
        }
        
        // Final success or error message
        if (hasUploadedItems) {
          setShowUploadDialog(false);
          setRefreshTrigger(prev => prev + 1);
        } else {
          toast.error('No valid files found in the selected folders');
        }
      } catch (error) {
        console.error('Error during folder upload:', error);
        toast.error('Upload failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    // Check if items were dropped from the file system with dataTransfer
    else if (event.dataTransfer && event.dataTransfer.items) {
      const items = event.dataTransfer.items;
      
      // Process each dropped item
      let hasUploadedItems = false;
      setLoading(true);
      
      try {
        // First check if there are directories
        let foundDirectory = false;
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          // Handle directories
          if (item.webkitGetAsEntry && item.webkitGetAsEntry() && item.webkitGetAsEntry().isDirectory) {
            foundDirectory = true;
            const entry = item.webkitGetAsEntry() as FileSystemDirectoryEntry;
            console.log(`Processing folder: ${entry.name}`);
            
            try {
              const uploadedFiles = await uploadFolder(entry, selectedFolder);
              if (uploadedFiles.length > 0) {
                hasUploadedItems = true;
                toast.success(`Folder '${entry.name}' with ${uploadedFiles.length} items uploaded successfully!`);
              }
            } catch (folderError) {
              console.error(`Error uploading folder ${entry.name}:`, folderError);
              toast.error(`Failed to upload folder '${entry.name}'`);
            }
          }
        }
        
        // Process individual files if no directories were found
        if (!foundDirectory) {
          const validFiles = acceptedFiles.filter(file => file.size <= FILE_SIZE_LIMIT);
          
          if (validFiles.length > 0) {
            const uploadPromises = validFiles.map(file => uploadFile(file, selectedFolder));
            const uploadedFiles = await Promise.all(uploadPromises);
            
            if (uploadedFiles.length > 0) {
              hasUploadedItems = true;
              toast.success(`${uploadedFiles.length} ${uploadedFiles.length === 1 ? 'file' : 'files'} uploaded successfully!`);
            }
          }
          
          if (acceptedFiles.length > 0 && validFiles.length !== acceptedFiles.length) {
            toast.warning(`${acceptedFiles.length - validFiles.length} files exceeding 10MB were skipped`);
          }
        }
        
        // Final success or error message
        if (hasUploadedItems) {
          setShowUploadDialog(false);
          setRefreshTrigger(prev => prev + 1);
        } else if (acceptedFiles.length === 0 && !hasUploadedItems) {
          toast.error('No valid files or folders were found to upload');
        }
      } catch (error) {
        console.error('Error during upload:', error);
        toast.error('Upload failed. Please try again.');
      } finally {
        setLoading(false);
      }
    } 
    // Regular file upload (no folders)
    else if (acceptedFiles.length > 0) {
      // Filter for valid files (size limit)
      const validFiles = acceptedFiles.filter(file => file.size <= FILE_SIZE_LIMIT);
      
      if (validFiles.length === 0) {
        toast.error(`All files exceed the maximum size limit of 10MB`);
        return;
      }

      if (validFiles.length !== acceptedFiles.length) {
        toast.warning(`${acceptedFiles.length - validFiles.length} files exceeding 10MB were skipped`);
      }
      
      setLoading(true);
      try {
        const uploadPromises = validFiles.map(file => uploadFile(file, selectedFolder));
        const uploadedFiles = await Promise.all(uploadPromises);
        
        setFiles(prev => [...prev, ...uploadedFiles]);
        toast.success(`${uploadedFiles.length} ${uploadedFiles.length === 1 ? 'file' : 'files'} uploaded successfully!`);
        setShowUploadDialog(false);
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error uploading files:', error);
        toast.error('Upload failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Create two separate dropzone instances
  const { getRootProps: getFileRootProps, getInputProps: getFileInputProps, isDragActive: isFileDragActive } = useDropzone({ 
    onDrop,
    accept: {},  // Accept all file types
    noClick: false,
    noKeyboard: false,
    noDrag: false,
    multiple: true,
    useFsAccessApi: false, // Disable File System Access API
    preventDropOnDocument: true,
    maxSize: FILE_SIZE_LIMIT
  });
  
  // For folder selection
  const { getRootProps: getFolderRootProps, getInputProps: getFolderInputProps, isDragActive: isFolderDragActive } = useDropzone({ 
    onDrop,
    accept: {},  // Accept all file types
    noClick: false,
    noKeyboard: false,
    noDrag: false,
    multiple: true,
    useFsAccessApi: false, // Disable File System Access API
    preventDropOnDocument: true,
    maxSize: FILE_SIZE_LIMIT
  });

  // Extract subfolders for current path from folder structure
  const getSubFolders = (currentPath: string): Folder[] => {
    const findFolder = (folders: Folder[], path: string): Folder | undefined => {
      for (const folder of folders) {
        if (folder.path === path) {
          return folder;
        }
        const found = findFolder(folder.children, path);
        if (found) return found;
      }
      return undefined;
    };
    
    const currentFolder = findFolder(folders, currentPath);
    return currentFolder ? currentFolder.children : [];
  };
  
  // Get subfolders for the current directory
  const subFolders = getSubFolders(selectedFolder);
  console.log('Current subfolders:', selectedFolder, subFolders);
  
  // Filter files to show only those in the current folder
  const filteredFiles = files.filter(file => {
    // Skip folder placeholders from the files listing - we handle these separately with subFolders
    if (file.isFolder) {
      return false;
    }
    
    // When viewing root (/) - show only top-level files
    if (selectedFolder === '/') {
      // A file is at the root level if it has no slashes in its key
      return !file.fileKey.includes('/');
    }
    
    // For any other folder - show files in that exact folder only
    // Remove leading slash for consistency
    const normalizedFolder = selectedFolder.startsWith('/') ? selectedFolder.slice(1) : selectedFolder;
    
    // Get the normalized file path (directory part)
    const filePathParts = file.fileKey.split('/');
    const filePathWithoutName = filePathParts.slice(0, -1).join('/');
    
    // A file belongs in this folder if its path (without filename) exactly matches the normalized folder path
    return filePathWithoutName === normalizedFolder;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-800">👉 📁 File Explorer</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[0.3fr_0.7fr] gap-0">
            {/* Sidebar */}
            <div className="border-r pr-4 py-4 bg-gray-50">
              <div className="overflow-y-auto max-h-[calc(100vh-180px)]">
                {folders.map(folder => (
                  <FolderItem 
                    key={folder.path}
                    folder={folder}
                    isSelected={folder.path === selectedFolder}
                    onSelect={setSelectedFolder}
                  />
                ))}
              </div>
            </div>

            {/* Main content */}
            <div className="p-6">
              {/* Breadcrumb navigation */}
              <nav className="mb-4">
                <ol className="flex flex-wrap items-center text-sm text-gray-600">
                  <li className="flex items-center">
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFolder('/');
                      }}
                      className="hover:text-blue-600 flex items-center"
                      title="Home"
                    >
                      <Home className="w-4 h-4" />
                    </a>
                  </li>
                  {selectedFolder !== '/' && selectedFolder.split('/').filter(Boolean).map((segment, index, array) => {
                    // Build the path up to this segment
                    const path = '/' + array.slice(0, index + 1).join('/');
                    return (
                      <li key={path} className="flex items-center">
                        <span className="mx-2">/</span>
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedFolder(path);
                          }}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {segment}
                        </a>
                      </li>
                    );
                  })}
                </ol>
                {/* Full URL with copy button */}
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md text-sm text-gray-700 mt-2">
                  <span className="truncate">
                    https://files.careerweb.org{selectedFolder}
                  </span>
                  <button
                    className="p-1 hover:bg-gray-200 rounded-full"
                    onClick={() => {
                      // Simple clean path with no query parameters
                      navigator.clipboard.writeText(`https://files.careerweb.org${selectedFolder}`);
                      toast.success('URL copied to clipboard!');
                    }}
                    title="Copy URL"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </nav>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                  {selectedFolder === '/' ? 'All Files' : 'Files'}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title={viewMode === 'list' ? 'Grid view' : 'List view'}
                  >
                    {viewMode === 'list' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setShowCreateFolderDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Folder className="w-4 h-4" />
                    New Folder
                  </button>
                  <button
                    onClick={() => setShowUploadDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              </div>
              
              {loading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              )}

              {showUploadDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-medium mb-4">Upload Files</h3>
                    {/* Files upload section */}
                    <div className="mb-4">
                      <h4 className="text-base font-medium mb-2">Upload individual files</h4>
                      <div 
                        {...getFileRootProps()} 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <input {...getFileInputProps()} />
                        {isFileDragActive ? (
                          <p className="text-blue-500">Drop the files here...</p>
                        ) : (
                          <div>
                            <p className="text-sm">Drag & drop files here, or click to select</p>
                            <p className="text-xs text-gray-500 mt-1">Supports: All file types up to 10MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Folder upload section */}
                    <div className="mb-2">
                      <h4 className="text-base font-medium mb-2">Upload entire folder</h4>
                      <div 
                        {...getFolderRootProps()} 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                      >
                        <input {...getFolderInputProps()} directory="" webkitdirectory="" />
                        {isFolderDragActive ? (
                          <p className="text-blue-500">Drop the folder here...</p>
                        ) : (
                          <div>
                            <p className="text-sm">Drag & drop folder here, or click to select</p>
                            <p className="text-xs text-gray-500 mt-1">All files in folder will be uploaded</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {loading && (
                      <div className="mt-4 flex justify-center">
                        <Loader2 className="animate-spin text-blue-500" />
                      </div>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                      <button 
                        onClick={() => setShowUploadDialog(false)}
                        className="px-4 py-2 border rounded-md hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showCreateFolderDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-medium mb-4">Create New Folder</h3>
                    <input
                      type="text"
                      placeholder="Folder name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="mt-4 flex justify-end gap-2">
                      <button 
                        onClick={() => setShowCreateFolderDialog(false)}
                        className="px-4 py-2 border rounded-md hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleCreateFolder}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!loading && filteredFiles.length === 0 && subFolders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Image className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No items found</h3>
                  <p className="text-gray-500 mt-1">
                    {selectedFolder === '/' ? 
                      "Upload images or create folders to get started" : 
                      `This folder is empty. Upload images or create folders in ${selectedFolder}`}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setShowCreateFolderDialog(true)}
                      className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <Folder className="w-4 h-4" />
                      New Folder
                    </button>
                    <button
                      onClick={() => setShowUploadDialog(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Upload Files
                    </button>
                  </div>
                </div>
              ) : !loading && viewMode === 'list' ? (
                <div className="grid grid-cols-1 gap-0">
                  {/* Show folders first */}
                  {subFolders.map(folder => (
                    <FolderItemList 
                      key={folder.path}
                      folder={folder}
                      onNavigate={setSelectedFolder}
                      handleDeleteFolder={handleDeleteFolder}
                    />
                  ))}
                  
                  {/* Then show files */}
                  {filteredFiles.map(file => (
                    <FileItemList 
                      key={file.fileKey}
                      file={file}
                      handleFileClick={handleFileClick}
                      handleCopyUrl={handleCopyUrl}
                      handleDeleteFile={handleDeleteFile}
                    />
                  ))}
                </div>
              ) : !loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Show folders first in grid view */}
                  {subFolders.map(folder => (
                    <FolderItemGrid
                      key={folder.path}
                      folder={folder}
                      onNavigate={setSelectedFolder}
                      handleDeleteFolder={handleDeleteFolder}
                    />
                  ))}
                  
                  {/* Then show files */}
                  {filteredFiles.map(file => (
                    <FileItemGrid 
                      key={file.fileKey}
                      file={file}
                      handleFileClick={handleFileClick}
                      handleCopyUrl={handleCopyUrl}
                      handleDeleteFile={handleDeleteFile}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}