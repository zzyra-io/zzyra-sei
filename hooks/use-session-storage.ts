"use client"

import { useState, useEffect } from "react"

export function useSessionStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    try {
      const item = window.sessionStorage.getItem(key)
      const value = item ? JSON.parse(item) : initialValue
      setStoredValue(value)
      setIsInitialized(true)
    } catch (error) {
      console.error("Error reading from sessionStorage:", error)
      setStoredValue(initialValue)
      setIsInitialized(true)
    }
  }, [key, initialValue])

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error("Error writing to sessionStorage:", error)
    }
  }

  return [storedValue, setValue, isInitialized] as const
}
