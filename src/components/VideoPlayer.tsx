'use client';

import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { Video } from '@/types';
import { motion } from 'framer-motion';
import { IoHeartSharp, IoHeartOutline, IoBookmarkSharp, IoBookmarkOutline, IoShareSocialSharp, IoPersonCircleOutline, IoVolumeMuteOutline, IoVolumeHighOutline, IoExpandOutline, IoContractOutline, IoChatbubbleOutline, IoFlagOutline, IoClose, IoEllipsisVertical, IoTrashOutline } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import { interactionAPI } from '@/lib/api';
import Link from 'next/link';
import CommentsModal from './CommentsModal';
import DeleteVideoModal from './DeleteVideoModal';
import { useRouter } from 'next/navigation';

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
  shouldPreload?: boolean;
}

let userHasInteracted = false;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive, shouldPreload = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(
    video.user_interaction?.liked || video.user_interaction?.is_liked || video.is_liked || false
  );
  const [isSaved, setIsSaved] = useState(
    video.user_interaction?.saved || video.user_interaction?.is_saved || video.is_saved || false
  );
  const [likes, setLikes] = useState(video.likes || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(isActive);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showMuteHint, setShowMuteHint] = useState(false);
  const [showMutedIcon, setShowMutedIcon] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [bigHeartPosition, setBigHeartPosition] = useState({ x: 0, y: 0 });
  const [videoProgress, setVideoProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionLayerRef = useRef<HTMLDivElement>(null);
  const viewTrackedRef = useRef(false);
  const lastTapRef = useRef<number>(0);
  const isOwnVideo = user?.username === video.uploader_username;

  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePlay = async () => {
      if (!viewTrackedRef.current && isActive) {
        viewTrackedRef.current = true;
        try {
          const { videoAPI } = await import('@/lib/api');
          await videoAPI.trackView(video.id);
        } catch (error) {
          console.error('Failed to track view:', error);
        }
      }
    };

    videoElement.addEventListener('play', handlePlay);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
    };
  }, [video.id, isActive]);

  useEffect(() => {
    viewTrackedRef.current = false;
    setShowAllTags(false);
    setVideoProgress(0);
  }, [video.id]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateProgress = () => {
      const progress = (videoElement.currentTime / videoElement.duration) * 100;
      setVideoProgress(progress || 0);
    };

    videoElement.addEventListener('timeupdate', updateProgress);
    videoElement.addEventListener('loadedmetadata', updateProgress);

    return () => {
      videoElement.removeEventListener('timeupdate', updateProgress);
      videoElement.removeEventListener('loadedmetadata', updateProgress);
    };
  }, [video.id]);

  useEffect(() => {

    if (!isActive && !shouldPreload) {
      return;
    }

    const videoUrl = video.playlist_url || video.video_url;

    if (!videoRef.current || !videoUrl) {
      setIsLoading(false);
      return;
    }

    const videoElement = videoRef.current;

    if (hlsRef.current && hlsRef.current.media === videoElement) {
      if (isActive) {
        if (videoElement.readyState >= 3) {
          setIsLoading(false);
        } else {
          loadTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
          }, 5000);
        }
      } else {
        setIsLoading(false);
      }
      return;
    }

    if (isActive) {

      if (videoElement.readyState >= 3) {
        setIsLoading(false);
      } else {
        loadTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
        }, 5000);
      }
    } else {
      setIsLoading(false);
    }

    if ((video.playlist_url || videoUrl.includes('.m3u8'))) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: true,
          enableWorker: true,
          startLevel: -1,
          autoStartLoad: true,
          capLevelToPlayerSize: true,
          maxBufferLength: shouldPreload ? 20 : (isActive ? 30 : 5),
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          abrEwmaDefaultEstimate: 1500000,
          lowLatencyMode: false,
          backBufferLength: 90,
          progressive: true,
        });

        hlsRef.current = hls;

        console.log('Loading HLS video:', videoUrl);
        hls.loadSource(videoUrl);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
          if (isActive) {
            setIsLoading(false);
          }
        });

        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          if (isLoading && isActive) {
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            setIsLoading(false);
          }
        });

        hls.on(Hls.Events.BUFFER_APPENDING, () => {

          if (shouldPreload && videoElement.readyState >= 3) {

            setIsLoading(false);
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          if (data.fatal) {
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, attempting recovery...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, attempting recovery...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal error, destroying HLS instance:', data);
                hls.destroy();
                setIsLoading(false);
                break;
            }
          }
        });
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = videoUrl;
        videoElement.addEventListener('loadedmetadata', () => {
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
          }
          setIsLoading(false);
        });
      }
    } else {
      videoElement.src = videoUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        setIsLoading(false);
      });
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

    };
  }, [isActive, shouldPreload, video.id, video.playlist_url, video.video_url]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.id]);

  useEffect(() => {
    let checkReadyInterval: NodeJS.Timeout | null = null;
    let playTimeout: NodeJS.Timeout | null = null;

    if (videoRef.current) {
      if (isActive) {
        const video = videoRef.current;

        const tryPlay = () => {
          if (userHasInteracted) {
            video.muted = false;
            video.play().then(() => {
              setIsPlaying(true);
              setShowMuteHint(false);
              setIsLoading(false);
            }).catch(() => {
              video.muted = true;
              video.play().then(() => {
                setIsPlaying(true);
                setShowMuteHint(true);
                setIsLoading(false);
              }).catch(() => {
                setIsPlaying(false);
              });
            });
          } else {
            video.muted = true;
            video.play().then(() => {
              setIsPlaying(true);
              setShowMuteHint(true);
              setIsLoading(false);
            }).catch(() => {
              setIsPlaying(false);
            });
          }
        };

        if (video.readyState >= 3) {
          tryPlay();
        } else {
          checkReadyInterval = setInterval(() => {

            if (video.readyState >= 3) {
              if (checkReadyInterval) clearInterval(checkReadyInterval);
              tryPlay();
            }
          }, 50);

          playTimeout = setTimeout(() => {
            if (checkReadyInterval) clearInterval(checkReadyInterval);

            if (!isPlaying && video.readyState >= 2) {
              tryPlay();
            }
          }, 5000);
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }

    return () => {
      if (checkReadyInterval) clearInterval(checkReadyInterval);
      if (playTimeout) clearTimeout(playTimeout);
    };
  }, [isActive]);

  const handleLike = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isAuthenticated) {
      alert('Please login to like videos');
      return;
    }

    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikes((prev) => (newLikedState ? prev + 1 : prev - 1));
      await interactionAPI.like(video.id);
    } catch (error) {
      setIsLiked(!isLiked);
      setLikes((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const createHeart = (x: number, y: number) => {
    const heartId = Date.now() + Math.random();
    setHearts((prev) => [...prev, { id: heartId, x, y }]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1500);
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isAuthenticated) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {

      e.preventDefault();
      e.stopPropagation();

      let tapX, tapY;
      if ('touches' in e) {
        tapX = e.touches[0]?.clientX || e.changedTouches[0].clientX;
        tapY = e.touches[0]?.clientY || e.changedTouches[0].clientY;
      } else {
        tapX = e.clientX;
        tapY = e.clientY;
      }

      setBigHeartPosition({ x: tapX, y: tapY });

      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          createHeart(
            tapX + (Math.random() - 0.5) * 60,
            tapY - 70 + (Math.random() - 0.5) * 30
          );
        }, i * 80);
      }

      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 600);

      if (!isLiked) {
        handleLike();
      }

      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('Please login to save videos');
      return;
    }

    try {
      setIsSaved(!isSaved);
      await interactionAPI.save(video.id);
    } catch (error) {
      setIsSaved(!isSaved);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const shareUrl = `${baseUrl}/kalesh/${video.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description || video.title,
          url: shareUrl,
        });
      } catch (error) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert('Link copied to clipboard!');
        } catch (clipError) {
          alert('Failed to copy link');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
      } catch (error) {
        alert('Failed to copy link. Please try again.');
      }
    }
  };

  const handlePressStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('nav')) {
      return;
    }

    setIsLongPress(false);
    pressTimer.current = setTimeout(() => {
      setIsLongPress(true);

      if (videoRef.current && isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }, 500);
  };

  const handlePressEnd = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('nav')) {
      return;
    }

    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }

    if (!isLongPress && videoRef.current) {
      const video = videoRef.current;

      if (!userHasInteracted) {
        userHasInteracted = true;
      }

      if (video.muted) {
        video.muted = false;
        setShowMuteHint(false);

        setShowMutedIcon(true);
        setTimeout(() => setShowMutedIcon(false), 1500);
      }

      if (!isPlaying) {
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    }

    setIsLongPress(false);
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (!isFullscreen) {

        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;

      if (showMoreMenu && !target.closest('.more-menu') && !target.closest('.more-menu-button')) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 100);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showMoreMenu]);

  const handleDeleteVideo = () => {

    router.push('/');
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full snap-start snap-always bg-black overflow-hidden"
      style={{
        pointerEvents: (showCommentsModal || showMoreMenu || showDeleteModal) ? 'none' : 'auto',
        scrollSnapStop: 'always'
      }}
    >
      {}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted
        poster={video.thumbnail_url || undefined}
        onLoadedData={() => {
          if (isLoading) {
            setIsLoading(false);
          }
        }}
        onCanPlay={() => {
          if (isLoading) {
            setIsLoading(false);
          }
        }}
        preload={isActive || shouldPreload ? "auto" : "none"}
        crossOrigin="anonymous"
      />

      {}
      {!showCommentsModal && !showReportModal && !showMoreMenu && !showDeleteModal && (
        <div
          ref={interactionLayerRef}
          className="absolute left-0 right-0 z-10"
          style={{ top: '56px', bottom: '64px' }}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onClick={handleDoubleTap}
          onMouseLeave={() => {
            if (pressTimer.current) {
              clearTimeout(pressTimer.current);
              pressTimer.current = null;
            }
          }}
          onTouchStart={handlePressStart}
          onTouchEnd={(e) => {
            handlePressEnd(e);
            handleDoubleTap(e);
          }}
        />
      )}

      {}
      {isLoading && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-[60] pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
          />
        </div>
      )}

      {}

      {}
      {showMuteHint && isPlaying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-16 right-4 md:top-20 md:right-6 z-[60] pointer-events-none"
        >
          <IoVolumeMuteOutline size={24} className="text-white drop-shadow-2xl" />
        </motion.div>
      )}

      {}
      {showMutedIcon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
        >
          <IoVolumeHighOutline size={60} className="text-white drop-shadow-2xl" />
        </motion.div>
      )}

      {}
      {showBigHeart && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed z-[60] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${bigHeartPosition.x}px`, top: `${bigHeartPosition.y}px` }}
        >
          <IoHeartSharp size={100} className="text-red-500 drop-shadow-2xl" />
        </motion.div>
      )}

      {}
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0.7],
            y: -120,
            x: [(Math.random() - 0.5) * 30]
          }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="fixed z-[60] pointer-events-none"
          style={{ left: `${heart.x}px`, top: `${heart.y}px` }}
        >
          <IoHeartSharp
            size={25 + Math.random() * 15}
            className="text-red-500"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))',
              transform: `rotate(${(Math.random() - 0.5) * 25}deg)`
            }}
          />
        </motion.div>
      ))}

      {}
      {isActive && video.tags && video.tags.length > 0 && (
        <div className="fixed top-16 md:top-[72px] left-0 right-0 px-4 z-[40]">
          <div
            className={`flex items-center gap-2 ${showAllTags ? 'overflow-x-auto scrollbar-hide' : ''}`}
            style={{
              pointerEvents: 'auto',
              scrollBehavior: 'smooth'
            }}
          >
            {showAllTags ? (
              video.tags.map((tag, index) => (
                <Link
                  key={index}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="px-2 py-1 bg-white/20 border border-white/30 text-white font-poppins text-xs whitespace-nowrap flex-shrink-0 hover:bg-white/40 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  #{tag}
                </Link>
              ))
            ) : (
              <>
                <Link
                  href={`/tag/${encodeURIComponent(video.tags[0])}`}
                  className="px-2 py-1 bg-white/20 border border-white/30 text-white font-poppins text-xs whitespace-nowrap hover:bg-white/40 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  #{video.tags[0]}
                </Link>
                {video.tags.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAllTags(true);
                    }}
                    className="px-2 py-1 bg-white/20 border border-white/30 text-white font-poppins text-xs hover:bg-white/30 transition-colors"
                  >
                    +{video.tags.length - 1} more
                  </button>
                )}
              </>
            )}
            {showAllTags && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAllTags(false);
                }}
                className="px-2 py-1 bg-white/20 border border-white/30 text-white font-poppins text-xs hover:bg-white/30 transition-colors flex-shrink-0"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      {}

      {isActive && (
        <div className="fixed md:absolute bottom-24 md:bottom-8 left-0 right-0 md:left-4 md:right-28 px-4 md:px-0 md:p-6 z-[40] pointer-events-none">
          <div className="max-w-md md:max-w-xl">
            <Link href={`/profile/${video.uploader_username}`} className="inline-block mb-1.5 md:mb-1.5 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                {video.uploader_profile_image_url ? (
                  <img
                    src={video.uploader_profile_image_url}
                    alt={video.uploader_username}
                    className="w-[26px] h-[26px] md:w-7 md:h-7 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <IoPersonCircleOutline size={26} className="text-white md:w-7 md:h-7" />
                )}
                <span className="text-white font-poppins font-semibold text-sm md:text-sm">
                  @{video.uploader_username}
                </span>
              </div>
            </Link>
            <div>
              <h3
                className={`text-white font-poppins text-sm md:text-base font-semibold mb-1 md:mb-1 ${!showFullDescription ? 'line-clamp-1' : ''} pointer-events-auto cursor-pointer`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const shouldShowExpand = video.title.length > 50 || (video.description && video.description.length > 100);
                  if (shouldShowExpand) {
                    setShowFullDescription(!showFullDescription);
                  }
                }}
              >
                {video.title}
              </h3>
              {video.description && (
                <div className="pointer-events-auto">
                  <p
                    className={`text-white text-[13px] md:text-sm font-poppins opacity-90 leading-snug md:leading-normal ${!showFullDescription ? 'line-clamp-2' : ''} cursor-pointer`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (video.description && (video.description.length > 100 || video.title.length > 50)) {
                        setShowFullDescription(!showFullDescription);
                      }
                    }}
                  >
                    {video.description}
                  </p>
                  {(video.description.length > 100 || video.title.length > 50) && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowFullDescription(!showFullDescription);
                      }}
                      className="text-white text-xs md:text-xs font-poppins font-semibold mt-1 md:mt-1 opacity-75 hover:opacity-100 active:scale-95 transition-all"
                    >
                      {showFullDescription ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {isActive && !showCommentsModal && (
        <div className="fixed md:absolute right-3 md:right-6 bottom-40 md:bottom-8 flex flex-col gap-5 md:gap-6 z-[40] pointer-events-auto">
          <button
            type="button"
            onClick={handleLike}
            className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
          >
            {isLiked ? (
              <IoHeartSharp size={32} className="text-red-500 md:w-9 md:h-9" />
            ) : (
              <IoHeartOutline size={32} className="text-white md:w-9 md:h-9" />
            )}
            <span className="text-white text-[10px] md:text-xs font-poppins font-bold">
              {likes}
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCommentsModal(true);
            }}
            className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
          >
            <IoChatbubbleOutline size={28} className="text-white md:w-8 md:h-8" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
          >
            {isSaved ? (
              <IoBookmarkSharp size={28} className="text-yellow-400 md:w-8 md:h-8" />
            ) : (
              <IoBookmarkOutline size={28} className="text-white md:w-8 md:h-8" />
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMoreMenu(!showMoreMenu);
              }}
              className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform more-menu-button"
            >
              <IoEllipsisVertical size={28} className="text-white md:w-8 md:h-8" />
            </button>

            {showMoreMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute bottom-0 right-full mr-3 bg-black/90 backdrop-blur-md rounded-lg py-2 min-w-[160px] shadow-2xl z-50 more-menu"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShare(e as any);
                    setTimeout(() => setShowMoreMenu(false), 100);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShare(e as any);
                    setTimeout(() => setShowMoreMenu(false), 100);
                  }}
                  className="w-full text-left px-4 py-3 text-white hover:bg-white/10 active:bg-white/20 transition-colors font-poppins text-sm flex items-center gap-3"
                >
                  <IoShareSocialSharp size={20} />
                  Share
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFullscreen(e as any);
                    setTimeout(() => setShowMoreMenu(false), 100);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFullscreen(e as any);
                    setTimeout(() => setShowMoreMenu(false), 100);
                  }}
                  className="w-full text-left px-4 py-3 text-white hover:bg-white/10 active:bg-white/20 transition-colors font-poppins text-sm flex items-center gap-3"
                >
                  {isFullscreen ? <IoContractOutline size={20} /> : <IoExpandOutline size={20} />}
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>

                {isOwnVideo ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteModal(true);
                      setTimeout(() => setShowMoreMenu(false), 100);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteModal(true);
                      setTimeout(() => setShowMoreMenu(false), 100);
                    }}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/10 active:bg-white/20 transition-colors font-poppins text-sm flex items-center gap-3"
                  >
                    <IoTrashOutline size={20} />
                    Delete Video
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isAuthenticated) {
                        alert('Please login to report videos');
                        setShowMoreMenu(false);
                        return;
                      }
                      setShowReportModal(true);
                      setTimeout(() => setShowMoreMenu(false), 100);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isAuthenticated) {
                        alert('Please login to report videos');
                        setShowMoreMenu(false);
                        return;
                      }
                      setShowReportModal(true);
                      setTimeout(() => setShowMoreMenu(false), 100);
                    }}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/10 active:bg-white/20 transition-colors font-poppins text-sm flex items-center gap-3"
                  >
                    <IoFlagOutline size={20} />
                    Report
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {}
      {showCommentsModal && (
        <CommentsModal
          videoId={video.id}
          isOpen={showCommentsModal}
          onClose={() => setShowCommentsModal(false)}
        />
      )}

      {}
      {showReportModal && (
        <ReportModal
          videoId={video.id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeleteVideoModal
          videoId={video.id}
          videoTitle={video.title}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDeleteVideo}
        />
      )}

      {}
      {isActive && isPlaying && (
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-white/20 z-[50]">
          <motion.div
            className="h-full bg-white"
            initial={{ width: '0%' }}
            animate={{ width: `${videoProgress}%` }}
            transition={{ duration: 0.2, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
};

interface ReportModalProps {
  videoId: string;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ videoId, onClose }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportReasons = [
    'Spam',
    'Harassment',
    'Hate Speech',
    'Violence',
    'Nudity or Sexual Content',
    'False Information',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    try {
      setIsSubmitting(true);
      await interactionAPI.report(videoId, reason, details || undefined);
      alert('Report submitted successfully');
      onClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-app-gray rounded-lg p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-poppins font-semibold text-white text-lg">Report Video</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <IoClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="font-poppins text-sm text-gray-300 mb-2 block">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-gray-800 text-white font-poppins text-sm px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            >
              <option value="">Select a reason</option>
              {reportReasons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="font-poppins text-sm text-gray-300 mb-2 block">Additional details (optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide more information..."
              className="w-full bg-gray-800 text-white font-poppins text-sm px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-white/20 min-h-[100px] resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 text-white font-poppins py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || isSubmitting}
              className="flex-1 bg-red-500 text-white font-poppins py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default VideoPlayer;

