'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { videoAPI, tagAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { IoCloudUploadOutline, IoVideocamOutline, IoCheckmarkCircle, IoClose } from 'react-icons/io5';

export default function UploadPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [trendingTags, setTrendingTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [suggestedTags, setSuggestedTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isNsfw, setIsNsfw] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showTOS, setShowTOS] = useState(false);
  const [acceptedTOS, setAcceptedTOS] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [hasPreviousPart, setHasPreviousPart] = useState(false);
  const [previousPartId, setPreviousPartId] = useState('');
  const [myVideos, setMyVideos] = useState<any[]>([]);
  const [loadingMyVideos, setLoadingMyVideos] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    document.title = 'Upload Video - Kalesh';

    const metaDescription = document.querySelector('meta[name="description"]');
    const descriptionText = 'Upload and share your videos on Kalesh';
    if (metaDescription) {
      metaDescription.setAttribute('content', descriptionText);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = descriptionText;
      document.head.appendChild(meta);
    }

    return () => {
      document.title = 'Kalesh - Watch Kaleshi Videos';
    };
  }, []);

  useEffect(() => {
    loadTrendingTags();
  }, []);

  useEffect(() => {
    if (hasPreviousPart && isAuthenticated) {

      const timeoutId = setTimeout(() => {
        loadMyVideos();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [hasPreviousPart, isAuthenticated, videoSearchQuery]);

  useEffect(() => {
    if (tagInput.length >= 2) {
      loadSuggestedTags(tagInput);
    } else {
      setSuggestedTags([]);
      setShowSuggestions(false);
    }
  }, [tagInput]);

  const loadTrendingTags = async () => {
    try {
      const response = await tagAPI.trending(10);
      if (response.status === 'success' && response.data?.tags) {
        setTrendingTags(response.data.tags);
      }
    } catch (error) {
      console.error('Failed to load trending tags:', error);
    }
  };

  const loadSuggestedTags = async (query: string) => {
    try {
      const response = await tagAPI.suggest(query, 5);
      if (response.status === 'success' && response.data?.tags) {
        setSuggestedTags(response.data.tags);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to load suggested tags:', error);
    }
  };

  const loadMyVideos = async () => {
    try {
      setLoadingMyVideos(true);
      const response = await videoAPI.getMyVideos(videoSearchQuery || undefined, 1, 50);
      if (response.status === 'success' && response.data?.videos) {

        const availableVideos = response.data.videos.filter((v: any) => !v.next_part_id);
        setMyVideos(availableVideos);

        if (previousPartId && !availableVideos.find((v: any) => v.id === previousPartId)) {
          setPreviousPartId('');
        }
      }
    } catch (error) {
      console.error('Failed to load my videos:', error);
    } finally {
      setLoadingMyVideos(false);
    }
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase();
    if (cleanTag && !selectedTags.includes(cleanTag) && selectedTags.length < 10) {
      setSelectedTags([...selectedTags, cleanTag]);
      setTagInput('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      }
    } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  React.useEffect(() => {
    if (!uploadedVideoId || processingStatus === 'completed' || processingStatus === 'failed') {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await videoAPI.getProcessingStatus(uploadedVideoId);
        if (response.status === 'success') {
          const status = response.data?.processing_status;
          const position = response.data?.queue_position;

          setProcessingStatus(status);
          if (position !== undefined) {
            setQueuePosition(position);
          }

          if (status === 'completed') {
            setTimeout(() => {
              router.push('/');
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Failed to get processing status:', error);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    pollStatus();

    return () => clearInterval(interval);
  }, [uploadedVideoId, processingStatus, router]);

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

    if (hasPreviousPart && !previousPartId) {
      setError('Please select the previous part of this series');
      return;
    }

    if (!acceptedTOS) {
      setShowTOS(true);
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title);
      if (description) formData.append('description', description);
      if (selectedTags.length > 0) formData.append('tags', selectedTags.join(','));
      formData.append('is_nsfw', isNsfw.toString());
      if (hasPreviousPart && previousPartId) formData.append('last_part_id', previousPartId);

      const response = await videoAPI.upload(formData);
      if (response.status === 'success') {
        const videoId = response.data?.video?.id;
        if (videoId) {
          setUploadedVideoId(videoId);
          setProcessingStatus(response.data?.video?.processing_status || 'pending');
          setUploadSuccess(true);

        } else {
          setUploadSuccess(true);
          setTimeout(() => {
            router.push('/');
          }, 2000);
        }
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
        {processingStatus === 'completed' ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <IoCheckmarkCircle size={80} className="text-green-500 mb-4" />
            </motion.div>
            <h2 className="text-white font-poppins text-2xl font-bold mb-2">Video Ready!</h2>
            <p className="text-gray-400 font-poppins">Your video has been processed successfully</p>
            <p className="text-gray-500 font-poppins text-sm mt-2">Redirecting to home...</p>
          </>
        ) : processingStatus === 'failed' ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <IoCloudUploadOutline size={80} className="text-red-500 mb-4" />
            </motion.div>
            <h2 className="text-white font-poppins text-2xl font-bold mb-2">Processing Failed</h2>
            <p className="text-gray-400 font-poppins">Something went wrong processing your video</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-2 bg-white text-black font-poppins rounded hover:bg-gray-200"
            >
              Go Home
            </button>
          </>
        ) : (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-4"
            >
              <IoVideocamOutline size={80} className="text-white" />
            </motion.div>
            <h2 className="text-white font-poppins text-2xl font-bold mb-2">
              {processingStatus === 'processing' ? 'Processing Video...' : 'Video Uploaded!'}
            </h2>
            <p className="text-gray-400 font-poppins text-center mb-2">
              {processingStatus === 'processing'
                ? 'Your video is being processed. This may take a few minutes.'
                : 'Your video is in the queue and will be processed shortly.'}
            </p>
            {queuePosition !== null && queuePosition > 0 && (
              <p className="text-yellow-400 font-poppins text-sm">
                Queue position: {queuePosition}
              </p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 bg-white rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-white rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-white rounded-full"
              />
            </div>
            <p className="text-gray-500 font-poppins text-xs mt-4">
              You can leave this page. The video will appear in your profile when ready.
            </p>
          </>
        )}
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
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has-previous-part"
                checked={hasPreviousPart}
                onChange={(e) => {
                  setHasPreviousPart(e.target.checked);
                  if (!e.target.checked) {
                    setPreviousPartId('');
                    setVideoSearchQuery('');
                  }
                }}
                className="w-5 h-5 cursor-pointer accent-white"
              />
              <label htmlFor="has-previous-part" className="font-poppins text-sm cursor-pointer select-none">
                This video is part of a series
              </label>
            </div>

            {hasPreviousPart && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-poppins text-sm mb-2">Search your videos</label>
                  <input
                    type="text"
                    value={videoSearchQuery}
                    onChange={(e) => setVideoSearchQuery(e.target.value)}
                    className="w-full bg-app-gray px-4 py-3 font-poppins focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-20 transition-all"
                    placeholder="Search for the previous part..."
                  />
                </div>

                <div>
                  <label className="block font-poppins text-sm mb-2">Select previous part *</label>
                  {loadingMyVideos ? (
                    <div className="flex items-center justify-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
                      />
                    </div>
                  ) : myVideos.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto bg-app-gray border border-white/20">
                      {myVideos.map((video) => (
                        <button
                          key={video.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPreviousPartId(video.id);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0 ${
                            previousPartId === video.id ? 'bg-white/20' : ''
                          }`}
                        >
                          <p className="font-poppins text-sm font-semibold text-white truncate">{video.title}</p>
                          <p className="font-poppins text-xs text-gray-400 mt-1">
                            {new Date(video.created_at?.iso || video.created_at).toLocaleDateString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-app-gray border border-white/20 px-4 py-8 text-center">
                      <p className="font-poppins text-sm text-gray-400">
                        {videoSearchQuery ? 'No videos found matching your search' : 'No videos available for series. Videos that already have a next part cannot be selected.'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {}
          <div>
            <label className="block font-poppins text-sm mb-2">
              Tags {selectedTags.length > 0 && <span className="text-gray-400">({selectedTags.length}/10)</span>}
            </label>

            {}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 px-3 py-1 bg-white/20 border border-white/30 text-white font-poppins text-sm"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-400 transition-colors"
                    >
                      <IoClose size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {}
            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onFocus={() => setShowSuggestions(suggestedTags.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full bg-app-gray px-4 py-3 font-poppins focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-20 transition-all"
                placeholder="Type to search tags or press Enter to add"
                disabled={selectedTags.length >= 10}
              />

              {}
              {showSuggestions && suggestedTags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-app-gray border border-white/20 z-10 max-h-48 overflow-y-auto"
                >
                  {suggestedTags.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => addTag(item.tag)}
                      className="w-full text-left px-4 py-2 hover:bg-white/10 font-poppins text-sm text-white flex items-center justify-between"
                    >
                      <span>#{item.tag}</span>
                      <span className="text-xs text-gray-400">{item.count} videos</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {}
            {trendingTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 font-poppins mb-2">Trending tags:</p>
                <div className="flex flex-wrap gap-2">
                  {trendingTags.slice(0, 8).map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => addTag(item.tag)}
                      disabled={selectedTags.includes(item.tag) || selectedTags.length >= 10}
                      className="px-2 py-1 bg-white/10 border border-white/20 text-white font-poppins text-xs hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      #{item.tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="nsfw-checkbox"
              checked={isNsfw}
              onChange={(e) => setIsNsfw(e.target.checked)}
              className="w-5 h-5 cursor-pointer accent-white"
            />
            <label htmlFor="nsfw-checkbox" className="font-poppins text-sm cursor-pointer select-none">
              Mark as NSFW (Not Safe For Work)
            </label>
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

        {}
        <AnimatePresence>
          {showTOS && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTOS(false)}
                className="fixed inset-0 bg-black/80 z-[9998] flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-app-gray rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col z-[9999]"
                >
                  <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="font-poppins font-bold text-xl text-white">Terms of Service</h2>
                    <button onClick={() => setShowTOS(false)} className="text-gray-400 hover:text-white">
                      <IoClose size={24} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 text-gray-300 font-poppins text-sm leading-relaxed space-y-4">
                    <p className="text-xs text-gray-500">Last Updated: October 15, 2025</p>

                    <p>
                      Welcome to our platform. These Terms of Service ("Terms") explain the rules that govern your use of our website, mobile application, and all related services ("the Service"). By accessing or using the Service, you agree to be bound by these Terms and all applicable laws. If you do not agree, please do not continue using the platform.
                    </p>

                    <h3 className="font-semibold text-white mt-4">Use of the Platform</h3>
                    <p>
                      The Service is intended for individuals who are at least 18 years old. By using the platform, you confirm that you meet this requirement and that you are legally capable of entering into a binding agreement. You are responsible for maintaining the confidentiality of your account and password and for all activities that occur under your account.
                    </p>
                    <p>
                      You agree to use the Service only for lawful purposes and in accordance with these Terms. Any attempt to misuse or disrupt the platform, gain unauthorized access, or distribute harmful material is strictly prohibited.
                    </p>

                    <h3 className="font-semibold text-white mt-4">User-Generated Content</h3>
                    <p>
                      Our platform allows users to upload, post, and share videos and other materials ("Content"). You retain all ownership rights to the Content you create. However, by submitting Content, you grant us a non-exclusive, worldwide, royalty-free license to host, display, and distribute it as necessary to operate and promote the platform.
                    </p>
                    <p>
                      You understand and agree that you are solely responsible for your uploads and for ensuring that they comply with all applicable laws and these Terms. We do not endorse or guarantee the accuracy, integrity, or quality of any Content submitted by users.
                    </p>

                    <h3 className="font-semibold text-white mt-4">Prohibited Material</h3>
                    <p>Certain types of material are strictly forbidden on the platform. This includes, but is not limited to, content that:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>depicts or involves minors in any sexual or exploitative manner (CSAM)</li>
                      <li>promotes or depicts bestiality, sexual assault, or animal abuse</li>
                      <li>contains explicit gore, serious injury, or death intended to shock or disgust</li>
                      <li>incites hate, violence, or discrimination</li>
                      <li>shares private or intimate material without consent</li>
                      <li>violates copyrights, trademarks, or other legal rights</li>
                      <li>spreads scams, spam, or malicious software</li>
                    </ul>
                    <p>
                      We reserve the right to remove any Content that we believe violates these standards or applicable law, and to suspend or terminate the accounts of those responsible.
                    </p>

                    <h3 className="font-semibold text-white mt-4">Moderation and Enforcement</h3>
                    <p>
                      Content on the platform may be moderated automatically or manually. Users can report inappropriate material through the reporting system provided. Depending on the severity and frequency of violations, we may remove content, restrict certain features, suspend accounts, or notify relevant authorities when legally required.
                    </p>

                    <h3 className="font-semibold text-white mt-4">Intellectual Property</h3>
                    <p>
                      All rights in the platform's design, code, interface, and branding belong exclusively to the platform owners. You may not reproduce, modify, distribute, or create derivative works based on the Service without prior written consent.
                    </p>

                    <h3 className="font-semibold text-white mt-4">Termination</h3>
                    <p>
                      We may suspend or permanently disable access to your account if you breach these Terms or engage in conduct that may harm other users or the platform's integrity. You may close your account at any time by following the account deletion process.
                    </p>

                    <h3 className="font-semibold text-white mt-4">Disclaimer and Limitation of Liability</h3>
                    <p>
                      The Service is provided "as is" and "as available" without any warranties, express or implied. We do not guarantee uninterrupted service, error-free performance, or absolute security. To the fullest extent permitted by law, we are not liable for any damages arising from your use of or inability to use the Service, including damages caused by user-generated content.
                    </p>

                    <h3 className="font-semibold text-white mt-4">Changes to These Terms</h3>
                    <p>
                      We may revise these Terms from time to time to reflect updates in our operations or legal obligations. Any changes will be posted on this page with a revised "Last Updated" date. Your continued use of the Service after such updates constitutes your acceptance of the new Terms.
                    </p>

                    <h3 className="font-semibold text-white mt-4">Summary</h3>
                    <p className="font-semibold">
                      This platform allows users to share videos responsibly. Illegal content, hate speech, and graphic violence are not tolerated. Respect the law, respect others, and post responsibly.
                    </p>
                  </div>

                  <div className="p-6 border-t border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="acceptTOS"
                        checked={acceptedTOS}
                        onChange={(e) => setAcceptedTOS(e.target.checked)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <label htmlFor="acceptTOS" className="font-poppins text-sm text-white cursor-pointer">
                        I agree to the Terms of Service
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowTOS(false)}
                        className="flex-1 bg-gray-700 text-white font-poppins py-2.5 rounded hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (acceptedTOS) {
                            setShowTOS(false);
                            handleSubmit(new Event('submit') as any);
                          }
                        }}
                        disabled={!acceptedTOS}
                        className="flex-1 bg-white text-black font-poppins py-2.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

