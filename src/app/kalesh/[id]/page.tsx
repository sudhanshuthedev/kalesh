'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { feedAPI } from '@/lib/api';
import { Video } from '@/types';
import { motion } from 'framer-motion';
import Head from 'next/head';

export default function KaleshPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVideo();
  }, [videoId]);

  useEffect(() => {
    if (video) {
      document.title = `${video.title} | Kalesh`;

      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', video.description || video.title);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = video.description || video.title;
        document.head.appendChild(meta);
      }

      const updateMetaTag = (property: string, content: string) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (tag) {
          tag.setAttribute('content', content);
        } else {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          tag.setAttribute('content', content);
          document.head.appendChild(tag);
        }
      };

      updateMetaTag('og:title', video.title);
      updateMetaTag('og:description', video.description || video.title);
      updateMetaTag('og:url', `${window.location.origin}/kalesh/${video.id}`);
      if (video.thumbnail_url) {
        updateMetaTag('og:image', video.thumbnail_url);
      }
      updateMetaTag('og:type', 'video.other');

      const updateTwitterTag = (name: string, content: string) => {
        let tag = document.querySelector(`meta[name="${name}"]`);
        if (tag) {
          tag.setAttribute('content', content);
        } else {
          tag = document.createElement('meta');
          tag.setAttribute('name', name);
          tag.setAttribute('content', content);
          document.head.appendChild(tag);
        }
      };

      updateTwitterTag('twitter:card', 'player');
      updateTwitterTag('twitter:title', video.title);
      updateTwitterTag('twitter:description', video.description || video.title);
      if (video.thumbnail_url) {
        updateTwitterTag('twitter:image', video.thumbnail_url);
      }
    }

    return () => {
      document.title = 'Kalesh - Watch Kaleshi Videos';
    };
  }, [video]);

  const loadVideo = async () => {
    try {
      setIsLoading(true);
      const response = await feedAPI.getTrending(1, 50);
      if (response.status === 'success' && response.data?.videos) {
        const foundVideo = response.data.videos.find((v: Video) => v.id === videoId);
        if (foundVideo) {
          setVideo(foundVideo);
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Failed to load video:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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

  if (!video) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <p className="text-white font-poppins text-lg">Video not found</p>
      </div>
    );
  }

  return (
    <div className="snap-container bg-black">
      <VideoPlayer
        video={video}
        isActive={true}
        shouldPreload={false}
      />
    </div>
  );
}

