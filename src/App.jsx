import React, { useState, useEffect } from 'react';
import { User, MessageSquare, History, LogOut, Eye, Download, Copy, Loader2, Sparkles, Image } from 'lucide-react';

const ImageIcon = Image;

// Configuration Firebase - VRAIE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCVcwNNPBM7YXZZv2tz2_5BdJUVZZZM8Bk",
  authDomain: "image-generator-ai-bb1a1.firebaseapp.com",
  projectId: "image-generator-ai-bb1a1",
  storageBucket: "image-generator-ai-bb1a1.firebasestorage.app",
  messagingSenderId: "447983340409",
  appId: "1:447983340409:web:21d20efb07ee9f17d43da8"
};

// URL de votre webhook n8n 
const N8N_WEBHOOK_URL = "https://danytherrien.app.n8n.cloud/webhook/generate-images";

// Simulation améliorée Firebase Auth & Firestore
const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (email && password) {
      mockAuth.currentUser = { email, uid: email.replace('@', '_').replace('.', '_') };
      return { user: mockAuth.currentUser };
    }
    throw new Error('Email ou mot de passe incorrect');
  },
  createUserWithEmailAndPassword: async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (email && password && password.length >= 6) {
      mockAuth.currentUser = { email, uid: email.replace('@', '_').replace('.', '_') };
      return { user: mockAuth.currentUser };
    }
    throw new Error('Le mot de passe doit contenir au moins 6 caractères');
  },
  signOut: async () => {
    mockAuth.currentUser = null;
  }
};

const mockFirestore = {
  data: [], // Stockage local des données
  collection: (name) => ({
    add: async (data) => {
      const newDoc = {
        id: Date.now().toString(),
        ...data,
        timestamp: new Date()
      };
      mockFirestore.data.push(newDoc);
      console.log('Saved to Firestore:', newDoc);
      return { id: newDoc.id };
    },
    where: (field, operator, value) => ({
      orderBy: (orderField, direction) => ({
        get: async () => {
          let results = mockFirestore.data.filter(doc => {
            if (operator === '==') return doc[field] === value;
            return true;
          });
          
          if (orderField === 'timestamp' && direction === 'desc') {
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          }
          
          return {
            docs: results.map(doc => ({
              id: doc.id,
              data: () => doc
            }))
          };
        }
      })
    })
  })
};

const AIImageGenerator = () => {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('auth');
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  // Auth functions
  const handleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (authMode === 'login') {
        await mockAuth.signInWithEmailAndPassword(email, password);
      } else {
        await mockAuth.createUserWithEmailAndPassword(email, password);
      }
      setUser(mockAuth.currentUser);
      setCurrentView('dashboard');
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await mockAuth.signOut();
    setUser(null);
    setCurrentView('auth');
  };

  // Load user history
  const loadHistory = async () => {
    try {
      if (!user) return;
      
      const snapshot = await mockFirestore.collection('generations')
        .where('userId', '==', user.uid)
        .orderBy('timestamp', 'desc')
        .get();
        
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(historyData);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  // Generate images avec VRAI appel n8n
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setGenerating(true);
    setError('');
    
    try {
      // APPEL REAL vers votre webhook n8n
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          email: user.email
        })
      });

      if (!response.ok) {
        throw new Error('Erreur réseau');
      }

      const result = await response.json();
      
      // Structure attendue du webhook n8n
      const newGeneration = {
        prompt: prompt,
        dalle_url: result.dalle_url || `https://via.placeholder.com/512x512/ff6b6b/white?text=${encodeURIComponent('DALL-E: ' + prompt.slice(0, 20))}`,
        stable_url: result.stable_url || `https://via.placeholder.com/512x512/4ecdc4/white?text=${encodeURIComponent('SD: ' + prompt.slice(0, 20))}`,
        midjourney_url: result.midjourney_url || `https://via.placeholder.com/512x512/45b7d1/white?text=${encodeURIComponent('MJ: ' + prompt.slice(0, 20))}`,
        dalle_status: result.dalle_status || "success",
        stable_status: result.stable_status || "success", 
        midjourney_status: result.midjourney_status || "success",
        userId: user.uid
      };

      // Save to Firestore
      await mockFirestore.collection('generations').add(newGeneration);
      
      // Reload history
      await loadHistory();
      
      // Reset prompt
      setPrompt('');
      
      // Switch to history view
      setCurrentView('history');
      
    } catch (err) {
      console.error('Erreur génération:', err);
      setError('Erreur lors de la génération. Vérifiez votre connexion.');
      
      // Fallback en cas d'erreur - génération de test
      const fallbackGeneration = {
        prompt: prompt,
        dalle_url: `https://via.placeholder.com/512x512/ff6b6b/white?text=${encodeURIComponent('DALL-E: ' + prompt.slice(0, 20))}`,
        stable_url: `https://via.placeholder.com/512x512/4ecdc4/white?text=${encodeURIComponent('SD: ' + prompt.slice(0, 20))}`,
        midjourney_url: `https://via.placeholder.com/512x512/45b7d1/white?text=${encodeURIComponent('MJ: ' + prompt.slice(0, 20))}`,
        dalle_status: "demo",
        stable_status: "demo",
        midjourney_status: "demo", 
        userId: user.uid
      };
      
      await mockFirestore.collection('generations').add(fallbackGeneration);
      await loadHistory();
      setPrompt('');
      setCurrentView('history');
      
    } finally {
      setGenerating(false);
    }
  };

  // Auth Page
  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Image Generator</h1>
            <p className="text-gray-600">Comparez DALL-E, Stable Diffusion et Midjourney</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : null}
              {loading ? 'Connexion...' : authMode === 'login' ? 'Se connecter' : 'S\'inscrire'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              {authMode === 'login' ? 'Créer un compte' : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-10 h-10 rounded-full flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">AI Generator</h1>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('generate')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'generate' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare size={16} className="inline mr-2" />
              Générer
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'history' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <History size={16} className="inline mr-2" />
              Historique
            </button>
          </div>
        </div>

        {/* History List in Sidebar */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Générations récentes</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setCurrentView('history')}
              >
                <p className="text-sm text-gray-800 line-clamp-2">{item.prompt}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {item.timestamp?.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Generate View */}
        {currentView === 'generate' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-4xl w-full">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    Générez des images avec 3 IA
                  </h2>
                  <p className="text-gray-600">
                    Comparez DALL-E 3, Stable Diffusion XL et Midjourney en un clic
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Décrivez l'image que vous voulez générer
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Ex: Un chat astronaute sur la lune en style cartoon, très détaillé, couleurs vives..."
                    />
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin mr-3" size={24} />
                        Génération en cours... (3 IA en parallèle)
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-3" size={24} />
                        Générer avec 3 IA
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  {generating && (
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 text-blue-700">
                        <Loader2 className="animate-spin" size={20} />
                        <span className="font-medium">Génération en cours...</span>
                      </div>
                      <p className="text-blue-600 text-sm mt-2">
                        DALL-E 3, Stable Diffusion XL et Midjourney travaillent sur votre prompt
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History View */}
        {currentView === 'history' && (
          <div className="flex-1 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Historique des générations</h2>
              <p className="text-gray-600">Toutes vos créations AI en un coup d'œil</p>
            </div>

            <div className="space-y-8">
              {history.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.prompt}</h3>
                    <p className="text-gray-500 text-sm">
                      {item.timestamp?.toLocaleDateString()} à {item.timestamp?.toLocaleTimeString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* DALL-E */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-gray-700">DALL-E 3</span>
                      </div>
                      <div className="relative group">
                        <img
                          src={item.dalle_url}
                          alt="DALL-E generation"
                          className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                            <button 
                              onClick={() => setSelectedImage(item.dalle_url)}
                              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors">
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stable Diffusion */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-gray-700">Stable Diffusion XL</span>
                      </div>
                      <div className="relative group">
                        <img
                          src={item.stable_url}
                          alt="Stable Diffusion generation"
                          className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                            <button 
                              onClick={() => setSelectedImage(item.stable_url)}
                              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors">
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Midjourney */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-gray-700">Midjourney</span>
                      </div>
                      <div className="relative group">
                        <img
                          src={item.midjourney_url}
                          alt="Midjourney generation"
                          className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                            <button 
                              onClick={() => setSelectedImage(item.midjourney_url)}
                              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors">
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {history.length === 0 && (
              <div className="text-center py-16">
                <ImageIcon size={64} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">Aucune génération</h3>
                <p className="text-gray-400 mb-6">Commencez par générer votre première image</p>
                <button
                  onClick={() => setCurrentView('generate')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-medium"
                >
                  Générer une image
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedImage}
              alt="Image en grand"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIImageGenerator;
