import React from 'react';

const Loader = ({ 
  text = "Loading...",
  size = 20,
  color = '#3B82F6',
  speed = 1,
  thickness = 2.5,
  centered = false
}) => {
  // Calculate derived values
  const strokeDasharray = Math.PI * size * 0.6;
  const strokeDashoffset = strokeDasharray * 0.25;

  // Dynamic styles
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: color,
    fontWeight: '500',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    ...(centered && {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    })
  };

  const spinnerStyle = {
    animation: `rotate ${speed}s linear infinite`,
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: 0
  };

  const pathStyle = {
    stroke: 'currentColor',
    strokeWidth: thickness,
    strokeLinecap: 'round',
    strokeDasharray: strokeDasharray,
    strokeDashoffset: strokeDashoffset,
    animation: `dash ${speed * 1.5}s ease-in-out infinite`
  };

  const textStyle = {
    fontSize: `${size * 0.7}px`,
    lineHeight: 1
  };

  const keyframes = `
    @keyframes rotate {
      100% { transform: rotate(360deg); }
    }
    @keyframes dash {
      0% {
        stroke-dashoffset: ${strokeDasharray};
      }
      50% {
        stroke-dashoffset: ${strokeDasharray * 0.25};
        transform: rotate(45deg);
      }
      100% {
        stroke-dashoffset: ${strokeDasharray};
        transform: rotate(360deg);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div style={containerStyle}>
        <svg 
          style={spinnerStyle} 
          viewBox={`0 0 ${size} ${size}`} 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle 
            cx={size/2} 
            cy={size/2} 
            r={size/2 - thickness} 
            stroke="currentColor" 
            strokeOpacity="0.2" 
            strokeWidth={thickness} 
          />
          <path 
            d={`M ${size/2} ${thickness/2} A ${size/2 - thickness/2} ${size/2 - thickness/2} 0 1 1 ${thickness/2} ${size/2}`}
            style={pathStyle}
          />
        </svg>
        <span style={textStyle}>{text}</span>
      </div>
    </>
  );
};

export default Loader;