import React from 'react';

export function Error({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-destructive text-center">
      <p className="text-base font-medium">{message}</p>
    </div>
  );
}
