import React from 'react';

export function Empty({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
      <p className="text-base font-medium">{title}</p>
    </div>
  );
}
