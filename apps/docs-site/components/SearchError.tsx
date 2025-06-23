"use client";
import { AlertTriangle } from "lucide-react";

export function SearchError() {
  return (
    <div className='flex items-center justify-center py-8'>
      <div className='text-center'>
        <AlertTriangle className='w-8 h-8 text-error mx-auto mb-3' />
        <p className='text-text-secondary text-sm'>
          Search is temporarily unavailable
        </p>
        <p className='text-text-tertiary text-xs mt-1'>
          Please try again later
        </p>
      </div>
    </div>
  );
}

export default SearchError;
