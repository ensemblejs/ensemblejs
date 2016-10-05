'use strict';

import {summerise} from '../../util/adapters/save-adapter';
const savesStore = require('../../util/models/saves');
const config = require('../../util/config');

module.exports = {
  type: 'SavesList',
  deps: ['DefinePlugin'],
  func: (define) => {
    let saves = [];

    const all = () => saves;
    const loaded = () => saves.filter((save) => save.loaded);
    const get = (id) => saves.find((save) => save.id === id);

    function add (save) {
      saves.push(save);
    }

    function remove (id) {
      saves = saves.filter((save) => save.id !== id);
    }

    define()('OnDatabaseReady', function SavesList () {
      return function fillWithPotentialSaves () {
        function registerAsUnloadedSave (allSavesForGame) {
          allSavesForGame.forEach(function (save) {
            save.loaded = false;

            add(save);
          });
        }

        savesStore.getByGame(config.get().game.id, summerise).then(registerAsUnloadedSave);
      };
    });

    define()('OnNewSave', function SavesList () {
      return function addSaveToListOfKnownSaves (save) {
        add(save);
      };
    });

    define()('OnSaveReady', function SavesList () {
      return function markSaveAsLoaded (saveToLoad) {
        const save = get(saveToLoad.id);
        save.loaded = true;
      };
    });

    return {
      all,
      add,
      remove,
      get,
      loaded
    };
  }
};
