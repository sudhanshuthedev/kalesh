'use client';

import React, { useEffect, useState, useRef } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async (pageNum = 1) => {
    try {
      setIsLoading(true);
      // Load fewer videos initially for faster page load (5 instead of 20)
      const pageSize = pageNum === 1 ? 5 : 10;
      const response = await feedAPI.getTrending(pageNum, pageSize);
      if (response.status === 'success' && response.data?.videos) {
        if (pageNum === 1) {
          setVideos(response.data.videos);
        } else {
          setVideos((prev) => [...prev, ...response.data.videos]);
        }
        setHasMore(response.data.videos.length === pageSize);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeVideoIndex && newIndex < videos.length) {
      setActiveVideoIndex(newIndex);
      
      // Load more videos when user is on the 3rd last video
      if (newIndex >= videos.length - 3 && !isLoading && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        loadVideos(nextPage);
      }
    }
  };

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
      <div className="h-screen flex items-center justify-center bg-black">
        <p className="text-white font-poppins text-lg">No videos available</p>
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
          onInteraction={() => loadVideos(1)}
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

