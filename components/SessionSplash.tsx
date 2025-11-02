import React from 'react';

interface SessionSplashProps {
  onRestore: () => void;
  onNew: () => void;
}

export const SessionSplash: React.FC<SessionSplashProps> = ({ onRestore, onNew }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-gray-200 p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
          Welcome Back!
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          We found a previously saved session. Would you like to restore it or start fresh?
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
          <button
            onClick={onRestore}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
          >
            Restore Previous Session
          </button>
          <button
            onClick={onNew}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-gray-700 text-white font-bold rounded-lg shadow-lg hover:bg-gray-600 transition-all duration-300 transform hover:scale-105"
          >
            Start a New Session
          </button>
        </div>
      </div>
    </div>
  );
};