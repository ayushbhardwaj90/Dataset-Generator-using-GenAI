import { motion } from 'framer-motion';
import { LogIn, UserPlus } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';
import { AnimatedCard } from '../AnimatedCard';
import LiquidEther from '../backgrounds/LiquidEther';

export const LandingPage = ({ onViewChange }) => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      {/* LiquidEther Background Layer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0
      }}>
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* Content Layer */}
      <div className="flex flex-col items-center justify-center min-h-screen text-white p-8" style={{ position: 'relative', zIndex: 1 }}>
        <div className="text-center max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600"
            style={{ 
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              filter: 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.5))'
            }}
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
            className="text-xl text-gray-100 mb-8 block"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            repeat={Infinity}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-left">
            <AnimatedCard delay={0}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                height: '100%'
              }}>
                <h3 className="text-2xl font-bold text-purple-300 mb-2">Pre-defined Domains</h3>
                <p className="text-gray-100">
                  Generate data for common domains like E-commerce, Healthcare, and Finance with a single click.
                </p>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.2}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                height: '100%'
              }}>
                <h3 className="text-2xl font-bold text-purple-300 mb-2">Custom Prompts</h3>
                <p className="text-gray-100">
                  Use natural language to describe exactly what kind of data you need, and our AI will create it for you.
                </p>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.4}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                height: '100%'
              }}>
                <h3 className="text-2xl font-bold text-purple-300 mb-2">Relational Data</h3>
                <p className="text-gray-100">
                  Define multiple tables with foreign key relationships and let the AI generate a complete, connected dataset.
                </p>
              </div>
            </AnimatedCard>
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <motion.button
              onClick={() => onViewChange('register')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
              }}
            >
              <UserPlus size={20} className="mr-2" /> Sign Up for Free
            </motion.button>

            <motion.button
              onClick={() => onViewChange('login')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
              }}
            >
              <LogIn size={20} className="mr-2" /> Log In
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
