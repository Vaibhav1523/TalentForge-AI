'use client';

import { createContext, useContext, ReactNode } from 'react';

const RecruiterBasePathContext = createContext<string>('/');

export function RecruiterBasePathProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <RecruiterBasePathContext.Provider value={value}>
      {children}
    </RecruiterBasePathContext.Provider>
  );
}

export function useRecruiterBasePath(): string {
  return useContext(RecruiterBasePathContext);
}
