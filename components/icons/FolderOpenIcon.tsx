import React from 'react';

export const FolderOpenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 0V6a2.25 2.25 0 012.25-2.25h3.879a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H18a2.25 2.25 0 012.25 2.25v.75M3.75 9.75A2.25 2.25 0 001.5 12v6.75a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25V12a2.25 2.25 0 00-2.25-2.25H3.75z" />
  </svg>
);
