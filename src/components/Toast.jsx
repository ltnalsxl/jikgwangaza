import React from 'react';

const Toast = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50">
      {message}
    </div>
  );
};

export default Toast;
