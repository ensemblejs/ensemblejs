'use strict';

var contains = require('lodash').contains;
var config = require('../../util/config').get();
var buildAcceptHash = require('../../util/request-handling').buildAcceptHash;
var redirectTo = require('../../util/request-handling').redirectTo;
var buildRequestHandler = require('../../util/request-handling').buildRequestHandler2;
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

          return save;
        });
    }

    function redirectIfSaveHasNoSpace (save, player, hostname) {
      return gamePlayers().doesSaveHaveSpaceForPlayer(save.id)
        .then(function (gameHasSpace) {
          if (!gameHasSpace) {
            return redirectTo(urlBuilder(hostname).saves(save.id).full());
          }

          return save;
        });
    }

    function redirectIfSecretIsIncorrect (save, player, hostname, secret) {
      return games().isSecretCorrect(save.id, secret)
        .then(function (secretIsCorrect) {
          if (!secretIsCorrect) {
            return redirectTo(urlBuilder(hostname).saves(save.id).join());
          }

          return save;
        });
    }

    function addPlayer (project, save, player) {
      return gamePlayers().addPlayer(project.id, save.id, player._id);
    }

    function makeAddPlayerHandler (project) {
      return function buildJson (req) {
        var hostname = 'http://' + req.headers.host;

        return startPromiseChangeFromSync(savesList().get(req.params.saveId))
          .then(errorIfSaveDoesNotExist)
          .then(function (save) {
            return redirectIfPlayerIsInSave(save, req.player, hostname);
          })
          .then(function (save) {
            return redirectIfSaveHasNoSpace(save, req.player, hostname);
          })
          .then(function (save) {
            return redirectIfSaveHasNoSpace(save, req.player, hostname);
          })
          .then(function withPublicGames (save) {
            return games().isSavePublic(save.id)
              .then(function (saveIsPublic) {
                if (saveIsPublic) {
                  return addPlayer(project, save, req.player, hostname)
                    .then(function () {
                      return redirectTo(urlBuilder(hostname).saves(save.id).continue());
                    });
                }

                return save;
              });
          })
          .then(function withPrivateGames (save) {
            if (!req.body.secret) {
              return returnRequestError(400, 'Missing secret');
            } else {
              return redirectIfSecretIsIncorrect(save, req.player, hostname, req.body.secret);
            }
          })
          .then(function addPlayerAndRedirectToGame (save) {
            return addPlayer(project, save, req.player, hostname)
              .then(function () {
                return redirectTo(urlBuilder(hostname).saves(save.id).continue());
              });
          });
      };
    }

    function makeJoinSaveJsonBuilder (project) {
      return function buildJson (req) {
        var hostname = 'http://' + req.headers.host;

        return startPromiseChangeFromSync(savesList().get(req.params.saveId))
          .then(errorIfSaveDoesNotExist)
          .then(function (save) {
            return redirectIfPlayerIsInSave(save, req.player, hostname);
          })
          .then(function (save) {
            return redirectIfSaveHasNoSpace(save, req.player, hostname);
          })
          .then(function () {
            return buildJoinJson(project, req.player, req.params.saveId);
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
        buildRequestHandler(
          makeNewSaveHandler(project),
          buildAcceptHash('ignore.jade')
        )
      );

      app.post(
        '/saves/:saveId/join',
        buildRequestHandler(
          makeAddPlayerHandler(project),
          buildAcceptHash('ignore.jade')
        )
      );

      app.get(
        '/saves/:saveId',
        buildRequestHandler(
          makeContinueSaveJsonBuilder(project),
          buildAcceptHash('primary.jade')
        )
      );

      app.get(
        '/saves/:saveId/join',
        buildRequestHandler(
          makeJoinSaveJsonBuilder(project),
          buildAcceptHash('join.jade')
        )
      );

      app.get(
        '/saves/:saveId/full',
        buildRequestHandler(
          makeSaveFullJsonBuilder(),
          buildAcceptHash('full.jade')
        )
      );

      app.get(
        '/saves/:saveId/share',
        buildRequestHandler(
          makeShareSaveJsonBuilder(project),
          buildAcceptHash('share.jade')
        )
      );
    }

    return {
      configure: configure
    };
  }
};