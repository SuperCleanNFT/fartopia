import { existsSync } from 'fs';
import {
  startServer,
  Audio,
  PlayerEntity,
} from 'hytopia';

import worldMap from './assets/map.json';

/** 
 * Hardcoded durations in SECONDS.
 * Any value that is less than 1 second 
 * will be forced to 1s at runtime.
 */
const FART_DURATIONS: Record<string, number> = {
  A: 0,
  B: 0,
  C: 1,
  D: 0,
  E: 0,
  F: 0,
  G: 1,
  H: 1,
  I: 1,
  J: 9,
  K: 2,
  L: 1,
  M: 1,
  N: 1,
  O: 1,
  P: 0,
  Q: 3,
  R: 1,
  S: 1,
  T: 0,
  U: 1,
  V: 3,
  W: 1,
  X: 3,
  Y: 0,
  Z: 5,
};

/**
 * Plays the given fart letter's sound in the world, waiting for its
 * duration to elapse before resolving. We force any 
 * duration < 1 second to be at least 1 second.
 * 
 * volumeFactor lets us tweak volume for different commands (e.g. "loud" vs "whisper").
 */
function playAudioWithDuration(
  world,
  soundUri: string,
  letter: string,
  volumeFactor = 1.0
): Promise<void> {
  return new Promise((resolve) => {
    // Get the nominal duration from our table, default to 1 if not found
    const durationSec = FART_DURATIONS[letter] ?? 1;
    // Force a minimum of 1 second
    const safeDuration = durationSec < 1 ? 1 : durationSec;

    try {
      const audio = new Audio({
        uri: soundUri,
        volume: 1.0 * volumeFactor,
      });
      audio.play(world);

      console.log(
        `Playing: ${soundUri} at volume x${volumeFactor}, forced duration ~${safeDuration}s`
      );

      // Wait that many seconds before resolving
      setTimeout(() => {
        resolve();
      }, safeDuration * 1000);
    } catch (error) {
      console.error(`Failed to play sound: ${soundUri}`, error);
      resolve();
    }
  });
}

/**
 * A helper function that implements the "letter-by-letter fart sounds" logic.
 * - commandName: which command triggered it (for logging or messaging).
 * - volumeFactor: optionally adjust volume for different commands.
 */
async function handleFartSpeak(
  world,
  player,
  args: string[],
  commandName: string,
  volumeFactor = 1.0
) {
  const fartString = args.join('').toUpperCase();

  if (!fartString) {
    world.chatManager.sendPlayerMessage(
      player,
      `Usage: ${commandName} <letters>. Example: ${commandName} SAM`
    );
    return;
  }

  // Keep only valid letters A–Z
  const letters = fartString.split('').filter(c => c >= 'A' && c <= 'Z');
  if (letters.length === 0) {
    world.chatManager.sendPlayerMessage(
      player,
      `No valid letters found. Example: ${commandName} SAM`
    );
    return;
  }

  // Sequentially play each letter sound
  for (const letter of letters) {
    const soundUri = `audio/sfx/farts/fart${letter}.mp3`;
    // Adjust this path if needed, but be consistent with your assets folder
    const fullPath = `C:/Users/b1fre/fartopia/assets/${soundUri}`;

    if (!existsSync(fullPath)) {
      console.error(`File does not exist: ${fullPath}`);
      continue; // skip
    }

    // wait for each letter’s audio
    await playAudioWithDuration(world, soundUri, letter, volumeFactor);
  }

  // Optional: notify the player once finished
  world.chatManager.sendPlayerMessage(
    player,
    `${commandName} sequence [${letters.join('')}] complete!`
  );
}

startServer(world => {
  // Load the map
  world.loadMap(worldMap);

  // Handle players joining
  world.onPlayerJoin = player => {
    const playerEntity = new PlayerEntity({
      player,
      name: 'Player',
      modelUri: 'models/players/player.gltf',
      modelLoopedAnimations: ['idle'],
      modelScale: 0.5,
    });
    playerEntity.spawn(world, { x: 0, y: 10, z: 0 });

    // Send a welcome message
    world.chatManager.sendPlayerMessage(player, 'Welcome to the game!', '00FF00');
    world.chatManager.sendPlayerMessage(player, 'Use WASD to move around.');
    world.chatManager.sendPlayerMessage(player, 'Press space to jump.');
    world.chatManager.sendPlayerMessage(player, 'Hold shift to sprint.');
    world.chatManager.sendPlayerMessage(player, 'Press \\ to enter or exit debug view.');
  };

  // Handle players leaving
  world.onPlayerLeave = player => {
    world.entityManager
      .getPlayerEntitiesByPlayer(player)
      .forEach(entity => entity.despawn());
  };

  // Example rocket command
  world.chatManager.registerCommand('/rocket', player => {
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
      entity.applyImpulse({ x: 0, y: 20, z: 0 });
    });
  });

  /**
   * Command #1: /fartspeak
   * This is the renamed original /fart command.
   * Same volume as before (factor=1).
   */
  world.chatManager.registerCommand('/fartspeak', (player, args) => {
    handleFartSpeak(world, player, args, '/fartspeak', 1.0);
  });

  /**
   * Command #2: /fartloud
   * Example command that plays at 2x volume.
   */
  world.chatManager.registerCommand('/fartloud', (player, args) => {
    handleFartSpeak(world, player, args, '/fartloud', 2.0);
  });

  /**
   * Command #3: /fartwhisper
   * Example command at lower volume (0.3).
   */
  world.chatManager.registerCommand('/fartwhisper', (player, args) => {
    handleFartSpeak(world, player, args, '/fartwhisper', 0.3);
  });

  /**
   * Add as many additional commands as you like, 
   * each calling handleFartSpeak(...) with different parameters or logic.
   */
});
