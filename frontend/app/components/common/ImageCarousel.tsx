import { useState, useRef, useEffect } from "react";

interface ImageCarouselProps {
    images: string[];
    alt: string;
    className?: string;
    onImageClick?: (index: number) => void;
    showArrowsOnHover?: boolean;
}

export default function ImageCarousel({
    images,
    alt,
    className = "",
    onImageClick,
    showArrowsOnHover = true,
}: ImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isHovered && images.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
            }, 1250);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isHovered, images.length]);

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    };

    const prevSlide = () => {
        setCurrentIndex(
            (prevIndex) => (prevIndex - 1 + images.length) % images.length,
        );
    };

    if (!images || images.length === 0) {
        return (
            <div
                className={`w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center ${className}`}
            >
                <span className="text-gray-500">Sin imagen</span>
            </div>
        );
    }

    return (
        <div
            className={`relative w-full h-48 overflow-hidden rounded-lg ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main image */}
            <div
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {images.map((image, index) => (
                    <img
                        key={index}
                        src={image}
                        alt={`${alt} ${index + 1}`}
                        className={`w-full h-full object-cover flex-shrink-0 ${onImageClick ? "cursor-pointer" : ""}`}
                        onClick={() => onImageClick?.(index)}
                    />
                ))}
            </div>

            {/* Navigation arrows (only show on hover) */}
            {images.length > 1 && isHovered && showArrowsOnHover && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                    >
                        ‹
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                    >
                        ›
                    </button>
                </>
            )}

            {/* Dots indicator */}
            {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`w-2 h-2 rounded-full transition-all ${
                                index === currentIndex
                                    ? "bg-white"
                                    : "bg-white/50 hover:bg-opacity-75"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
