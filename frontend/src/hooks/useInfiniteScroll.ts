"use client";

import { useEffect, useRef, type RefObject } from "react";

export const useInfiniteScroll = (
  onLoadMore: () => void,
  options?: IntersectionObserverInit,
): RefObject<HTMLDivElement> => {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onLoadMore();
      }
    }, options);

    observer.observe(target);

    return () => observer.disconnect();
  }, [onLoadMore, options]);

  return targetRef;
};
