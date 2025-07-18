import { motion } from 'framer-motion';

export default function RelaiLoader({ 
  size = 'default',
  fullScreen = false,
  message = ''
}: { 
  size?: 'small' | 'default' | 'large',
  fullScreen?: boolean,
  message?: string
}) {
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const dotSizes = {
    small: 'w-2 h-2',
    default: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-6">
        {/* Main loader animation */}
        <div className="relative">
          {/* Rotating outer ring */}
          <motion.div
            className={`${sizeClasses[size]} relative`}
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600" />
          </motion.div>

          {/* Center dot pulsing */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className={`${dotSizes[size]} bg-blue-600 rounded-full`} />
          </motion.div>
        </div>

        {/* Three dots animation below */}
        <div className="flex space-x-2">
          {[0, 0.2, 0.4].map((delay, index) => (
            <motion.div
              key={index}
              className={`${dotSizes[size]} bg-blue-600 rounded-full`}
              animate={{
                y: [0, -10, 0],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Loading text */}
        {(message || size !== 'small') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-blue-900 font-medium">
              {message || 'Loading...'}
            </p>
            {size !== 'small' && !message && (
              <p className="text-sm text-gray-500 mt-1">
                Finding your perfect property
              </p>
            )}
          </motion.div>
        )}

        {/* Brand name for large loader */}
        {size === 'large' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl font-bold text-blue-600"
          >
            Relai
          </motion.div>
        )}
      </div>
    </div>
  );
}