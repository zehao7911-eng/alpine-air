# Alpine Air

A mobile portrait ski jumping tournament. Tap **Start descent**, **Jump** as the timing marker enters mint, and **Land** just before touchdown. Takeoff quality affects flight distance; landing timing affects style. Two jumps make one meet. Clear each hill's target to unlock the next one, and finish the circuit to earn Ridge Ice.

Open index.html or standalone.html. Both include all code and art, require WebGL and work without network dependencies. A refresh keeps completed jumps; it restarts an unfinished jump from the gate. Suits, best scores and unlocks are saved under the game's own alpine-air-v1 key.

GameWave: each committed descent opens one jump session; a recorded jump ends it. Optional outfits are unlocked by successful positive like and direct comment callbacks. Standalone play does not require the host. Reward guards and local progress are game scoped. SDK integration is mock tested; real host behavior requires supported App verification.

Source: original procedural models and synthesized audio, bundled Three.js r147 (MIT; see vendor/THREE-LICENSE.txt). Rebuild with node build.cjs and run the regression checks with node tests.mjs.
