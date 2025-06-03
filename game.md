# Controls

Ship Joy is controlled by keyboard and/or gamepad for up to 6 players at once.

Each player has a single joystick and two buttons to keep things simple.

## Keyboard Left

- WASD for arrows
- C for primary button
- V for secondary button

## Keyboard Right

- Up/Down/Left/Right Arrows for arrows
- `<` for primary button
- `>` for secondary button

## Gamepads

- Left joystick or D-Pad for arrows
- `A` for primary button
- `B` for secondary button

# Ship Select Menu

The starts in ship select menu.

Each controller has 4 possible states in the menu:

- deactivated
- selecting/cycling
- selected
- ready to play

Pressing the primary button advances states and pressing the secondary button goes back.

## No Controllers

Initially there are zero activated controllers and a welcome message instructs the user to press buttons on gamepads to activate gamepad controllers as well as pressing WASD or arrows to activate keyboard players.

## Ship Selection

Once there is at least one player activated, each player's selection is shown in a horizontal row (centered and growing as more players are added)

Above the ship will read "Keyboard Left", "Keyboard Right", "Gamepad 1", etc.

Each player will initially be assigned a random ship from the 12 options, but can cycle through the available ships using left and right.

When in cycle mode, the ships slowly rotate as if to show off the ship in a show-room.

### Selecting A Ship

When a player wishes to select a ship, they press their primary button to claim a ship. 

Once a ship is selected, no other players may pick that ship when cycling.  If someone else had the same ship currently active, they are bumped to a random ship.

A player may decide to release a ship and select another by pressing the secondary button and will go back to cycle mode to pick a new option.

The selected state is shown by the ship no longer rotating (but pointing straight up) with a halo of colored particles floating around it randomly.

## Signaling Ready

To confirm and signal that a player is ready for the match, they press the primary button again.  To visually show ready mode, the ship will turn left and right about 15 degrees in a sine wave and the particles will flow out the bottom as if pushing it forward.

Pressing the secondary button will move the player back in to selected state.

## Leaving the Game

While in menu, a player can exit (deactivate the controller) by pressing the secondary button when no ship is selected or ready.  They are removed from the list as if they were never activated at all.

## Starting the Game

Once all activate players are in ready mode, a countdown from 5 appears in the center of the screen. If nobody backs out within 5 seconds the game starts!

# Flying the Ship

Once in active play mode ships are controlled simply

- left rotates the ship counter-clockwise at a fixed velocity
- right rotates the ship clockwise at a fixed velocity
- up moves the ship forward 
- down moves the ship back at half speed

There is some intertia and smoothing to the movements (especially for the keyboard players or gamepads using the D-PAD since they can't control how fast to rotate/thrust) but overall, control is responsive and quick.

Pressing the primary button fires the main blasters

Pressing the secondary button activates the shield

## Power Levels

Each ship has a fixed power generation supply that shows on their side of the screen along with their score and life bar (and any powerups/state)

Using the thruster consumes some power, but not much.  Using the shield consumes it morre quickly as does firing the blasters.

When there is not enough power, the shield will turn off, blasters will stop firing, and the ship will stop accelerating

## Power Ups

There are varous powerups that randomly appear on the board that players can capture by flying through each with a unique color.

- increased power generation
- increased shield toughness
- increased agility/thrust
- increased weapon damage
- healing (restore life bar)

## Damage

When blasters hit a powerup, they destroy it

When blasters hit a shield, they reduce the affected player's power level

When blasters hit a player without a shield, they reduce the player's health bar

Note that with wrap around screens, it is possible to shoot yourself and damage yourself.

## Dying

When a player's health bar reached zero, they explode and the player who killed them gets a point added to their score.  Killing yourself does not give a point.

## Winning

The round is over after 5 minutes or when a player gets 10 kills, whichever is first.

The winner ship moves to the center of the screen with lots of dancing particle effects in their color.  The other ships appear smaller at the edges of the screen facing towards the winner.

Large text states the winner such as "Keyboard Left Wins!"

Stats are shown under each player for the round:

- shots fired
- hit rate (as percentage)
- shield used (in seconds)
- hits taken (not counting shield)

And other special awards are also shown such as:

- most powerful (power generation)
- toughest (most shield upgrades)
- fastest (most speed boosts)
- most dangerous (weapon upgrades)
- etc

