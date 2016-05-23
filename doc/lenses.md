- I don't like how I have to specify the root of an array to wait for a change on a specific element.

```javascript
tracker().onChangeOf('players', updateDeaths);
tracker().onChangeOf('players', updateTime);
tracker().onElementAdded('players', addTimeToLeaderboard, [stage]);
tracker().onElementAdded('players', removeTimeFromLeaderboard, [stage]);
```

options:

When we know the id e.g. like the player for the device.
```javascript
function updateTime (time, lastTime);

tracker().onChangeOf('players:1.amazing.time', updateTime);
```

When we want any change e.g
```javascript
function updateDeaths (id, deaths, lastDeaths)

tracker().onChangeOf('players*.amazing.deaths', updateDeaths);
```

Or we can use lenses (done):
```javascript
function updateTime (time, lastTime);

tracker().onChangeOf('lens:deaths', updateDeaths);
```





- Try the idea of defining _lenses_ like in Haskell where you can specify a reduce operation and when the _result_ of that changes your callback is called and you get notified. So to work out the **deaths** you write a reduce like

```javascript
[
  deaths: { with: 'players', via: players => { reduce(players, (t, p) => t+=p)); }},
]
```

One could then drive off, the tracker system:

```javascript
tracker().onChangeOf('lens:deaths', updateDeathCount);
```

Or, for a top 10 leaderboard:

```javascript
var leaderboardSize = 10;
[
  leaderboard: { with: 'players', via players => {
    let times = map(players, (player, index) => {
      return {
        id: `${player.id}-${index}`,
        time: player.amazing.time
      };
    });

    return take(sortBy(times, 'time'), leaderboardSize);
  }}
]
```

And.

```javascript
tracker().onElementAdded('leaderboard', addTimeToLeaderboard);
tracker().onElementRemoved('leaderboard', removeTimeFromLeaderboard);
tracker().onElementChanged('leaderboard', moveTimeToNewPosition);
```


- How the trigger system can be used with lenses.