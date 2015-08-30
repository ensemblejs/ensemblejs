'use strict';

var extension = '.jade';

function handleEphemeralSingleMode (req, res) {
  res.render('primary' + extension, { mode: 'game' });
}

function handleEphemeralMultiModeIndex (req, res) {
  res.render('index' + extension);
}

function handleEphemeralMultiMode (req, res) {
  var mode = req.params.mode;
  res.render('primary' + extension, { mode: mode });
}

function configureSingleModeGame (app) {
  app.get('/', handleEphemeralSingleMode);
}

function configureMultiModeGame (app) {
  app.get('/', handleEphemeralMultiModeIndex);
  app.get('/:mode/', handleEphemeralMultiMode);
}

module.exports = {
  type: 'Routes',
  deps: ['Config'],
  func: function Routes (config) {

    function getConfig (req, res) {
      res.json(config());
    }

    function configure (app, modes) {
      app.get('/config', getConfig);

      if (modes.length > 0) {
        configureMultiModeGame(app);
      } else {
        configureSingleModeGame(app);
      }
    }

    return {
      configure: configure
    };
  }
};