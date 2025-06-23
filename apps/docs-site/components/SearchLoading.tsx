"use client";
import { Search } from "lucide-react";

export function SearchLoading() {
  return (
    <div className='flex items-center justify-center py-8'>
      <div className='flex items-center gap-3 text-text-secondary'>
        <Search className='w-5 h-5 animate-pulse' />
        <span className='text-sm'>Searching...</span>
      </div>
    </div>
  );
}

export default SearchLoading;
