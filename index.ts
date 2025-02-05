import {
  startServer,
  Audio,
  PlayerEntity,
  World,
  Player,
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
 * duration to elapse before resolving. We force any duration < 1 second
 * to be at least 1 second.
 * 
 * volumeFactor lets us tweak volume for different commands (e.g. "loud" vs "whisper").
 */
function playAudioWithDuration(
  world: World,
  soundUri: string,
  letter: string,
  volumeFactor: number = 1.0
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
  world: World,
  player: Player,
  args: string[],
  commandName: string,
  volumeFactor: number = 1.0
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

  // Sequentially play each letter sound.
  // Instead of checking if the file exists, we directly attempt to play it.
  for (const letter of letters) {
    const soundUri = `audio/sfx/farts/fart${letter}.mp3`;
    await playAudioWithDuration(world, soundUri, letter, volumeFactor);
  }

  // Optional: notify the player once finished.
  world.chatManager.sendPlayerMessage(
    player,
    `${commandName} sequence [${letters.join('')}] complete!`
  );
}

let fartSound: Audio | null = null;

function attachLoopingFartSound(world: World, player: Player) {
  const playerEntities = world.entityManager.getPlayerEntitiesByPlayer(player);
  if (playerEntities.length === 0) {
    console.warn("No player entity found to attach the looping sound.");
    return;
  }

  const attachedEntity = playerEntities[0];

  // If a sound is already playing, pause it (this ensures only one instance)
  if (fartSound) {
    fartSound.pause();
  }

  fartSound = new Audio({
    uri: 'audio/sfx/farts/fartJ.mp3',
    loop: true,
    attachedToEntity: attachedEntity,
    volume: 1.0, // Adjust volume as needed.
    referenceDistance: 5, // Adjust how the sound attenuates with distance.
  });
  
  fartSound.play(world);
}

startServer(world => {
  // Load the map.
  world.loadMap(worldMap);

  // Register the /fartstep command to toggle the looping fart sound
  world.chatManager.registerCommand('/fartstep', (player) => {
    if (fartSound) {
      fartSound.pause(); // Pause the sound to stop playback
      fartSound = null;
    } else {
      attachLoopingFartSound(world, player); // Attach and play the looping sound
    }
  });

  // Handle players joining.
  world.onPlayerJoin = player => {
    const playerEntity = new PlayerEntity({
      player,
      name: 'Player',
      modelUri: 'models/players/player.gltf',
      modelLoopedAnimations: ['idle'],
      modelScale: 0.5,
    });
    playerEntity.spawn(world, { x: 0, y: 10, z: 0 });

    // Inside world.onPlayerJoin callback, after spawning the player
    let lastSpace = false;
    let spaceInterruptActive = false;

    playerEntity.controller!.onTickWithPlayerInput = (dt, input, velocity, isGrounded) => {
      // Adjust looping fart sound playback rate based on the Shift key ("sh").
      if (fartSound && input.sh) {
        fartSound.setPlaybackRate(2.5); // Increased rate when Shift is pressed
      } else if (fartSound) {
        fartSound.setPlaybackRate(1.0); // Normal rate otherwise
      }

      // Only trigger space bar interrupt if the looping sound is active
      if (fartSound && input.sp && !lastSpace && !spaceInterruptActive) {
        spaceInterruptActive = true;
        
        // Interrupt the looping sound.
        fartSound.pause();
        fartSound = null;
        
        // Play the one-off space fart sound.
        new Audio({
          uri: 'audio/sfx/farts/fartE.mp3',
          volume: 1.0
        }).play(world);
        
        // Resume the looping sound after 1 second.
        setTimeout(() => {
          attachLoopingFartSound(world, player);
          spaceInterruptActive = false;
        }, 1000);
      }
      
      // Update the lastSpace flag.
      lastSpace = input.sp ?? false;
    };

    // Send a welcome message.
    world.chatManager.sendPlayerMessage(player, 'Welcome to the game!', '00FF00');
    world.chatManager.sendPlayerMessage(player, 'Use WASD to move around.');
    world.chatManager.sendPlayerMessage(player, 'Press space to jump.');
    world.chatManager.sendPlayerMessage(player, 'Hold shift to sprint.');
    world.chatManager.sendPlayerMessage(player, 'Press \\ to enter or exit debug view.');
  };

  // Handle players leaving.
  world.onPlayerLeave = player => {
    world.entityManager
      .getPlayerEntitiesByPlayer(player)
      .forEach(entity => entity.despawn());
  };

  // Example rocket command.
  world.chatManager.registerCommand('/rocket', player => {
    world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => {
      entity.applyImpulse({ x: 0, y: 20, z: 0 });
    });
  });

  world.chatManager.registerCommand('/fartspeak', (player, args) => {
    handleFartSpeak(world, player, args, '/fartspeak', 1.0);
  });
});