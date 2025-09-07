import { LogIn, UserPlus } from 'lucide-react';

export const LandingPage = ({ onViewChange }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold text-gray-800 dark:text-white mb-4">
          Synthetic Dataset Generator
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Seamlessly create high-quality, realistic datasets for your projects using the power of Generative AI. Whether you need a simple list or a complex relational database, we've got you covered.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-left">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">Pre-defined Domains</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Generate data for common domains like E-commerce, Healthcare, and Finance with a single click.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">Custom Prompts</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Use natural language to describe exactly what kind of data you need, and our AI will create it for you.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">Relational Data</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Define multiple tables with foreign key relationships and let the AI generate a complete, connected dataset.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => onViewChange('register')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
          >
            <UserPlus size={20} className="mr-2" /> Sign Up for Free
          </button>
          <button
            onClick={() => onViewChange('login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
          >
            <LogIn size={20} className="mr-2" /> Log In
          </button>
        </div>
      </div>
    </div>
  );
};