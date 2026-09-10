import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  fallbackSrc?: string;
}

const DEFAULT_CR_FALLBACK = 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80';

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  containerClassName = '',
  fallbackSrc = DEFAULT_CR_FALLBACK,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setIsLoaded(false);
  }, [src, fallbackSrc]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <div className={`relative overflow-hidden w-full h-full bg-[#051c14] ${containerClassName}`}>
      {/* Sleek Dark Emerald Skeleton Shimmer */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r from-[#07241a] via-[#0d3b2c] to-[#07241a] animate-pulse transition-opacity duration-500 z-10 ${
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />
      
      {/* Actual Image */}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (imgSrc !== fallbackSrc) {
            setImgSrc(fallbackSrc);
          }
          setIsLoaded(true);
        }}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...props}
      />
    </div>
  );
};

