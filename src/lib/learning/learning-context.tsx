"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface LearningContextType {
  learningMode: boolean
  toggleLearningMode: () => void
}

const LearningContext = createContext<LearningContextType>({
  learningMode: false,
  toggleLearningMode: () => {},
})

export function LearningProvider({ children }: { children: ReactNode }) {
  const [learningMode, setLearningMode] = useState(false)

  return (
    <LearningContext.Provider value={{
      learningMode,
      toggleLearningMode: () => setLearningMode(!learningMode)
    }}>
      {children}
    </LearningContext.Provider>
  )
}

export const useLearning = () => useContext(LearningContext)
