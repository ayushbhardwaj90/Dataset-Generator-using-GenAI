import { useAuth } from '../../context/AuthContext';

export const GettingStarted = () => {
  const { user } = useAuth();
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-gray-800 dark:text-gray-200">
      <h2 className="text-3xl font-bold mb-6 text-purple-600 dark:text-purple-400 text-center">
        Welcome to the Synthetic Dataset Generator!
      </h2>

      <p className="mb-4 text-lg">
        Hello {user?.username || 'Guest'}! This application leverages the power of Generative AI (specifically the Gemini API) to create realistic, synthetic datasets tailored to your needs.
      </p>

      <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">What can you do?</h3>
      <ul className="list-disc list-inside space-y-2 mb-6">
        <li><span className="font-medium">Generate Data by Domain:</span> Choose from predefined domains like E-commerce, Healthcare, Finance, Marketing, and HR to quickly get relevant datasets.</li>
        <li><span className="font-medium">Custom Prompts:</span> Use the "Custom" domain option to provide a free-form text prompt and let the AI generate data based on your specific description.</li>
        <li><span className="font-medium">Granular Control:</span> Apply constraints (e.g., percentage distribution, exact values, numerical ranges) to guide the AI in generating data that meets specific criteria.</li>
        <li><span className="font-medium">Multi-Table Relational Synthesis:</span> Define multiple tables with columns and foreign-key relationships to generate complex, interconnected datasets.</li>
        <li><span className="font-medium">Data Augmentation & Bias Correction:</span> (Coming Soon!) Rebalance or augment existing datasets to correct biases or achieve desired distributions.</li>
        <li><span className="font-medium">Export Options:</span> Download your generated data in JSON, CSV, or Excel formats.</li>
        <li><span className="font-medium">Generation History:</span> Keep track of all your past generation requests.</li>
      </ul>

      <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">How to use it:</h3>
      <ol className="list-decimal list-inside space-y-2 mb-6">
        <li><span className="font-medium">Login/Register:</span> If you haven't already, register for an account and log in. This ties your generation history to your user profile.</li>
        <li><span className="font-medium">Generate Tab:</span> Navigate to the "Generate" tab.</li>
        <li><span className="font-medium">Select Mode:</span> Choose between "Single Table" or "Relational" generation.</li>
        <li><span className="font-medium">Define Generation:</span>
            <ul className="list-disc list-inside ml-4 mt-1">
                <li>For Single Table: Select a Domain, Number of Rows, and optionally add Granular Constraints.</li>
                <li>For Relational: Define your tables, columns (including PK/FK), and number of rows for each. Optionally add Global Constraints.</li>
            </ul>
        </li>
        <li><span className="font-medium">Generate:</span> Click the appropriate "Generate Data" button. Your data will appear below, and be added to your history.</li>
        <li><span className="font-medium">Explore History:</span> Visit the "History" tab to view past generations and load previous results.</li>
      </ol>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
        This application is continuously evolving. Stay tuned for more features!
      </p>
    </div>
  );
};