// import React from 'react';

// interface LoaderProps {
//   size?: 'sm' | 'md' | 'lg';
//   color?: 'primary' | 'white' | 'gray';
// }

// const Loader: React.FC<LoaderProps> = ({ size = 'md', color = 'primary' }) => {
//   const sizeClasses = {
//     sm: 'w-4 h-4',
//     md: 'w-8 h-8',
//     lg: 'w-12 h-12',
//   };

//   const colorClasses = {
//     primary: 'text-blue-600',
//     white: 'text-white',
//     gray: 'text-gray-400',
//   };

//   return (
//     <div className="flex items-center justify-center p-4">
//       <div
//         className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]`}
//         role="status"
//       >
//         <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
//           Loading...
//         </span>
//       </div>
//     </div>
//   );
// };

// export default Loader;

import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
}

const Loader: React.FC<LoaderProps> = ({ size = 'md', color = 'primary' }) => {
  const dimensions = { sm: 20, md: 32, lg: 48 };
  const px = dimensions[size];

  const palette = {
    primary: { dot: '#2563eb', trail: '#bfdbfe' },
    white:   { dot: '#ffffff', trail: 'rgba(255,255,255,0.25)' },
    gray:    { dot: '#9ca3af', trail: '#e5e7eb' },
  };

  const { dot, trail } = palette[color];
  const gap = px * 0.28;
  const dotSize = px * 0.22;

  return (
    <>
      <style>{`
        @keyframes loaderBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40%            { transform: scale(1);   opacity: 1;    }
        }
        .ld { animation: loaderBounce 1.1s ease-in-out infinite; }
        .ld:nth-child(1) { animation-delay: 0s; }
        .ld:nth-child(2) { animation-delay: 0.18s; }
        .ld:nth-child(3) { animation-delay: 0.36s; }
      `}</style>

      <div
        className="flex items-center justify-center p-4"
        role="status"
        aria-label="Loading"
      >
        <div className="flex items-center" style={{ gap }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="ld block rounded-full"
              style={{
                width: dotSize,
                height: dotSize,
                background: i === 1 ? dot : trail,
                boxShadow: i === 1 ? `0 0 0 2px ${dot}33` : 'none',
              }}
            />
          ))}
        </div>
        <span className="sr-only">Loading...</span>
      </div>
    </>
  );
};

export default Loader;