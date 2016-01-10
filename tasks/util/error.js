'use strict';

var onError = function onError (error) {
    console.log(error);
    this.emit('end');
    throw error;
};

module.exports = onError;