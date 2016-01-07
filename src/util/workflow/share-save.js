'use strict';

var merge = require('lodash').merge;
var each = require('lodash').each;
var Bluebird = require('bluebird');
var urlBuilder = require('../url-builder');
var buildGameHash = require('../json-builders/game');
var buildPlayerHash = require('../json-builders/player');
var saves = require('../models/saves');
var kickstartPromiseChain = require('../workflow/promise').kickstartPromiseChain;
var saveCommon = require('../workflow/save-common');
var urlShortenerService = require('../../services/url-shortener');

function shareSave (project, savesList) {
  return function buildJson (req) {
    var hostname = 'http://' + req.headers.host;
    var player = req.player;
    var saveId = req.params.saveId;

    function buildShareJson (save) {
      var json = {
        game: buildGameHash(project),
        player: buildPlayerHash(player),
        shareInfo: {
          fullUrl: urlBuilder(hostname).saves(save.id).join(),
          shortUrl: undefined,
          secret: undefined,
        },
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

      function addSecretToPayload (save) {
        return {
          secret: save.ensemble.secret
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
          saves.getById(save.id).then(addSecretToPayload),
          urlShortenerService.shorten(url).then(addShortUrlToLinks)
        ])
        .then(mergeResponses);
    }

    function passThroughPlayerAndHostname (save) {
      var hostname = 'http://' + req.headers.host;

      return [save, req.player, hostname];
    }

    return kickstartPromiseChain(savesList.get(saveId))
      .then(saveCommon.errorIfSaveDoesNotExist)
      .then(passThroughPlayerAndHostname)
      .spread(saveCommon.redirectIfPlayerIsNotInSave)
      .spread(saveCommon.redirectIfSinglePlayer)
      .spread(buildShareJson);
  };
}

module.exports = shareSave;