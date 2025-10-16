'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

NProgress.configure({
  minimum: 0.3,
  easing: 'ease',
  speed: 500,
  showSpinner: false,
  trickleSpeed: 200,
});

export default function LoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathnameRef = useRef(pathname);
  const prevSearchParamsRef = useRef(searchParams);
  const isFirstRender = useRef(true);

  useEffect(() => {

    const style = document.createElement('style');
    style.textContent = `
      #nprogress {
        pointer-events: none;
      }

      #nprogress .bar {
        background: #ffffff;
        position: fixed;
        z-index: 1031;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
      }

      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #ffffff, 0 0 5px #ffffff;
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {

    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPathnameRef.current = pathname;
      prevSearchParamsRef.current = searchParams;
      return;
    }

    if (pathname !== prevPathnameRef.current) {
      NProgress.start();

      const timer = setTimeout(() => {
        NProgress.done();
      }, 500);

      prevPathnameRef.current = pathname;
      prevSearchParamsRef.current = searchParams;

      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  return null;
}