import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, HomeIcon, Loader2 } from 'lucide-react';

interface PropertyImageProps {
  images: string[];
  propertyName: string;
  location?: string;
  className?: string;
}

const PropertyImage: React.FC<PropertyImageProps> = ({ images, propertyName, location, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? loadedImages.length - 1 : prevIndex - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prevIndex) => (prevIndex === loadedImages.length - 1 ? 0 : prevIndex + 1));
  };

  useEffect(() => {
    const loadImages = async () => {
      if (!images || images.length === 0) {
        // No images provided - try to fetch from Google Maps API
        if (propertyName) {
          setIsLoading(true);
          setError(null);
          
          try {
            const response = await fetch(`/api/map-images?ProjectName=${encodeURIComponent(propertyName)}&location=${encodeURIComponent(location || 'Hyderabad')}&count=3`);
            const data = await response.json();
            
            if (data.images && data.images.length > 0) {
              setLoadedImages(data.images);
            } else {
              setLoadedImages([]);
            }
          } catch (err) {
            console.error('Error fetching images:', err);
            setError('Failed to load images');
            setLoadedImages([]);
          } finally {
            setIsLoading(false);
          }
        } else {
          setLoadedImages([]);
        }
      } else {
        // Check if images need Google Maps API fallback
        const needsGoogleMaps = images.some(img => img === '__FETCH_FROM_GOOGLE_MAPS__');
        
        if (needsGoogleMaps) {
          setIsLoading(true);
          setError(null);
          
          try {
            const response = await fetch(`/api/map-images?ProjectName=${encodeURIComponent(propertyName)}&location=${encodeURIComponent(location || 'Hyderabad')}&count=3`);
            const data = await response.json();
            
            if (data.images && data.images.length > 0) {
              setLoadedImages(data.images);
            } else {
              setLoadedImages([]);
            }
          } catch (err) {
            console.error('Error fetching images:', err);
            setError('Failed to load images');
            setLoadedImages([]);
          } finally {
            setIsLoading(false);
          }
        } else {
          // Regular local images
          setLoadedImages(images);
        }
      }
    };

    loadImages();
  }, [images, propertyName, location]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !loadedImages || loadedImages.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <HomeIcon className="h-12 w-12 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <img src={loadedImages[currentIndex]} alt={`${propertyName} ${currentIndex + 1}`} className="w-full h-full object-cover" />
      
      {loadedImages.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1} / {loadedImages.length}
          </div>
        </>
      )}
    </div>
  );
};

export default PropertyImage; 