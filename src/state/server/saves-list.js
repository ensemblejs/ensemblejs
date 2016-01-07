'use strict';

var first = require('lodash').first;
var filter = require('lodash').filter;
var reject = require('lodash').reject;
var each = require('lodash').each;
var savesStore = require('../../util/models/saves');
var config = require('../../util/config');

module.exports = {
  type: 'SavesList',
  deps: ['DefinePlugin'],
  func: function (define) {
    var saves = [];

    function all () {
      return saves;
    }

    function loaded () {
      return filter(saves, {loaded: true});
    }

    function add (save) {
      saves.push(save);
    }

    function remove (id) {
      saves = reject(saves, { id: id });
    }

    function get (id) {
      return first(filter(saves, { id: id }));
    }

    define()('InternalState', function SavesList () {
      return {
        SavesList: {
          count: function count () { return saves.length; }
        }
      };
    });

    define()('OnDatabaseReady', function SavesList () {
      return function fillWithPotentialSaves () {
        function registerAsUnloadedSave (allSavesForGame) {
          each(allSavesForGame, function (save) {
            save.loaded = false;

            add(save);
          });
        }

        savesStore.getByGame(config.get().game.id).then(registerAsUnloadedSave);
      };
    });

    define()('OnNewSave', function SavesList () {
      return function addSave (save) {
        add(save);
      };
    });

    define()('OnSaveReady', function SavesList () {
      return function markSaveAsLoaded (saveToLoad) {
        var save = get(saveToLoad.id);
        save.loaded = true;
      };
    });

    return {
      all: all,
      add: add,
      remove: remove,
      get: get,
      loaded: loaded
    };
  }
};
