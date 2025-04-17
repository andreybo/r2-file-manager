import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Represents file metadata for image files.
 */
export interface FileMetadata {
  /**
   * The name of the file.
   */
  name: string;
  /**
   * The URL of the file (presigned for direct access).
   */
  url: string;
  /**
   * The public URL of the file.
   */
  publicUrl: string;
  /**
   * The size of the file in bytes.
   */
  size: number;
  /**
   * The date the file was uploaded.
   */
  uploadDate: string;
  /**
   * The folder path where the file is stored.
   */
  folderPath: string;
  /**
   * The full path/key of the file in R2.
   */
  fileKey: string;
  /**
   * The resolution of the image file (e.g., "1920x1080").
   */
  resolution?: string;
  /**
   * Indicates if this is a folder (used for virtual folder entries).
   */
  isFolder?: boolean;
}

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.NEXT_PUBLIC_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || '';
// Accept all file types
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

/**
 * Checks if a file is valid for upload.
 */
export function isValidFile(filename: string, fileSize: number = 0): boolean {
  // Special case for .keep files - these are folder markers
  if (filename === '.keep') {
    return false;
  }
  
  // Check file size if provided
  if (fileSize > 0 && fileSize > FILE_SIZE_LIMIT) {
    return false;
  }
  
  return true;
}

/**
 * Asynchronously lists all files in a specified folder in R2.
 *
 * @param folderPath The folder path to list files from
 * @returns A promise that resolves to an array of FileMetadata objects
 */
export async function listFiles(folderPath: string = '/'): Promise<FileMetadata[]> {
  try {
    // For root path, we want to get ALL files to build the complete folder structure
    const isRootRequest = folderPath === '/';
    
    // Format the folder path for R2 (remove leading slash if needed)
    const prefix = isRootRequest ? '' : folderPath.startsWith('/') ? folderPath.slice(1) : folderPath;
    
    let allObjects: FileMetadata[] = [];
    
    if (isRootRequest) {
      // For root requests, we need to recursively list all folders
      // First, list the top level items
      console.log('Listing all objects recursively from root');
      
      // First request - get top level structure
      const folderCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Delimiter: '/',
      });
      
      const folderResponse = await s3Client.send(folderCommand);
      console.log('Root listing response:', folderResponse);
      
      // Get all files from recursive listing
      const recursiveCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        // No delimiter means get everything
      });
      
      const recursiveResponse = await s3Client.send(recursiveCommand);
      console.log('Recursive listing response:', recursiveResponse);
      
      // Process objects from recursive listing
      if (recursiveResponse.Contents) {
        // First, collect all potential folder paths from file keys
        const folderPaths = new Set<string>();
        
        recursiveResponse.Contents.forEach(item => {
          const fileKey = item.Key || '';
          const parts = fileKey.split('/');
          
          // Add all parent folder paths
          let path = '';
          for (let i = 0; i < parts.length - 1; i++) {
            if (!parts[i]) continue;
            path = path ? `${path}/${parts[i]}` : parts[i];
            folderPaths.add(`/${path}/`);
          }
        });
        
        console.log('Detected folder paths:', Array.from(folderPaths));
        
        // Add folder objects for all detected paths
        const folderObjects = Array.from(folderPaths).map(folderPath => {
          const pathParts = folderPath.split('/').filter(Boolean);
          const folderName = pathParts[pathParts.length - 1] || '';
          
          return {
            name: folderName,
            url: '',
            publicUrl: `https://files.careerweb.org${folderPath}`,
            size: 0,
            uploadDate: new Date().toISOString().split('T')[0],
            folderPath: '/' + pathParts.slice(0, -1).join('/'),
            fileKey: folderPath,
            isFolder: true,
          } as FileMetadata;
        });
        
        // Process actual files
        const filePromises = recursiveResponse.Contents.map(async item => {
          const fileKey = item.Key || '';
          const name = fileKey.split('/').pop() || fileKey;
          
          // Skip .keep files and other folder markers
          if (name === '.keep') {
            return null; 
          }
          
          // Create a presigned URL
          const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileKey,
          });
          
          const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          const publicUrl = `https://files.careerweb.org/${fileKey}`;
          
          return {
            name,
            url,
            publicUrl,
            size: item.Size || 0,
            uploadDate: item.LastModified?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            folderPath: '/' + (fileKey.includes('/') ? fileKey.substring(0, fileKey.lastIndexOf('/')) : ''),
            fileKey,
          };
        });
        
        const processedFiles = await Promise.all(filePromises);
        // Combine folder objects with file objects
        allObjects = [...folderObjects, ...processedFiles.filter(Boolean)] as FileMetadata[];
      }
      
      // Add folder placeholders from CommonPrefixes
      if (folderResponse.CommonPrefixes) {
        const folderPlaceholders = folderResponse.CommonPrefixes.map(prefix => {
          const folderKey = prefix.Prefix || '';
          if (folderKey.endsWith('/')) {
            const folderName = folderKey.split('/').filter(Boolean).pop() || '';
            
            return {
              name: folderName,
              url: '',
              publicUrl: `https://files.careerweb.org/${folderKey}`,
              size: 0,
              uploadDate: new Date().toISOString().split('T')[0],
              folderPath: '/',
              fileKey: folderKey,
              isFolder: true,
            } as FileMetadata;
          }
          return null;
        }).filter(Boolean) as FileMetadata[];
        
        allObjects = [...folderPlaceholders, ...allObjects];
      }
      
      return allObjects;
    }
    
    // For non-root requests, just list the current directory
    const folderCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      Delimiter: '/',
    });
    
    const folderResponse = await s3Client.send(folderCommand);
    console.log('R2 Folder Response:', folderResponse);
    
    // Create a virtual placeholder for each folder prefix we find
    const folderPlaceholders: FileMetadata[] = [];
    
    if (folderResponse.CommonPrefixes && folderResponse.CommonPrefixes.length > 0) {
      console.log('Found folder prefixes:', folderResponse.CommonPrefixes);
      
      // Extract each folder path and create a placeholder entry
      folderResponse.CommonPrefixes.forEach(prefix => {
        const folderKey = prefix.Prefix || '';
        // Get last path component as folder name (remove trailing slash if present)
        const folderPathClean = folderKey.endsWith('/') ? folderKey.slice(0, -1) : folderKey;
        const folderName = folderPathClean.split('/').filter(Boolean).pop() || '';
        
        // Construct proper folder path - always end with trailing slash for S3 semantics
        const folderKeyWithSlash = folderKey.endsWith('/') ? folderKey : `${folderKey}/`;
        
        // Get parent folder path
        const pathParts = folderPathClean.split('/').filter(Boolean);
        const parentPathParts = pathParts.slice(0, -1);
        const parentPath = '/' + (parentPathParts.length > 0 ? parentPathParts.join('/') : '');
        
        console.log('Adding folder placeholder:', { 
          folderKey: folderKeyWithSlash, 
          folderName,
          folderPath: `/${folderPathClean}`, 
          parentPath
        });
        
        // We'll add a special field to identify this as a folder
        folderPlaceholders.push({
          name: folderName,
          url: '',
          publicUrl: `https://files.careerweb.org/${folderKeyWithSlash}`,
          size: 0,
          uploadDate: new Date().toISOString().split('T')[0],
          folderPath: parentPath,
          fileKey: folderKeyWithSlash,
          // Add a special field to identify this as a folder
          isFolder: true,
        } as FileMetadata & { isFolder: boolean });
      });
    }
    
    // If no contents, just return the folder placeholders
    if (!folderResponse.Contents) {
      console.log('No contents found in bucket, returning folder placeholders');
      return folderPlaceholders;
    }
    
    // Process regular files
    const files = await Promise.all(folderResponse.Contents.map(async (item) => {
      const fileKey = item.Key || '';
      const name = fileKey.split('/').pop() || fileKey;
      
      console.log('Processing file:', { fileKey, name });
      
      // Skip .keep folder marker files
      if (name === '.keep') {
        console.log('Found folder marker:', fileKey);
        // Don't return a placeholder for .keep files since we handle folders via CommonPrefixes
        return null;
      }
      
      // Create a presigned URL that's valid for 1 hour
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      });
      
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const publicUrl = `https://files.careerweb.org/${fileKey}`;
      
      return {
        name,
        url,
        publicUrl,
        size: item.Size || 0,
        uploadDate: item.LastModified?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        folderPath: '/' + (fileKey.includes('/') ? fileKey.substring(0, fileKey.lastIndexOf('/')) : ''),
        fileKey,
        // Resolution is determined when the image is loaded and viewed
      };
    }));
    
    // Combine folder placeholders with regular files, removing nulls
    return [...folderPlaceholders, ...files.filter(Boolean)] as FileMetadata[];
  } catch (error) {
    console.error('Error listing files from R2:', error);
    throw error;
  }
}

/**
 * Asynchronously uploads a file to Cloudflare R2.
 *
 * @param file The file to upload
 * @param folderPath The folder path to upload to
 * @returns A promise that resolves to the file metadata
 */
export async function uploadFile(file: File, folderPath: string = '/'): Promise<FileMetadata> {
  try {
    // For folder marker files, bypass the image validation
    const isFolderMarker = file.name === '.keep';
    
    // Validate file size (except for folder markers)
    if (!isFolderMarker && file.size > FILE_SIZE_LIMIT) {
      throw new Error(`Files must be smaller than 10MB. This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
    }
    
    // Format the key by combining folder path and filename
    const formattedPath = folderPath === '/' ? '' : (folderPath.startsWith('/') ? folderPath.slice(1) : folderPath);
    const fileKey = formattedPath ? `${formattedPath}/${file.name}` : file.name;
    
    // Upload the file to R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: await file.arrayBuffer(),
      ContentType: file.type,
    });
    
    console.log('Uploading file to R2:', { 
      bucket: BUCKET_NAME, 
      fileKey, 
      folderPath, 
      contentType: file.type 
    });
    
    try {
      const uploadResult = await s3Client.send(command);
      console.log('Upload success, result:', uploadResult);
    } catch (uploadError) {
      console.error('R2 upload error details:', uploadError);
      throw uploadError;
    }
    
    // Generate a presigned URL for the uploaded file
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    const publicUrl = `https://files.careerweb.org/${fileKey}`;
    
    return {
      name: file.name,
      url,
      publicUrl,
      size: file.size,
      uploadDate: new Date().toISOString().split('T')[0],
      folderPath,
      fileKey,
    };
  } catch (error) {
    console.error('Error uploading file to R2:', error);
    throw error;
  }
}

/**
 * Asynchronously uploads a folder with all its files to Cloudflare R2.
 *
 * @param folderEntry The folder entry from the FileSystemEntry API
 * @param baseFolderPath The base folder path to upload to
 * @returns A promise that resolves to an array of file metadata
 */
export async function uploadFolder(folderEntry: FileSystemDirectoryEntry, baseFolderPath: string = '/'): Promise<FileMetadata[]> {
  const results: FileMetadata[] = [];
  
  // Create the main folder first
  const folderName = folderEntry.name;
  const mainFolderPath = baseFolderPath === '/' 
    ? `/${folderName}` 
    : `${baseFolderPath}/${folderName}`;
    
  console.log(`Creating main folder: ${mainFolderPath}`);
    
  // Create folder marker for the main folder
  const markerBlob = new Blob([''], { type: 'text/plain' });
  const markerFile = new File([markerBlob], '.keep', { type: 'text/plain' });
    
  try {
    const markerMetadata = await uploadFile(markerFile, mainFolderPath);
    results.push(markerMetadata);
  } catch (error) {
    console.error(`Error creating main folder ${mainFolderPath}:`, error);
  }
  
  // Read all entries in the folder all at once using a recursive function
  async function processDirectoryEntries(dirEntry: FileSystemDirectoryEntry, currentPath: string): Promise<void> {
    const dirReader = dirEntry.createReader();
    
    // Read all entries in this directory
    const readAllEntries = async (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        const allEntries: FileSystemEntry[] = [];
        
        // Create a recursive function to read entries in batches
        function readEntriesBatch() {
          dirReader.readEntries(
            (entries) => {
              if (entries.length === 0) {
                // No more entries, resolve with all collected entries
                resolve(allEntries);
              } else {
                // Add these entries to our collection and read next batch
                allEntries.push(...entries);
                readEntriesBatch();
              }
            },
            (error) => {
              reject(error);
            }
          );
        }
        
        // Start reading entries
        readEntriesBatch();
      });
    };
    
    // Get all entries
    const entries = await readAllEntries();
    console.log(`Found ${entries.length} entries in ${currentPath}`);
    
    // Process all file entries first (create files)
    for (const entry of entries) {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        
        // Convert FileSystemFileEntry to File object
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject);
        });
        
        // Only upload valid files or folder markers
        if (file.size <= FILE_SIZE_LIMIT || file.name === '.keep') {
          try {
            console.log(`Uploading file: ${file.name} to ${currentPath}`);
            const metadata = await uploadFile(file, currentPath);
            results.push(metadata);
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
          }
        }
      }
    }
    
    // Process all directory entries recursively (create subdirectories)
    for (const entry of entries) {
      if (entry.isDirectory) {
        const subDirEntry = entry as FileSystemDirectoryEntry;
        const subFolderName = subDirEntry.name;
        const subFolderPath = `${currentPath}/${subFolderName}`;
        
        console.log(`Creating subfolder: ${subFolderPath}`);
        
        // Extract path parts to create all intermediate directories if needed
        const pathParts = subFolderPath.split('/').filter(Boolean);
        let buildPath = '';
        
        // Ensure all intermediate directories exist by creating marker files for each level
        for (let i = 0; i < pathParts.length; i++) {
          buildPath = buildPath ? `${buildPath}/${pathParts[i]}` : `/${pathParts[i]}`;
          
          try {
            console.log(`Ensuring intermediate directory exists: ${buildPath}`);
            const intermediateMarkerFile = new File([new Blob([''], { type: 'text/plain' })], '.keep', { type: 'text/plain' });
            const markerMetadata = await uploadFile(intermediateMarkerFile, buildPath);
            results.push(markerMetadata);
          } catch (error) {
            console.error(`Error creating intermediate directory ${buildPath}:`, error);
          }
        }
        
        // Process this subdirectory recursively
        await processDirectoryEntries(subDirEntry, subFolderPath);
      }
    }
  }
  
  // Start the recursive processing of the main folder
  await processDirectoryEntries(folderEntry, mainFolderPath);
  
  return results;
}

/**
 * Asynchronously deletes a file from Cloudflare R2.
 *
 * @param fileKey The key of the file to delete
 * @returns A promise that resolves when the file is deleted
 */
export async function deleteFile(fileKey: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    throw error;
  }
}

/**
 * Asynchronously deletes a folder and all its contents from Cloudflare R2.
 *
 * @param folderPath The path of the folder to delete
 * @returns A promise that resolves when the folder and its contents are deleted
 */
export async function deleteFolder(folderPath: string): Promise<void> {
  try {
    // Ensure the folder path ends with a trailing slash for proper prefix matching
    const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    const prefix = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;

    // List all objects with the folder prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const { Contents } = await s3Client.send(listCommand);

    if (!Contents || Contents.length === 0) {
      console.log(`No files found in folder: ${folderPath}`);
      return;
    }

    // Delete each object in the folder
    for (const item of Contents) {
      if (!item.Key) continue;
      
      await deleteFile(item.Key);
      console.log(`Deleted file: ${item.Key}`);
    }

    console.log(`Successfully deleted folder: ${folderPath}`);
  } catch (error) {
    console.error('Error deleting folder from R2:', error);
    throw error;
  }
}
