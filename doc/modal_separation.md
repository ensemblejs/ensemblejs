##### Document: World State / Physics State / Render State
This is the story of the player's avatar. This avatar can be a circle, square, triangle or diamond. The world state dictates that we should store the _type_ of shape the avatar is. The physics engine may need to know additional things and the render engine may need to know additional things. Some of which is shared between two of the three.

Both the render engine and the physics engine get told of the world state from which they should derive their own representations.

The first approach that comes to mind is to define the avatar shape and the additional properties. So a circle would have _radius_ defined but _height_ and _length_ as undefined. A square would have _length_ but not _height_ or _radius_, etc.

I ruled this out because it violates the rule: **all properties must have a value at game start**.

A second approach is to have the render engine ask the physics engine for it's representation. Then we use that to derive our visual representation.

I don't like this because it couples our renderer to our physics engine. We can't guarantee consistency here, not all games have client-side physics. It goes against our original goal that the world state, physics state and render state are three separate models.

The third approach, and the one that I settled upon, is for world state to persist what is important. The physics and render engines generate their own representations from that. It feels a bit wordy but has a degree of clarity

```javascript
var merge = require('lodash').merge;

var shapeSpecificProperties = {
  circle: {
    radius: 5
  },
  square: {
    length: 10,
  },
  triangle: {
    height: 10
  },
  diamond: {
    length: 10
  }
};

function nextShape (id) {
  return config().shapes[id % config().shapes.length];
}

function seedPlayerState (playerId) {
  return {
    shape: nextShape(playerId),
    position: {x: 50, y: 50}
  };
}

function avatar (player) {
  var avatar = {
    id: player.id
  };

  merge(avatar, player);
  merge(avatar, shapeSpecificProperties[player.shape]);

  return avatar;
}

function physicsMap () {
  return {
    avatars: [{ sourceKey: 'players', via: avatar}]
  }
}

function createCircle (avatar) {
  var ball = new PIXI.Graphics();
  ball.drawCircle(0, 0, shapeSpecificProperties.circle.radius);
  ball.position.x = avatar.position.x;
  ball.position.y = avatar.position.y;

  return ball;
}

var shapeMakers = {
  'circle': createCircle,
  'triangle': function createTriangle () {},
  'square': function createSquare () {},
  'diamond': function createDiamond () {}
};

function createAvatar () {
  return shapeMakers[avatar.shape](avatar);
}

var avatars = {};
function addAvatar (id, player, stage) {
  avatars[id] = createAvatar(player);
  stage.addChild(avatars[id]);
}
```


