import { motion } from 'framer-motion';
import { LogIn, UserPlus } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';
import { AnimatedCard } from '../AnimatedCard';

export const LandingPage = ({ onViewChange }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-8">
      <div className="text-center max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 animate-pulse"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
        >
          Data Genie
        </motion.h1>
        <TypeAnimation
          sequence={[
            'Generate realistic datasets',
            2000,
            'Power your AI projects',
            2000,
            'Create complex relational data',
            2000,
          ]}
          wrapper="span"
          speed={50}
          className="text-xl text-gray-300 mb-8 block"
          repeat={Infinity}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-left">
          <AnimatedCard delay={0}>
            <h3 className="text-2xl font-bold text-purple-400 mb-2">Pre-defined Domains</h3>
            <p className="text-gray-300">
              Generate data for common domains like E-commerce, Healthcare, and Finance with a single click.
            </p>
          </AnimatedCard>
          <AnimatedCard delay={0.2}>
            <h3 className="text-2xl font-bold text-purple-400 mb-2">Custom Prompts</h3>
            <p className="text-gray-300">
              Use natural language to describe exactly what kind of data you need, and our AI will create it for you.
            </p>
          </AnimatedCard>
          <AnimatedCard delay={0.4}>
            <h3 className="text-2xl font-bold text-purple-400 mb-2">Relational Data</h3>
            <p className="text-gray-300">
              Define multiple tables with foreign key relationships and let the AI generate a complete, connected dataset.
            </p>
          </AnimatedCard>
        </div>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => onViewChange('register')}
            className="button-primary bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 flex items-center justify-center"
          >
            <UserPlus size={20} className="mr-2" /> Sign Up for Free
          </button>
          <button
            onClick={() => onViewChange('login')}
            className="button-primary bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 flex items-center justify-center"
          >
            <LogIn size={20} className="mr-2" /> Log In
          </button>
        </div>
      </div>
    </div>
  );
};