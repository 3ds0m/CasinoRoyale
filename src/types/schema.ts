export type GameType =
  | 'war'
  | 'three-card-poker'
  | 'roulette'
  | 'craps'
  | 'baccarat'
  | 'pai-gow'
  | 'blackjack'
  | 'keno-bingo'
  | 'texas-holdem';

export interface User {
  uid: string;
  username: string;
  avatarUrl: string;
  balance: number; // Monedas/Fichas virtuales
  createdAt: string; // ISO String o Firebase Timestamp como string
}

export interface Transaction {
  txId: string;
  userId: string;
  amount: number; // Cantidad de dinero (en centavos, ej. 500 para $5.00)
  coinsEarned: number; // Fichas agregadas al balance
  currency: string; // ej. "usd", "eur"
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

export interface GameHistory {
  gameId: string;
  userId: string;
  gameType: GameType;
  bet: number; // Fichas apostadas
  payout: number; // Fichas ganadas (0 si pierde)
  status: 'active' | 'completed';
  timestamp: string;
  
  // Estado específico del juego para reconexiones
  gameState?: {
    stage: string; // ej. "deal", "player-turn", "dealer-turn", "finished"
    playerCards: string[]; // Cartas del jugador
    dealerCards?: string[]; // Cartas del crupier (si aplica)
    playerHandValue?: number;
    dealerHandValue?: number;
    additionalData?: any; // Cualquier dato extra específico de la partida
  };

  // Módulo de juego demostrablemente justo (Provably Fair)
  provablyFair?: {
    serverSeedHash: string; // Hash del Server Seed
    clientSeed: string; // Seed del cliente
    nonce: number; // Contador de rondas
    resolvedResult: string; // Resultado crudo resuelto (para verificación)
  };
}

export interface RouletteBet {
  type: 'number' | 'color' | 'parity' | 'dozen' | 'highlow';
  value: string;
  amount: number;
}
