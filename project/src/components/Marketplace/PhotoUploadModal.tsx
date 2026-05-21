import { useState, useRef, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadCustomAvatar } from '../../services/supabaseAvatarService';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function PhotoUploadModal({ isOpen, onClose, onUploadSuccess }: PhotoUploadModalProps) {
  const { currentUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPG, PNG, or WebP)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentUser) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const progressCallback = (progress: number) => {
        setUploadProgress(progress);
      };

      await uploadCustomAvatar(currentUser.uid, selectedFile, progressCallback);

      setSuccess(true);
      setUploadProgress(100);

      setTimeout(() => {
        onUploadSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload avatar. Please try again.');
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setSuccess(false);
    setUploading(false);
    setUploadProgress(0);
    onClose();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl w-full max-w-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Upload Custom Avatar</h2>
                <p className="text-gray-300 text-sm">Choose a photo to personalize your profile</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
              disabled={uploading}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Upload Area */}
          {!previewUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/30 bg-white/5 hover:border-white/50 hover:bg-white/10'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white/10 p-6 rounded-full">
                  <Upload className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isDragging ? 'Drop your photo here' : 'Drag & drop your photo'}
                  </h3>
                  <p className="text-gray-300 mb-4">or</p>
                  <button
                    onClick={handleBrowseClick}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-all transform hover:scale-105"
                  >
                    Browse Files
                  </button>
                </div>
                <div className="text-gray-400 text-sm">
                  <p>Supported formats: JPG, PNG, WebP</p>
                  <p>Maximum size: 5MB</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative">
                <div className="rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-full">
                        <ImageIcon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-2">Preview</h4>
                      <p className="text-gray-300 text-sm mb-1">{selectedFile?.name}</p>
                      <p className="text-gray-400 text-xs">
                        {selectedFile && (selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                      {!uploading && (
                        <button
                          onClick={handleRemoveFile}
                          className="text-red-400 hover:text-red-300 text-sm mt-3 underline"
                        >
                          Remove & choose different photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">Uploading...</span>
                    <span className="text-white text-sm font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="text-green-300 font-semibold">Upload Successful!</p>
                    <p className="text-green-200 text-sm">Your custom avatar is now active</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h4 className="text-blue-300 font-semibold mb-2">Tips for best results:</h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Use a clear, well-lit photo</li>
              <li>• Center your face in the photo</li>
              <li>• Square photos work best</li>
              <li>• Avoid photos with multiple people</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/5 border-t border-white/20 p-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading || success}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Uploading...
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-5 w-5" />
                Done
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Upload Avatar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
