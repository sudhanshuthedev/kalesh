'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { videoAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { IoCloudUploadOutline, IoVideocamOutline, IoCheckmarkCircle } from 'react-icons/io5';

export default function UploadPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB');
        return;
      }
      setVideoFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (tags) formData.append('tags', tags);

      const response = await videoAPI.upload(formData);
      if (response.status === 'success') {
        setUploadSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <IoCheckmarkCircle size={80} className="text-green-500 mb-4" />
        </motion.div>
        <h2 className="text-white font-poppins text-2xl font-bold mb-2">Upload Successful!</h2>
        <p className="text-gray-400 font-poppins">Redirecting to home...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-16 pb-20 md:pb-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-poppins font-bold mb-8">Upload Video</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-app-gray p-8 flex flex-col items-center justify-center transition-all hover:bg-opacity-80"
            >
              {videoFile ? (
                <>
                  <IoVideocamOutline size={48} className="text-green-500 mb-2" />
                  <p className="font-poppins text-sm">{videoFile.name}</p>
                  <p className="font-poppins text-xs text-gray-400 mt-1">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <IoCloudUploadOutline size={48} className="text-gray-400 mb-2" />
                  <p className="font-poppins">Click to select video</p>
                  <p className="font-poppins text-xs text-gray-400 mt-1">Max 100MB</p>
                </>
              )}
            </button>
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-app-gray px-4 py-3 font-poppins focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-20 transition-all"
              placeholder="Enter video title"
              required
            />
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-app-gray px-4 py-3 font-poppins h-32 resize-none focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-20 transition-all"
              placeholder="Enter video description"
            />
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-2">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-app-gray px-4 py-3 font-poppins focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-20 transition-all"
              placeholder="e.g. funny, gaming, tutorial"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm font-poppins"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isUploading || !videoFile || !title}
            className="w-full bg-white text-black py-3 font-poppins font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </form>
      </div>
    </div>
  );
}

