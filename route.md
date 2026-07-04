Casino Royale: Roadmap de Implementación (Firebase Edition)
Este documento detalla la arquitectura de software, flujo de transacciones y el mapa de pasos para construir el casino, adaptado a Google Firebase y diseñado con una arquitectura modular singleplayer extensible a multijugador.

Arquitectura del Sistema
Stack Tecnológico
Frontend: Vite + React (TypeScript) o Next.js.
Estilos y Animaciones: CSS Moderno / TailwindCSS + Framer Motion.
Backend & Base de Datos: Google Firebase:
Firebase Authentication: Inicio de sesión (Email/Password, Google).
Cloud Firestore: Base de datos NoSQL en tiempo real para almacenar el saldo del usuario, perfiles, historial y transacciones.
Firebase Cloud Functions (o API Routes si usamos Next.js): Backend seguro para procesar webhooks de Stripe y validar apuestas críticas del lado del servidor para evitar hacks.
Pasarela de Pagos: Stripe.
Preparación para Futuro Multiplayer
Para permitir que los juegos pasen de singleplayer a multiplayer en el futuro sin tener que reescribir todo el frontend, implementaremos el patrón de diseño Presenter/Controller desacoplado:

Motor del Juego Aislado (Game Engine Core): La lógica de reglas de juego (ej. cuándo doblar en Blackjack, cálculo de manos de Poker, etc.) se manejará en clases o hooks de TypeScript puros, sin acoplamiento visual.
Interfaz de Red / Estado Abstraída: La UI se comunicará con un proveedor de estado (GameSessionProvider).
Modo Actual (Singleplayer): El proveedor de estado ejecutará la lógica localmente en el cliente (o mediante Firebase Functions rápidas para validar resultados de dados/cartas de forma segura).
Modo Futuro (Multiplayer): Se reemplazará la implementación del proveedor de estado por un listener en tiempo real de Firestore (usando onSnapshot en una colección /matches/{matchId}) o WebSockets, sin necesidad de modificar el componente visual del tapete de juego o las cartas.
Muro de Pago y Gestión de Monedas (Stripe + Firebase)
Mermaid diagram
Mapa de Pasos (Roadmap de Desarrollo)
Fase 1: Arquitectura Base e Integración de Firebase
 Configurar el proyecto de frontend con React y TypeScript.
 Configurar Firebase en la app e inicializar Firebase Auth y Firestore.
 Definir el esquema de documentos de Firestore:
Colección /users/{uid}: username, avatar_url, balance (monedas), createdAt.
Colección /transactions/{txId}: Registro de compras vía Stripe.
Colección /games_history/{gameId}: Partidas individuales, tipo de juego, apuesta, resultado.
 Configurar el sistema de diseño visual (Estética moderna y fluida).
Fase 2: Autenticación, Tienda y Webhook de Stripe
 Diseñar el Dashboard del usuario y vistas de autenticación.
 Implementar la tienda de monedas virtuales en la interfaz.
 Crear la Firebase Cloud Function /createStripeCheckout para generar la sesión de pago.
 Crear la Firebase Cloud Function /stripeWebhook para procesar de forma segura el pago exitoso e incrementar el saldo del usuario en Firestore de forma atómica (FieldValue.increment).
Fase 3: Juegos de Cartas Simples (Estructura Modular)
 Casino War:
Implementar la lógica del juego en un módulo de TypeScript independiente (useCasinoWarEngine).
Crear la UI responsiva con animaciones 3D de revelado de cartas.
 Three Card Poker:
Algoritmo de evaluación de manos de 3 cartas.
Lógica Ante/Play.
Fase 4: Juegos de Mesa Tradicionales (Física y Animaciones)
 Ruleta (Roulette):
Tapete de apuestas interactivo.
Generación de giros de ruleta con cálculo seguro del número ganador.
 Craps (Dados):
Diseño de mesa de dados detallado.
Lanzamiento físico o simulado de dos dados con cálculo de fases de juego.
Fase 5: Juegos de Cartas Estratégicos
 Baccarat:
Lógica exacta del tercer naip para el jugador y la banca.
 Pai Gow Poker:
División de 7 cartas en mano de 5 y mano de 2.
Ayuda inteligente "House Way".
Fase 6: Blackjack (BJ) y Juegos de Números
 Blackjack:
Opciones de Pedir, Plantarse, Doblar, Dividir y Seguro.
Lógica automatizada para la banca (plantarse en 17).
 Bingo o Keno:
Juego casual rápido con selección de números y sorteo simulado.
Fase 7: Texas Hold'em Poker (Singleplayer vs Bots)
 Implementar el evaluador de manos clásico de 5 cartas.
 Crear una máquina de estados para turnos de apuestas (Pre-flop, Flop, Turn, River).
 Programar lógica básica para 3 bots oponentes en la mesa con diferentes perfiles de juego (conservador, agresivo, farolero).
 Diseñar la estructura del estado de la mesa en un objeto JSON compatible con Firestore para facilitar la transición a multijugador en el futuro.
Fase 8: Panel de Estadísticas y Fair Play
 Gráficos interactivos de ganancias e historial del usuario.
 Implementar un módulo de "Juego Seguro y Demostrable" (Provably Fair) usando hashes criptográficos para demostrar que los dados, ruleta y barajas no están manipulados.
Plan de Verificación
Pruebas Automatizadas
Tests unitarios en Jest/Vitest para:
Evaluadores de manos de poker y blackjack.
Lógica de pagos (Payout calculations) de ruleta y dados.
Simulación local de Firebase Cloud Functions con Firebase Emulator Suite.
Verificación Manual
Flujo de compra con tarjetas de prueba de Stripe.
Validar la persistencia del estado en Firestore ante desconexiones durante una partida activa (guardar la fase actual del juego para que el usuario pueda reanudarla).