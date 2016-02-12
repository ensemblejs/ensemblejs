'use strict';

export function bootstrapPlayers (database) {
  return database.create('players')
    .then(() => database.createView('players', {
      views: {
        all: {
          map: 'function(doc) { emit(null, doc) }'
        },
        byDevice: {
          map: 'function(doc) { if (doc.deviceIds.length > 0) { for(var i in doc.deviceIds) { emit(doc.deviceIds[i], doc); } } }'
        }
      }
    }));
}

export function strapbootPlayers (database) {
  return database.destroy('players');
}

export function bootstrapDevices (database) {
  return database.create('devices');
}

export function strapbootDevices (database) {
  return database.destroy('devices');
}

export function bootstrapSaves (database) {
  return database.create('saves')
    .then(() => database.createView('saves', {
      views: {
        byGame: {
          map: 'function(doc) { emit(doc.ensemble.gameId, doc); }'
        }
      }
    }))
    .then(() => database.create('saves_metadata'))
    .then(() => database.createView('saves_metadata', {
      views: {
        byPlayer: {
          map: 'function(doc) { if (doc.playerIds.length > 0) { for(var i in doc.playerIds) { emit([doc.id, doc.playerIds[i]], doc); } } }'
        },
        byGameAndPlayer: {
          map: 'function(doc) { if (doc.playerIds.length > 0) { for(var i in doc.playerIds) { emit([doc.gameId, doc.playerIds[i]], doc); } } }'
        }
      }
    }));
}

export function strapbootSaves (database) {
  return database.destroy('saves')
    .then(() => database.destroy('saves_metadata'));
}

export function bootstrap (database) {
  return bootstrapSaves(database)
    .then(() => bootstrapPlayers(database))
    .then(() => bootstrapDevices(database));
}

export function strapboot (database) {
  return strapbootSaves(database)
    .then(() => strapbootPlayers(database))
    .then(() => strapbootDevices(database));
}