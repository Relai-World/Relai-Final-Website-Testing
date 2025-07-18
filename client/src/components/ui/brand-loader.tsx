import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BrandLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function BrandLoader({ size = "md", text, className }: BrandLoaderProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-20 h-20", 
    lg: "w-24 h-24"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      {/* City Scanning Loader */}
      <div className={cn("relative overflow-hidden rounded-full", sizeClasses[size])}>
        {/* Outer circular boundary */}
        <div className={cn(
          "absolute inset-0 rounded-full border-2 border-[#1752FF]/20",
          sizeClasses[size]
        )} />
        
        {/* City skyline spread across the circle */}
        <div className="absolute inset-0 flex items-end justify-center">
          {/* Building array creating a skyline */}
          {[
            { width: "w-2", height: size === "sm" ? "35px" : size === "md" ? "42px" : "50px", opacity: 0.7 },
            { width: "w-1.5", height: size === "sm" ? "20px" : size === "md" ? "24px" : "28px", opacity: 0.8 },
            { width: "w-2.5", height: size === "sm" ? "45px" : size === "md" ? "52px" : "60px", opacity: 0.9 },
            { width: "w-2", height: size === "sm" ? "30px" : size === "md" ? "36px" : "42px", opacity: 0.7 },
            { width: "w-1.5", height: size === "sm" ? "25px" : size === "md" ? "30px" : "35px", opacity: 0.6 },
            { width: "w-2", height: size === "sm" ? "40px" : size === "md" ? "48px" : "55px", opacity: 0.8 },
            { width: "w-1.5", height: size === "sm" ? "18px" : size === "md" ? "22px" : "26px", opacity: 0.7 },
          ].map((building, index) => (
            <motion.div
              key={index}
              className={cn(
                building.width,
                "bg-gradient-to-t from-[#1752FF] to-[#1752FF]/60 rounded-t-sm mx-0.5 relative"
              )}
              style={{ height: building.height }}
              animate={{
                opacity: [building.opacity * 0.4, building.opacity, building.opacity * 0.4],
                height: [
                  parseInt(building.height) * 0.9 + "px",
                  building.height,
                  parseInt(building.height) * 0.9 + "px"
                ]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.3
              }}
            >
              {/* Building windows */}
              <div className="absolute inset-0 p-0.5 pt-1">
                <div className="grid grid-cols-1 gap-0.5 h-full">
                  {[...Array(Math.floor(parseInt(building.height) / 8))].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 h-0.5 bg-white/60 rounded-[1px] mx-auto"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: (index * 0.2) + (i * 0.1)
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Radar scanning beam - sweeping across the city */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          {/* Main scanning beam */}
          <div className="absolute top-1/2 left-1/2 w-0.5 h-1/2 bg-gradient-to-t from-[#1752FF] to-transparent transform -translate-x-1/2 origin-bottom" />
          
          {/* Secondary beam for wider coverage */}
          <div className="absolute top-1/2 left-1/2 w-1 h-1/2 bg-gradient-to-t from-[#1752FF]/40 to-transparent transform -translate-x-1/2 origin-bottom" />
          
          {/* Scanning trail effect */}
          <div className="absolute top-1/2 left-1/2 w-3 h-1/2 bg-gradient-to-t from-[#1752FF]/20 to-transparent transform -translate-x-1/2 origin-bottom" />
        </motion.div>
        
        {/* Pulsing property markers that get "discovered" */}
        {[30, 60, 120, 150, 210, 240, 300, 330].map((angle, index) => (
          <motion.div
            key={index}
            className="absolute w-1 h-1 bg-[#1752FF] rounded-full"
            style={{
              top: "50%",
              left: "50%",
              transformOrigin: "0 0",
              transform: `rotate(${angle}deg) translate(${size === "sm" ? "25px" : size === "md" ? "32px" : "40px"}, -50%)`
            }}
            animate={{
              scale: [0, 1.5, 0.8],
              opacity: [0, 1, 0.6]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: (angle / 360) * 3 // Sync with radar sweep
            }}
          />
        ))}
        
        {/* Central radar station */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Radar dish icon */}
          <motion.div
            className="w-3 h-3 mb-1"
            animate={{ 
              scale: [1, 1.1, 1],
              rotateY: [0, 360]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" className="text-[#1752FF]" />
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1" className="text-[#1752FF]/40" />
              <circle cx="12" cy="12" r="12" stroke="currentColor" strokeWidth="0.5" className="text-[#1752FF]/20" />
            </svg>
          </motion.div>
          
          {/* Relai text */}
          <motion.div
            className="font-manrope font-bold text-[#1752FF] text-xs tracking-wider"
            animate={{ 
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            RELAI
          </motion.div>
        </div>
        
        {/* Scanning progress ring */}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-transparent",
            sizeClasses[size]
          )}
          style={{
            background: `conic-gradient(from 0deg, #1752FF 0deg, #1752FF 60deg, transparent 60deg, transparent 360deg)`
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Outer scanning waves */}
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full border border-[#1752FF]/30",
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full border border-[#1752FF]/20",
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0, 0.2]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>
      
      {/* Loading text with scanning theme */}
      {text && (
        <motion.div
          className={cn(
            "text-gray-600 font-medium font-manrope text-center",
            textSizeClasses[size]
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {text}
          </motion.span>
          <motion.span
            className="ml-1"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            ...
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}

// Skeleton loader with brand colors
export function BrandSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
      style={{
        animation: "pulse 2s ease-in-out infinite, shimmer 2s ease-in-out infinite"
      }}
      {...props}
    />
  );
}

// Property card skeleton
export function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <BrandSkeleton className="w-full h-48" />
      <div className="p-4 space-y-3">
        <BrandSkeleton className="h-6 w-3/4" />
        <BrandSkeleton className="h-4 w-1/2" />
        <div className="flex justify-between">
          <BrandSkeleton className="h-4 w-1/3" />
          <BrandSkeleton className="h-4 w-1/4" />
        </div>
        <BrandSkeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

// Full page loader
export function FullPageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
      <BrandLoader size="lg" text={text} />
    </div>
  );
}