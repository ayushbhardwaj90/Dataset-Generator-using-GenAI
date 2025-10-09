import { motion } from 'framer-motion';

export const AnimatedCard = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="p-6 rounded-lg backdrop-filter backdrop-blur-lg bg-white/5 border border-white/10 shadow-lg"
    >
      {children}
    </motion.div>
  );
};
