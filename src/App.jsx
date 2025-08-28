import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowRight, X, Settings, Target, BarChart2, FileText, Download, User, UploadCloud, AlertTriangle, Sun, Moon, Plus, Minus, Loader2, Camera, Type, Sparkles, Trash2 } from 'lucide-react';

// --- CONFIGURATION ---
const API_BASE_URL = 'http://127.0.0.1:8000'; // Adjust if your backend runs elsewhere

// --- API HELPER FUNCTIONS ---
// This object centralizes all communication with your FastAPI backend.
const api = {
  async getDailyTip() {
    const response = await fetch(`${API_BASE_URL}/get_daily_tip`);
    if (!response.ok) throw new Error('Failed to fetch daily tip.');
    return response.json();
  },
  async analyzeImage(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const response = await fetch(`${API_BASE_URL}/analyze_image`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Image analysis failed.');
    return response.json();
  },
  async getSuggestions(foodName) {
    const response = await fetch(`${API_BASE_URL}/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_name: foodName }),
    });
    if (!response.ok) throw new Error('Failed to fetch suggestions.');
    return response.json();
  },
  async logMeal(mealData) {
    const response = await fetch(`${API_BASE_URL}/log_meal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mealData),
    });
    if (!response.ok) throw new Error('Failed to log meal.');
    return response.json();
  },
  async getMealHistory() {
    const response = await fetch(`${API_BASE_URL}/get_meal_history`);
    if (!response.ok) throw new Error('Failed to fetch meal history.');
    return response.json();
  },
  async getAiSummary(prompt) {
    const response = await fetch(`${API_BASE_URL}/get_ai_summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('Failed to get AI summary.');
    return response.json();
  },
  async exportHistory() {
      const response = await fetch(`${API_BASE_URL}/export_history`);
      if (!response.ok) throw new Error('Failed to export history.');
      return response.blob();
  }
};


// --- MAIN APP & COMPONENTS ---
function Preloader({ status }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-100 dark:bg-black z-[100]">
            <div className="text-center">
                <h1 className="text-5xl font-extrabold text-emerald-500 animate-pulse">NutriGuide</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-4">{status}</p>
            </div>
        </div>
    );
}

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('nutriguide_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch { return null; }
  });
  const [theme, setTheme] = useState(() => {
      return localStorage.getItem('nutriguide_theme') || 'dark';
  });
  const [page, setPage] = useState(user ? 'main' : 'register');
  const [appError, setAppError] = useState(null);

  useEffect(() => {
      // Simulate app initialization
      setTimeout(() => setIsInitializing(false), 1500);
  }, []);

  useEffect(() => {
    if (user) {
        localStorage.setItem('nutriguide_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('nutriguide_user');
    }
  }, [user]);

  // This useEffect hook is the key to the dark/light mode functionality.
  // It runs whenever the `theme` state changes.
  useEffect(() => {
    const root = document.documentElement; // This is the <html> element
    
    // 1. Save the user's preference in local storage for persistence.
    localStorage.setItem('nutriguide_theme', theme);
    
    // 2. Update the class on the <html> element.
    // Tailwind CSS's dark mode strategy looks for this `dark` class on a parent element.
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]); // The effect re-runs only when the `theme` state changes.


  const calculateBmi = (w, h) => !w || !h ? 0 : (w / ((h / 100) ** 2)).toFixed(1);
  
  const handleRegister = (ud) => {
      const userWithBmi = { ...ud, bmi: calculateBmi(ud.weight, ud.height) };
      setUser(userWithBmi);
      setPage('main');
  };
  
  const handleUpdateUser = (ud) => {
      const updatedUser = { ...user, ...ud, bmi: calculateBmi(ud.weight, ud.height) };
      setUser(updatedUser);
      setPage('main');
  };

  const handleResetApp = () => {
      localStorage.clear();
      window.location.reload();
  };

  const renderPage = () => {
    switch (page) {
      case 'register': return <RegistrationScreen onRegister={handleRegister} />;
      case 'main': return <MainScreen user={user} />;
      case 'settings': return <SettingsScreen user={user} onUpdate={handleUpdateUser} theme={theme} setTheme={setTheme} onReset={handleResetApp} />;
      case 'goals': return <DailyGoalsScreen user={user} setUser={setUser} setPage={setPage}/>;
      case 'dashboard': return <DashboardScreen theme={theme} />;
      case 'history': return <MealHistoryScreen />;
      default: return <RegistrationScreen onRegister={handleRegister} />;
    }
  };

  if (isInitializing) {
      return <Preloader status="Loading Your Guide..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-lg h-[98vh] sm:h-[95vh] bg-white dark:bg-black text-gray-900 dark:text-gray-100 shadow-2xl shadow-emerald-900/20 rounded-3xl flex flex-col">
        {appError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11/12 bg-red-800/90 p-3 rounded-lg text-center z-50 flex items-center justify-center gap-2 text-white text-sm animate-fade-in">
                <AlertTriangle size={18} /> {appError}
            </div>
        )}
        <div className="flex-grow overflow-y-auto p-6 sm:p-8">{renderPage()}</div>
        {user && <BottomNavBar page={page} setPage={setPage} />}
      </div>
    </div>
  );
}

function RegistrationScreen({ onRegister }) {
  const [formData, setFormData] = useState({ name: '', age: '', weight: '', height: '' });
  
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    onRegister(formData); 
  };

  return (
    <div className="flex flex-col justify-center h-full animate-fade-in">
      <h1 className="text-4xl font-bold text-emerald-500 mb-1">Welcome to</h1>
      <h2 className="text-6xl font-extrabold text-gray-800 dark:text-white mb-10">NutriGuide</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="text" name="name" placeholder="Name" onChange={handleChange} required />
        <div className="flex gap-4">
          <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors w-1/2" type="number" name="age" placeholder="Age" onChange={handleChange} required />
          <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors w-1/2" type="number" name="weight" placeholder="Weight (kg)" onChange={handleChange} required />
        </div>
        <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="number" name="height" placeholder="Height (cm)" onChange={handleChange} required />
        <button type="submit" className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 mt-3">
            Get Started <ArrowRight size={20} />
        </button>
      </form>
    </div>
  );
}

function MainScreen({ user }) {
  const [dailyTip, setDailyTip] = useState('Loading your daily tip...');
  const [dailyProgress, setDailyProgress] = useState({ current: 0, goal: user.goals?.calories || 2000 });
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isQuickCheck, setIsQuickCheck] = useState(false);
  
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [imageGuess, setImageGuess] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  const fileInputRef = useRef(null);

  const fetchDailyProgress = async () => {
    try {
        const history = await api.getMealHistory();
        const todayStr = new Date().toISOString().split('T')[0];
        const todayCalories = history
          .filter(meal => meal.timestamp.startsWith(todayStr))
          .reduce((sum, meal) => sum + (meal.total_calories || 0), 0);
        setDailyProgress({ current: todayCalories, goal: user.goals?.calories || 2000 });
    } catch(e) { console.error("Could not fetch daily progress", e); }
  };

  useEffect(() => { 
    api.getDailyTip().then(d => setDailyTip(d.tip)).catch(e => setDailyTip("Could not load a tip. Stay healthy!"));
    fetchDailyProgress();
  }, [user.goals]);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImage(URL.createObjectURL(file));
      setAnalysisResult(null);
      setError(null);
    }
  };
  
  const clearImage = () => {
      setImage(null);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleStartAnalysis = async () => {
    if (!imageFile && !prompt) {
        setError("Please upload an image or describe your meal.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const foodNameToAnalyze = imageFile ? (await api.analyzeImage(imageFile)).food_name : prompt;
      setImageGuess(foodNameToAnalyze);
      const suggestionResult = await api.getSuggestions(foodNameToAnalyze);
      setSuggestions(suggestionResult.suggestions);
      setShowConfirmationModal(true);
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogFinalMeal = async (mealItems) => {
      if (mealItems.length === 0) {
        setShowConfirmationModal(false);
        return;
      }
      setIsLoading(true);
      setShowConfirmationModal(false);
      try {
          const result = await api.logMeal({
              user_profile: {},
              quick_check: isQuickCheck,
              meal_items: mealItems,
              image_food_name: imageGuess || "Your Meal"
          });
          setAnalysisResult(result);
          if (!isQuickCheck) fetchDailyProgress();
          clearImage();
          setPrompt('');
      } catch (e) {
          setError(e.message);
      } finally {
          setIsLoading(false);
      }
  };

  const progressPercent = dailyProgress.goal > 0 ? (dailyProgress.current / dailyProgress.goal) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-lg text-gray-500 dark:text-gray-400">Hello,</p>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{user.name}</h2>
        </div>
        <div className="text-right">
            <p className="text-lg text-gray-500 dark:text-gray-400">BMI</p>
            <p className="text-3xl font-bold text-emerald-500">{user.bmi}</p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-black/30 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-2 text-gray-500 dark:text-gray-400">
              <h3 className="font-semibold text-emerald-500">Today's Calories</h3>
              <span>{Math.round(dailyProgress.current)} / {dailyProgress.goal || 'N/A'} kcal</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
          </div>
      </div>

      <div className="bg-white dark:bg-black/30 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-emerald-500 mb-2">💡 Daily Tip</h3>
        <p className="text-gray-600 dark:text-gray-300">{dailyTip}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-center text-gray-800 dark:text-white">Log Your Meal</h3>
        <div className="bg-white dark:bg-black/30 p-5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="relative">
                <textarea className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors h-24 resize-none pr-12" placeholder="Describe your meal... (e.g., 'A bowl of oatmeal with berries')" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                <Type className="absolute top-3 right-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-4">
                <hr className="flex-grow border-gray-200 dark:border-gray-700" />
                <span className="text-gray-400 text-sm">OR</span>
                <hr className="flex-grow border-gray-200 dark:border-gray-700" />
            </div>
          
            {image ? (
                <div className="relative animate-scale-in">
                    <img src={image} alt="Uploaded food" className="rounded-lg w-full h-auto max-h-60 object-cover" />
                    <button onClick={clearImage} className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"><X size={18} /></button>
                </div>
            ) : (
                <button onClick={() => fileInputRef.current.click()} className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 w-full"><Camera size={20}/> Upload Photo</button>
            )}
            <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
          
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400 pt-2">
            <input type="checkbox" id="quick-check" checked={isQuickCheck} onChange={(e) => setIsQuickCheck(e.target.checked)} className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-emerald-500 focus:ring-emerald-500" />
            <label htmlFor="quick-check">Quick Check (Don't save to history)</label>
          </div>
          <button onClick={handleStartAnalysis} disabled={isLoading} className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 w-full text-lg py-4">
            {isLoading ? <Loader2 className="animate-spin" /> : <><Sparkles size={20}/> Analyze Meal</>}
          </button>
        </div>
      </div>
      
      {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 animate-fade-in-up"><strong>Error:</strong> {error}</div>}
      
      {analysisResult && (
        <div className="relative p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg animate-fade-in-up space-y-4">
          <button onClick={() => setAnalysisResult(null)} className="absolute top-2 right-2 bg-white/10 dark:bg-gray-800/50 rounded-full p-1 text-gray-500 dark:text-gray-400"><X size={16} /></button>
          <div>
            <h3 className="text-xl font-bold text-emerald-500 mb-3">{analysisResult.food_name}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm border-t border-emerald-500/20 pt-4">
              <p className="text-gray-600 dark:text-gray-300"><strong>Calories:</strong> {analysisResult.total_calories?.toFixed(0)} kcal</p>
              <p className="text-gray-600 dark:text-gray-300"><strong>Protein:</strong> {analysisResult.total_protein?.toFixed(1)} g</p>
              <p className="text-gray-600 dark:text-gray-300"><strong>Fat:</strong> {analysisResult.total_fat?.toFixed(1)} g</p>
              <p className="text-gray-600 dark:text-gray-300"><strong>Carbs:</strong> {analysisResult.total_carbs?.toFixed(1)} g</p>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-4"><strong>AI Advice:</strong> {analysisResult.advice}</p>
          </div>
        </div>
      )}
      
      {showConfirmationModal && (
          <SuggestionModal 
            imageGuess={imageGuess}
            suggestions={suggestions}
            onConfirm={handleLogFinalMeal}
            onClose={() => setShowConfirmationModal(false)}
          />
      )}
    </div>
  );
}

function SettingsScreen({ user, onUpdate, theme, setTheme, onReset }) {
  const [formData, setFormData] = useState(user);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onUpdate(formData); };
  
  const FormRow = ({label, children}) => (
    <div>
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        {children}
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Settings</h2>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
        </button>
      </div>
      <div className="bg-white dark:bg-black/30 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-semibold text-emerald-500 mb-2">Your Details</h3>
            <FormRow label="Name">
                <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="text" name="name" value={formData.name} placeholder="Name" onChange={handleChange} required />
            </FormRow>
            <div className="grid grid-cols-2 gap-4">
                <FormRow label="Age"><input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="number" name="age" value={formData.age} placeholder="Age" onChange={handleChange} required /></FormRow>
                <FormRow label="Weight (kg)"><input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="number" name="weight" value={formData.weight} placeholder="Weight (kg)" onChange={handleChange} required /></FormRow>
            </div>
            <FormRow label="Height (cm)">
                <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="number" name="height" value={formData.height} placeholder="Height (cm)" onChange={handleChange} required />
            </FormRow>
            <FormRow label="Medications (optional)">
                <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="text" name="medications" value={formData.medications || ''} placeholder="e.g., Vitamin D" onChange={handleChange} />
            </FormRow>
            <FormRow label="Allergies (optional)">
                <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="text" name="allergies" value={formData.allergies || ''} placeholder="e.g., Peanuts" onChange={handleChange} />
            </FormRow>
            <button type="submit" className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 w-full mt-2">Update Details</button>
        </form>
      </div>
       <div className="bg-red-500/10 p-5 rounded-xl border border-red-500/20">
        <h3 className="font-semibold text-red-500 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-400 mb-4">This will permanently delete all your data, including your profile and meal history.</p>
        <button onClick={onReset} className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 w-full">
            <Trash2 size={18} /> Reset App
        </button>
      </div>
    </div>
  );
}

function DailyGoalsScreen({ user, setUser, setPage }) {
  const [goals, setGoals] = useState(user.goals || { calories: '', protein: '' });
  const handleChange = (e) => setGoals({ ...goals, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); setUser(p => ({ ...p, goals })); setPage('main'); };

  return (
    <div className="animate-fade-in space-y-6 pb-24">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Daily Goals</h2>
      <div className="bg-white dark:bg-black/30 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Target Calories (kcal)</label>
                <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="number" name="calories" value={goals.calories} placeholder="e.g., 2000" onChange={handleChange} required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Target Protein (g)</label>
                <input className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors" type="number" name="protein" value={goals.protein} placeholder="e.g., 120" onChange={handleChange} required />
            </div>
            <button type="submit" className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 w-full mt-2">Set Goals</button>
        </form>
      </div>
    </div>
  );
}

function DashboardScreen({ theme }) {
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    
    useEffect(() => { api.getMealHistory().then(data => setHistory(data)).catch(console.error); }, []);

    const handleSummarize = async () => {
        setIsSummarizing(true); setSummary('');
        try {
            const res = await api.getAiSummary("Provide a detailed summary of my weekly report.");
            setSummary(res.answer);
        } catch (error) { setSummary("Could not generate summary. " + error.message); } 
        finally { setIsSummarizing(false); }
    };

    const handleExport = async () => {
        try {
            const csvBlob = await api.exportHistory();
            const link = document.createElement("a");
            const url = URL.createObjectURL(csvBlob);
            link.setAttribute("href", url); link.setAttribute("download", "nutriguide_history.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) { alert("Failed to export data: " + error.message); }
    };

    const chartData = useMemo(() => {
        if (!history || history.length === 0) return [];
        const dailyTotals = {};
        history.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dailyTotals[date]) dailyTotals[date] = { date, Calories: 0, Protein: 0 };
            dailyTotals[date].Calories += item.total_calories || 0;
            dailyTotals[date].Protein += item.total_protein || 0;
        });
        return Object.values(dailyTotals).slice(-7).reverse();
    }, [history]);

    const tickColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';

    return (
        <div className="animate-fade-in space-y-6 pb-24">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Weekly Dashboard</h2>
            <div className="bg-white dark:bg-black/30 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-emerald-500 mb-4">Macronutrient Intake</h3>
                {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                            <XAxis dataKey="date" stroke={tickColor} fontSize={12} />
                            <YAxis stroke={tickColor} fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#18181b' : '#FFFFFF', border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}` }} />
                            <Legend />
                            <Bar dataKey="Calories" fill="#34d399" /> 
                            <Bar dataKey="Protein" fill="#a78bfa" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : ( <p className="text-center text-gray-500 dark:text-gray-400 py-10">Log meals to see your chart!</p> )}
            </div>
            <div className="space-y-4">
                <button onClick={handleSummarize} disabled={isSummarizing} className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 w-full">
                    {isSummarizing ? <Loader2 className="animate-spin"/> : <><FileText size={20}/> AI Weekly Summary</>}
                </button>
                {summary && <div className="bg-white dark:bg-black/30 p-5 rounded-xl border border-gray-200 dark:border-gray-800 animate-fade-in"><p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{summary}</p></div>}
                <button onClick={handleExport} className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 w-full"><Download size={20}/> Export to CSV</button>
            </div>
        </div>
    );
}

function MealHistoryScreen() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getMealHistory().then(data => {
            setHistory(data);
            setLoading(false);
        }).catch(err => { console.error(err); setLoading(false); });
    }, []);

    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;

    return (
        <div className="animate-fade-in space-y-6 pb-24">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Meal History</h2>
            <div className="space-y-3">
                {history.length > 0 ? history.map((item, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">{item.food_name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
                        </div>
                        <p className="font-bold text-emerald-500">{item.total_calories?.toFixed(0)} kcal</p>
                    </div>
                )) : ( <p className="text-center text-gray-500 dark:text-gray-400 py-10">No meals logged yet.</p> )}
            </div>
        </div>
    );
}

function BottomNavBar({ page, setPage }) {
  const navItems = [
    { id: 'history', icon: FileText, label: 'History' },
    { id: 'dashboard', icon: BarChart2, label: 'Stats' },
    { id: 'main', icon: User, label: 'Home' },
    { id: 'goals', icon: Target, label: 'Goals' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];
  return (
    <nav className="bg-white/80 dark:bg-black/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 grid grid-cols-5 gap-1 p-2 mt-auto">
      {navItems.map(item => (
        <button key={item.id} onClick={() => setPage(item.id)} className={`flex flex-col items-center justify-center rounded-lg p-2 transition-colors duration-200 ${ page === item.id ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800' }`}>
          <item.icon size={24} />
          <span className="text-xs mt-1 font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SuggestionModal({ imageGuess, suggestions, onConfirm, onClose }) {
    const [meal, setMeal] = useState({});

    useEffect(() => {
        const initialFood = suggestions.length > 0 ? suggestions[0] : imageGuess.replace(/_/g, ' ');
        if (initialFood) {
            setMeal({ [initialFood]: 1 });
        }
    }, [suggestions, imageGuess]);

    const handleQuantityChange = (item, delta) => {
        setMeal(prev => {
            const newQuantity = Math.max(0.5, (prev[item] || 0) + delta);
            return { ...prev, [item]: newQuantity };
        });
    };

    const toggleItem = (item) => {
        setMeal(prev => {
            if (prev[item]) {
                const { [item]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [item]: 1 };
        });
    };
    
    const handleConfirm = () => {
        const finalItems = Object.entries(meal).map(([item, quantity]) => ({ item, quantity }));
        onConfirm(finalItems);
    };

    const allSuggestions = suggestions.length > 0 ? suggestions : (imageGuess ? [imageGuess.replace(/_/g, ' ')] : []);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Confirm Your Meal</h3>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300">AI thinks this is <strong>{imageGuess.replace(/_/g, ' ')}</strong>. Select the best match below.</p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                    {allSuggestions.map((s, i) => {
                        const isSelected = !!meal[s];
                        return (
                            <div key={i} className={`border rounded-lg p-3 flex items-center justify-between transition-all duration-200 ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                <button onClick={() => toggleItem(s)} className="text-left font-medium flex-grow text-gray-800 dark:text-gray-100">
                                    {s}
                                </button>
                                {isSelected && (
                                    <div className="flex items-center gap-2 animate-fade-in">
                                        <button onClick={() => handleQuantityChange(s, -0.5)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><Minus size={16}/></button>
                                        <span className="font-bold w-8 text-center text-gray-800 dark:text-gray-100">{meal[s]}</span>
                                        <button onClick={() => handleQuantityChange(s, 0.5)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><Plus size={16}/></button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 w-full">Cancel</button>
                    <button onClick={handleConfirm} className="font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 w-full">Log Meal</button>
                </div>
            </div>
        </div>
    );
}

// --- Global Styles & Animations ---
const style = document.createElement('style');
style.textContent = `
  .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
  .animate-scale-in { animation: scaleIn 0.3s ease-out; }
  .animate-fade-in-up { animation: fadeInUp 0.5s ease-in-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(style);
