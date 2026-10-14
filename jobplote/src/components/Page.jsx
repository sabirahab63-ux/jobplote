import { motion } from "framer-motion";

export default function Page({
  children,
  className = "",
}) {
  return (
    <main
      className={`min-h-[calc(100vh-65px)] px-4 py-8 sm:px-6 lg:px-8 ${className}`}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.45,
          ease: "easeOut",
        }}
        className="mx-auto w-full max-w-7xl"
      >
        {children}
      </motion.div>
    </main>
  );
}