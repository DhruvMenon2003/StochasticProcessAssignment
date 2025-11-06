import React from 'react';

export const ChartLineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        {...props}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5h16.5m-16.5-6.375h16.5m-16.5-6.375h16.5m-16.5-6.375h16.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v18M20.25 3v18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12l6-3.75 6 3.75" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 12v5.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12v-1.5" />
    </svg>
);
