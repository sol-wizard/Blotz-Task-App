"use client"

import { AnimatePresence, motion } from "motion/react"

export default function TaskExitAnimation({children, isVisible}) {
    

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={isVisible}  
                initial={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4 }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}