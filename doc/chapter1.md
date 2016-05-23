# Client Side Prediction
The second fallacy of distributed computing 

## Client
### Before
- Replaying local input on top of last known server state.

### On
- Physics
- Collisions
- Time based changes

### After
- Nothing the player cares about
- All sync


Time Based Changes
- If there have been 5 frames since the last known server state s@5 and each frame adds 1. We should have 10 on the client, but what we really have is 



## Developing
If we throttle the server to 1s push events, we should only ever get each event once. The client should run smoothly and then once every second it course corrects. Course correction is the responsibility of entity-interpolation.

