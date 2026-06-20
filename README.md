# SpaceCommanders

Create a complete, standalone TypeScript browser game called Space Commanders (sci-fi themed Battleships variant). It must be a single-page app deployable to GitHub Pages. Use modern TypeScript, HTML5 Canvas for rendering, and vanilla JS (no heavy frameworks unless necessary — prefer lightweight or none). The repo structure should match a typical Vite + TypeScript project. the game should work on web and mobile.
use https://github.com/tharak/SpaceCommanders as repository and deploy to github pages.

the core game mechanics is to tell the fleet which position it should form, where to move and if it should shoot at will, shoot at a specific area or not shoot. Also the player has to manage the fleet supplies and moral.

lets start making 5 formations, line, column, arrow, circle and pincer. but keep in mind that we could expand this later. formations also have a tight variable, it will dictate how close the ships should aim to stay.
there should be a picker for the formation, at any time the player can select a formation and click on the map to set the position he wishes the fleet to form it. there should be a preview of the position on the map, just a projection, no collision or verification of any kind is necessary.
there should be a shoot picker with the 3 options (focus, at will, no shooting).
all buttons should be icons, no text. the formations buttons should look like the preview, the shooting ones should be 3 guns shooting straight for focus, 3 guns shooting straight for at will and a gun with a forbidden sign on top for the no shooting.

the map should and approximation of a solar system.

lets have a debug view where we can set all variables of the game for fine tune. number and types of celestial bodies, number of starting ships, etc

the game should create a map with a number of celestial bodies, at fist lets make so that they are only obstacles but later they might have some function like black hole pulls the ships near, asteroids fields move around, planets generate resources, etc.

each player starts with a random planet as base. the objective is to capture the enemy home planet. each player starts with 10 battleships and 1 captain that likes a random formation.
a planet begins capture when nearby battleships outnumber the opposing force. captured planets become owned supply sources.

fleet is composed of 10 battleships and 1 captain

captain has a favorite formation and provides a bonus to his ships if its in that formation.

battleship starts with 10 supplies. each time it shoots it loses 1.
when an owned planet stores at least one supply, it launches a supply ship to the allied battleship with the least supplies. the ship transfers one supply, returns to its home planet, and then despawns.

ships movement will use boids implementation to move and get into formation.
ships can collide with allies, enemies and celestial bodies. so they should try to avoid those. ships have the following attributes: hit-points, attack, defense, speed, sight, moral, supplies, range.
