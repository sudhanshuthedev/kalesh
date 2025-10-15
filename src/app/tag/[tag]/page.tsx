'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { tagAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';

export default function TagPage() {
  const params = useParams();
  const router = useRouter();
  const tag = decodeURIComponent(params.tag as string);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(1);

  useEffect(() => {
    loadVideos(1);
  }, [tag]);

  const loadVideos = useCallback(async (pageNum: number) => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setIsLoading(true);

      const pageSize = pageNum === 1 ? 5 : 10;
      const response = await tagAPI.explore(tag, pageNum, pageSize);
      if (response.status === 'success' && response.data?.videos) {
        const newVideos = response.data.videos;

        if (pageNum === 1) {
          setVideos(newVideos);
        } else {
          setVideos((prev) => [...prev, ...newVideos]);
        }

        setHasMore(newVideos.length === pageSize);
        pageRef.current = pageNum;
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load videos by tag:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [tag]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeVideoIndex && newIndex < videos.length) {
      setActiveVideoIndex(newIndex);

      if (newIndex >= videos.length - 3 && !loadingRef.current && hasMore) {
        const nextPage = pageRef.current + 1;
        loadVideos(nextPage);
      }
    }
  }, [activeVideoIndex, videos.length, hasMore, loadVideos]);

  if (isLoading && videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black px-4">
        <p className="text-white font-poppins text-lg text-center mb-2">
          No videos found for #{tag}
        </p>
        <p className="text-gray-400 font-poppins text-sm text-center mb-4">
          Try exploring other tags
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-white text-black font-poppins font-semibold hover:bg-gray-200 transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="snap-container bg-black"
    >
      {videos.map((video, index) => (
        <VideoPlayer
          key={`video-${video.id}`}
          video={video}
          isActive={index === activeVideoIndex}
          shouldPreload={index === activeVideoIndex + 1 || index === activeVideoIndex + 2}
        />
      ))}
      {isLoading && videos.length > 0 && (
        <div className="h-screen flex items-center justify-center bg-black snap-start">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
          />
        </div>
      )}
    </div>
  );
}

