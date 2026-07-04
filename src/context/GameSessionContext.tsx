import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  increment, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { User, GameHistory } from '../types/schema';

interface GameSessionContextType {
  user: User | null;
  history: GameHistory[];
  activeGame: GameHistory | null;
  loading: boolean;
  isMockMode: boolean;
  loginAnonymously: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateBalance: (amount: number) => Promise<number>;
  updateUsername: (newUsername: string) => Promise<void>;
  saveActiveGame: (gameHistory: Omit<GameHistory, 'userId' | 'timestamp'>) => Promise<void>;
  clearActiveGame: () => Promise<void>;
  addGameHistory: (gameHistory: Omit<GameHistory, 'userId' | 'timestamp'>) => Promise<void>;
}

const GameSessionContext = createContext<GameSessionContextType | undefined>(undefined);

export const GameSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [activeGame, setActiveGame] = useState<GameHistory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);

  // --- Mock Mode State Handlers (Fallback for offline/development) ---
  const loadMockData = () => {
    const savedUser = localStorage.getItem('cr_user');
    const savedHistory = localStorage.getItem('cr_history');
    const savedActiveGame = localStorage.getItem('cr_active_game');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      const defaultUser: User = {
        uid: 'mock-user-123',
        username: 'Crupier Royale (Local)',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Royale',
        balance: 1000,
        createdAt: new Date().toISOString()
      };
      setUser(defaultUser);
      localStorage.setItem('cr_user', JSON.stringify(defaultUser));
    }

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    } else {
      setHistory([]);
    }

    if (savedActiveGame) {
      setActiveGame(JSON.parse(savedActiveGame));
    } else {
      setActiveGame(null);
    }
    setLoading(false);
  };

  // Monitor Firebase Auth state with fallback to local mock mode
  useEffect(() => {
    // If no Firebase API key or if it is mock, fallback immediately to local mock mode
    const hasApiKey = import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "mock-api-key";
    const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
    
    if (!hasApiKey && !useEmulators) {
      console.log("No valid Firebase API key or emulator setting detected. Falling back to local Mock Mode.");
      setIsMockMode(true);
      loadMockData();
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setIsMockMode(false);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to User Profile changes in real-time
        const unsubscribeUser = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            setUser(snapshot.data() as User);
          } else {
            const defaultUser: User = {
              uid: firebaseUser.uid,
              username: firebaseUser.isAnonymous ? 'Crupier Royale' : (firebaseUser.email?.split('@')[0] || 'Jugador Royale'),
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
              balance: 1000,
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, defaultUser);
              setUser(defaultUser);
            } catch (err) {
              console.warn("Failed to create Firestore profile document, falling back to mock state:", err);
              setIsMockMode(true);
              loadMockData();
            }
          }
          setLoading(false);
        }, (error) => {
          console.warn("Firestore user profile listener failed, falling back to local Mock Mode:", error);
          setIsMockMode(true);
          loadMockData();
        });

        // Listen to Game History changes in real-time
        const historyQuery = query(
          collection(db, 'games_history'),
          where('userId', '==', firebaseUser.uid),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
          const loadedHistory: GameHistory[] = [];
          snapshot.forEach((docSnap) => {
            loadedHistory.push(docSnap.data() as GameHistory);
          });
          setHistory(loadedHistory);
        }, (error) => {
          console.warn("Firestore history listener warning:", error);
        });

        // Listen to Active Game status
        const activeGameRef = doc(db, 'active_games', firebaseUser.uid);
        const unsubscribeActiveGame = onSnapshot(activeGameRef, (snapshot) => {
          if (snapshot.exists()) {
            setActiveGame(snapshot.data() as GameHistory);
          } else {
            setActiveGame(null);
          }
        }, (error) => {
          console.warn("Firestore active game listener warning:", error);
        });

        return () => {
          unsubscribeUser();
          unsubscribeHistory();
          unsubscribeActiveGame();
        };
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.warn("Firebase sign in failed. Falling back to local Mock Mode:", error);
          setIsMockMode(true);
          loadMockData();
        }
      }
    }, (error) => {
      console.warn("Firebase Auth listener error. Falling back to local Mock Mode:", error);
      setIsMockMode(true);
      loadMockData();
    });

    return () => unsubscribeAuth();
  }, []);

  const loginAnonymously = async () => {
    if (isMockMode) return;
    setLoading(true);
    await signInAnonymously(auth);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (isMockMode) {
      // Simulate login in mock mode
      setUser({
        uid: 'mock-user-email',
        username: email.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        balance: 1000,
        createdAt: new Date().toISOString()
      });
      return;
    }
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    if (isMockMode) {
      // Simulate registration in mock mode
      setUser({
        uid: 'mock-user-email',
        username: email.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        balance: 1000,
        createdAt: new Date().toISOString()
      });
      return;
    }
    setLoading(true);
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    if (isMockMode) {
      localStorage.removeItem('cr_user');
      localStorage.removeItem('cr_history');
      localStorage.removeItem('cr_active_game');
      setUser(null);
      loadMockData();
      return;
    }
    setLoading(true);
    await signOut(auth);
  };

  // Modificar saldo de forma segura
  const updateBalance = async (amount: number): Promise<number> => {
    if (!user) throw new Error('No user is currently logged in');
    
    const newBalance = Math.max(0, user.balance + amount);

    if (isMockMode) {
      const updated = { ...user, balance: newBalance };
      setUser(updated);
      localStorage.setItem('cr_user', JSON.stringify(updated));
      return newBalance;
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      balance: increment(amount)
    });
    
    return newBalance;
  };

  // Actualizar nombre de usuario
  const updateUsername = async (newUsername: string) => {
    if (!user) return;

    if (isMockMode) {
      const updated = { ...user, username: newUsername };
      setUser(updated);
      localStorage.setItem('cr_user', JSON.stringify(updated));
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      username: newUsername
    });
  };

  // Guardar estado del juego activo
  const saveActiveGame = async (gameData: Omit<GameHistory, 'userId' | 'timestamp'>) => {
    if (!user) return;
    
    const fullGame: GameHistory = {
      ...gameData,
      userId: user.uid,
      timestamp: new Date().toISOString()
    };

    if (isMockMode) {
      setActiveGame(fullGame);
      localStorage.setItem('cr_active_game', JSON.stringify(fullGame));
      return;
    }

    const activeGameRef = doc(db, 'active_games', user.uid);
    await setDoc(activeGameRef, fullGame);
  };

  // Limpiar juego activo cuando termina la partida
  const clearActiveGame = async () => {
    if (!user) return;

    if (isMockMode) {
      setActiveGame(null);
      localStorage.removeItem('cr_active_game');
      return;
    }

    const activeGameRef = doc(db, 'active_games', user.uid);
    await deleteDoc(activeGameRef);
  };

  // Registrar partida en el historial
  const addGameHistory = async (gameData: Omit<GameHistory, 'userId' | 'timestamp'>) => {
    if (!user) return;

    const finishedGame: GameHistory = {
      ...gameData,
      gameId: isMockMode ? 'mock-game-' + Math.random().toString(36).substr(2, 9) : '',
      userId: user.uid,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    if (isMockMode) {
      const updatedHistory = [finishedGame, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('cr_history', JSON.stringify(updatedHistory));
      await clearActiveGame();
      return;
    }
    
    const historyDocRef = doc(collection(db, 'games_history'));
    finishedGame.gameId = historyDocRef.id;
    await setDoc(historyDocRef, finishedGame);
    await clearActiveGame();
  };

  return (
    <GameSessionContext.Provider
      value={{
        user,
        history,
        activeGame,
        loading,
        isMockMode,
        loginAnonymously,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateBalance,
        updateUsername,
        saveActiveGame,
        clearActiveGame,
        addGameHistory
      }}
    >
      {children}
    </GameSessionContext.Provider>
  );
};

export const useGameSession = () => {
  const context = useContext(GameSessionContext);
  if (context === undefined) {
    throw new Error('useGameSession must be used within a GameSessionProvider');
  }
  return context;
};
