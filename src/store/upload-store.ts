import { create } from "zustand";

export interface FileToUpload {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  path: string;
  status: "pending" | "uploading" | "completed" | "failed";
  progress: number;
  error?: string;
  s3Key?: string;
}

interface UploadState {
  files: FileToUpload[];
  selectedBucket: string | null;
  isUploading: boolean;
  
  // Actions
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  setSelectedBucket: (bucket: string | null) => void;
  updateFileProgress: (id: string, progress: number) => void;
  updateFileStatus: (id: string, status: FileToUpload["status"], error?: string) => void;
  setFileS3Key: (id: string, s3Key: string) => void;
  setIsUploading: (isUploading: boolean) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  files: [],
  selectedBucket: null,
  isUploading: false,

  addFiles: (newFiles) =>
    set((state) => ({
      files: [
        ...state.files,
        ...newFiles.map((file) => ({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          path: (file as any).webkitRelativePath || file.name,
          status: "pending" as const,
          progress: 0,
        })),
      ],
    })),

  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),

  clearFiles: () => set({ files: [] }),

  setSelectedBucket: (bucket) => set({ selectedBucket: bucket }),

  updateFileProgress: (id, progress) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, progress } : f
      ),
    })),

  updateFileStatus: (id, status, error) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, status, error } : f
      ),
    })),

  setFileS3Key: (id, s3Key) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, s3Key } : f
      ),
    })),

  setIsUploading: (isUploading) => set({ isUploading }),
}));
