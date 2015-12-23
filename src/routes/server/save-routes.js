'use strict';

var contains = require('lodash').contains;
var config = require('../../util/config').get();
var buildPostRequestHandler = require('../../util/request-handling').buildPostRequestHandler;
var redirectTo = require('../../util/request-handling').redirectTo;
var buildGetRequestHandler = require('../../util/request-handling').buildGetRequestHandler;
var startPromiseChangeFromSync = require('../../util/request-handling').startPromiseChangeFromSync;
var returnRequestError = require('../../util/request-handling').returnRequestError;

var urlShortenerService = require('../../services/url-shortener');
var urlBuilder = require('../../util/url-builder');
var Bluebird = require('bluebird');
var merge = require('lodash').merge;
var each = require('lodash').each;

function buildGameHash (game) {
  return {
    id: game.id,
    name: game.name,
  };
}

function buildPlayerHash (player) {
  return {
    id: player._id,
    name: player.name
  };
}

function errorIfSaveDoesNotExist (save) {
  if (!save) {
    return returnRequestError(404, 'This game does not exist');
  }

  return save;
}

module.exports = {
  type: 'Routes',
  deps: ['UUID', 'On', 'GamesList', 'GamePlayersDataModel', 'GamesDataModel'],
  func: function Routes (uuid, on, savesList, gamePlayers, games) {

    function makeNewSaveHandler (project) {
      return function buildJson (req) {
        var hostname = 'http://' + req.headers.host;

        if (!req.body.mode) {
          return returnRequestError(400, 'Missing mode');
        }
        if (!contains(project.modes, req.body.mode)) {
          return returnRequestError(400, 'Invalid mode. Supported modes are: ' + project.modes.join());
        }

        var newSaveGame = {
          id: uuid().gen(),
          mode: req.body.mode
        };

        on().newGame(newSaveGame);
        on().gameReady(newSaveGame);

        return gamePlayers().addPlayer(project.id, newSaveGame.id, req.player._id)
          .then(function () {
            return redirectTo(urlBuilder(hostname).saves(newSaveGame.id).share());
          });
      };
    }

    function buildContinueSaveJson (save) {
      return {
        mode: save.mode,
        dashboard: config.ensemble.dashboard,
        debugMode: config.debug.enabled
      };
    }

    function redirectIfPlayerIsNotInSave (save, player, hostname) {
      return gamePlayers().isPlayerInSave(save.id, player._id)
        .then(function (playerIsInSave) {
          if (!playerIsInSave) {
            return redirectTo(urlBuilder(hostname).saves(save.id).join());
          }

          return save;
        });
    }

    function makeContinueSaveJsonBuilder () {
      return function buildJson (req) {
        var player = req.player;
        var hostname = 'http://' + req.headers.host;

        return startPromiseChangeFromSync(savesList().get(req.params.saveId))
          .then(errorIfSaveDoesNotExist)
          .then(function (save) {
            return redirectIfPlayerIsNotInSave(save, player, hostname);
          })
          .then(function loadSaveIfNotLoaded (save) {
            if (!save.loaded) {
              on().loadGame(save);
            }

            return save;
          })
          .then(function (save) {
            return buildContinueSaveJson(save);
          });
      };
    }

    function buildJoinJson (project, player, saveId) {
      return {
        name: project.name,
        player: {
          name: player.name
        },
        join: {
          method: 'POST',
          what: '/save/join',
          uri: urlBuilder().saves(saveId).join(),
          name: 'Join Game'
        }
      };
    }

    function redirectIfPlayerIsInSave (save, player, hostname) {
      return gamePlayers().isPlayerInSave(save.id, player._id)
        .then(function (playerIsInSave) {
          if (playerIsInSave) {
            return redirectTo(urlBuilder(hostname).saves(save.id).continue());
          }

          return [save, player, hostname];
        });
    }

    function redirectIfSaveHasNoSpace (save, player, hostname) {
      return gamePlayers().doesSaveHaveSpaceForPlayer(save.id)
        .then(function (gameHasSpace) {
          if (!gameHasSpace) {
            return redirectTo(urlBuilder(hostname).saves(save.id).full());
          }

          return [save, player, hostname];
        });
    }

    function redirectIfSecretIsIncorrect (save, player, hostname, secret) {
      return games().isSecretCorrect(save.id, secret)
        .then(function (secretIsCorrect) {
          if (!secretIsCorrect) {
            return redirectTo(urlBuilder(hostname).saves(save.id).join());
          }

          return [save, player, hostname];
        });
    }

    function addPlayer (project, save, player) {
      return gamePlayers().addPlayer(project.id, save.id, player._id);
    }

    function errorIfSecretIsNotSupplied (save, player, hostname, secret) {
      if (!secret) {
        return returnRequestError(400, 'Missing secret');
      }

      return [save, player, hostname, secret];
    }

    function addPlayer2 (save, player, hostname, project) {
      return gamePlayers().addPlayer(project.id, save.id, player._id)
        .then(function() {
          return [save, player, hostname, project];
        });
    }

    function redirectToContinueGame (save, player, hostname) {
      return redirectTo(urlBuilder(hostname).saves(save.id).continue());
    }

    function stopPassingSecretThrough (save, player, hostname) {
      return [save, player, hostname];
    }

    function stopPassingProjectThrough (save, player, hostname) {
      return [save, player, hostname];
    }

    function withPublicGames (save, player, hostname, project) {
      return games().isSavePublic(save.id)
        .then(function (saveIsPublic) {
          if (saveIsPublic) {
            return addPlayer(project, save, player, hostname)
              .then(function () {
                return redirectTo(urlBuilder(hostname).saves(save.id).continue());
              });
          }

          return [save, player, hostname];
        });
    }

    function makeAddPlayerHandler (project) {
      return function buildJson (req) {

        function passThroughPlayerAndHostname (save) {
          var hostname = 'http://' + req.headers.host;

          return [save, req.player, hostname];
        }

        function withPrivateGames (save, player, hostname) {
          return [save, player, hostname];
        }

        function passThroughSecret (save, player, hostname) {
          return [save, player, hostname, req.body.secret];
        }

        function passThroughProject (save, player, hostname) {
          return [save, player, hostname, project];
        }

        return startPromiseChangeFromSync(savesList().get(req.params.saveId))
          .then(errorIfSaveDoesNotExist)
          .then(passThroughPlayerAndHostname)
          .spread(redirectIfPlayerIsInSave)
          .spread(redirectIfSaveHasNoSpace)
          .spread(passThroughProject)
          .spread(withPublicGames)
          .spread(stopPassingProjectThrough)
          .spread(withPrivateGames)
          .spread(passThroughSecret)
          .spread(errorIfSecretIsNotSupplied)
          .spread(redirectIfSecretIsIncorrect)
          .spread(stopPassingSecretThrough)
          .spread(passThroughProject)
          .spread(addPlayer2)
          .spread(redirectToContinueGame);
      };
    }

    function makeJoinSaveJsonBuilder (project) {
      return function buildJson (req) {

        function passThroughPlayerAndHostname (save) {
          var hostname = 'http://' + req.headers.host;

          return [save, req.player, hostname];
        }

        return startPromiseChangeFromSync(savesList().get(req.params.saveId))
          .then(errorIfSaveDoesNotExist)
          .then(passThroughPlayerAndHostname)
          .spread(function (save, player, hostname) {
            console.log (save, player, hostname);
            return [save, player, hostname];
          })
          .spread(redirectIfPlayerIsInSave)
          .spread(redirectIfSaveHasNoSpace)
          .spread(function (save, player) {
            return buildJoinJson(project, player, save.id);
          });
      };
    }

    function makeShareSaveJsonBuilder (project) {
      return function buildJson (req) {
        var hostname = 'http://' + req.headers.host;
        var player = req.player;
        var saveId = req.params.saveId;

        function redirectIfSinglePlayer (save) {
          return games().get(save.id).then(function (game) {
            if (config.maxPlayers(game.ensemble.mode) === 1) {
              return redirectTo(urlBuilder(hostname).saves(saveId).continue());
            }

            return save;
          });
        }

        function buildShareJson (save) {
          var json = {
            name: project.name,
            game: buildGameHash(project),
            player: buildPlayerHash(player),
            shareUrl: urlBuilder(hostname).saves(save.id).join(),
            shortUrl: undefined,
            secret: undefined,
            links: [{
              what: '/save/continue',
              uri: urlBuilder(hostname).saves(save.id).continue(),
              name: 'Now Play that game',
              method: 'GET'
            }, {
              what: '/save/join',
              uri: urlBuilder(hostname).saves(save.id).join(),
              name: urlBuilder(hostname).saves(save.id).join(),
              method: 'GET'
            }, {
              what: '/game',
              uri: urlBuilder(hostname).game().index(),
              name: hostname + '/',
              method: 'GET'
            }]
          };

          function addShortUrlToLinks (response) {
            if (!response) {
              return {};
            }

            return {
              shortUrl: response.data.url,
              links: [{
                what: '/save/join/shortUrl',
                uri: response.data.url,
                name: response.data.url,
                method: 'GET'
              }]
            };
          }

          function addSecretToPayload (game) {
            return {
              secret: game.ensemble.secret
            };
          }

          function mergeResponses (jsonReponses) {
            each(jsonReponses, function (jsonReponse) {
              merge(json, jsonReponse, true);
            });

            return json;
          }

          var url = urlBuilder(hostname).saves(save.id).join();
          return Bluebird
            .all([
              games().get(save.id).then(addSecretToPayload),
              urlShortenerService.shorten(url).then(addShortUrlToLinks)
            ])
            .then(mergeResponses);
        }

        return startPromiseChangeFromSync(savesList().get(saveId))
          .then(errorIfSaveDoesNotExist)
          .then(function (save) {
            return redirectIfPlayerIsNotInSave(save, player, hostname);
          })
          .then(redirectIfSinglePlayer)
          .then(buildShareJson);
      };
    }

    function buildSaveFullJson () {
      return {
        title: config.game.title
      };
    }

    function makeSaveFullJsonBuilder () {
      return function buildJson (req) {
        return startPromiseChangeFromSync(savesList().get(req.params.saveId))
          .then(errorIfSaveDoesNotExist)
          .then(buildSaveFullJson);
      };
    }

    function configure (app, project) {
      app.post(
        '/saves',
        buildPostRequestHandler(makeNewSaveHandler(project))
      );

      app.post(
        '/saves/:saveId/join',
        buildPostRequestHandler(makeAddPlayerHandler(project))
      );

      app.get(
        '/saves/:saveId',
        buildGetRequestHandler(makeContinueSaveJsonBuilder(project), 'primary.jade')
      );

      app.get(
        '/saves/:saveId/join',
        buildGetRequestHandler(makeJoinSaveJsonBuilder(project), 'join.jade')
      );

      app.get(
        '/saves/:saveId/full',
        buildGetRequestHandler(makeSaveFullJsonBuilder(), 'full.jade')
      );

      app.get(
        '/saves/:saveId/share',
        buildGetRequestHandler(makeShareSaveJsonBuilder(project), 'share.jade')
      );
    }

    return {
      configure: configure
    };
  }
};