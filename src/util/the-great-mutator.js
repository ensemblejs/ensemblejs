import {isObject, isArray, isString, isEqual, mergeWith as merge, each, filter, get, set, includes, replace, map, reject, isEmpty, isFunction} from 'lodash';

const { read } = require('./dot-string-support');
const { clone } = require('./fast-clone');
const isPromise = require('is-promise');

const replaceArrayDontMerge = (a, b) => isArray(a) ? b : undefined;

function isValidDotStringResult(result) {
  if (result.length !== 2) {
    console.error(result, 'Dot.String support for state mutation expects an array of length 2.');
    return false;
  }
  if (!isString(result[0])) {
    console.error(result, 'Dot.String support for state mutation requires the first entry be a string.');
    return false;
  }
  if (result[1] === null) {
    return false;
  }
  if (isEqual(result[1], {})) {
    return false;
  }

  return true;
}

function ignoreResult (result) {
  if (result === undefined) {
    return true;
  }
  if (result === null) {
    return true;
  }
  if (isEqual(result, {})) {
    return true;
  }
  if (isEqual(result, [])) {
    return true;
  }

  return false;
}

const ImmutableThings = ['_id'];
function stripOutAttemptsToMutateTrulyImmutableThings (result) {
  ImmutableThings.forEach((immutableProp) => {
    if (result[immutableProp]) {
      delete result[immutableProp];
    }
  });

  return result;
}

function readAndWarnAboutMissingState (node, key) {
  var prop = isFunction(key) ? key(node) : read(node, key);

  if (prop === undefined) {
    console.error({ key }, 'Attempted to get state for dot.string and the result was undefined. The Great Mutator is based on a no-undefineds premise. Ensure your initial state mutation sets this property');
  }

  return prop;
}

function accessAndCloneState (node, key) {
  var prop = readAndWarnAboutMissingState(node, key);

  if (isObject(prop)) {
    return clone(prop);
  }

  return prop;
}

export default function mutator (initialState = {}) {
  let root = initialState;
  let pendingMerge = {};
  let changes = [];

  const unwrap = (path) => accessAndCloneState(root, path);

  function applyPendingMerges () {
    merge(root, pendingMerge, replaceArrayDontMerge);
    pendingMerge = {};
  }

  var applyResult;
  function applyPushAction (dotString, entries, value) {
    return applyResult(dotString, entries.concat([value]));
  }

  function applyPopAction (dotString, entries, value) {
    return set({}, dotString, reject(entries, value));
  }

  function applyReplaceAction (dotString, entries, value) {
    let mod = map(entries, entry => entry.id === value.id ? value : entry);
    return set({}, dotString, mod);
  }

  function applyOnArrayElement (dotString, value) {
    const pathToArray = dotString.split(':')[0];
    const id = parseInt(dotString.split(':')[1], 10);
    const restOfPath = replace(dotString.split(':')[1], /^[0-9]+\.?/, '');

    let entries = unwrap(pathToArray);

    let mod = map(entries, entry => {
      if (entry.id !== id) {
        return entry;
      }

      var nv = isFunction(value) ? value(
        isEmpty(restOfPath) ? entry : get(entry, restOfPath)
      ) : value;

      return isEmpty(restOfPath) ? merge(entry, nv) : set(entry, restOfPath, nv);
    });

    return set({}, pathToArray, mod);
  }

  const trailingHandlers = {
    '+': applyPushAction,
    '-': applyPopAction,
    '!': applyReplaceAction
  };

  applyResult = function (dotString, value) {
    let modifierSymbol = dotString[dotString.length - 1];
    var dotStringSansModifier = dotString.split(modifierSymbol)[0];

    var handler= trailingHandlers[modifierSymbol];
    if (handler) {
      let entries = unwrap(dotStringSansModifier);

      if (isFunction(value)) {
        console.error({dotString, prior: entries}, `Using a function on the ${modifierSymbol} operator is not supported. Remove the ${modifierSymbol} operator to acheive desired effect.`);

        return {};
      }

      return handler(dotStringSansModifier, entries, value);
    } else if (includes(dotString, ':')) {
      return applyOnArrayElement(dotString, value);
    }

    let valueToApply = value;
    if (isFunction(value)) {
      valueToApply = value(unwrap(dotString));
    }

    return set({}, dotString, valueToApply);
  };

  function mutateNonArray (toApply) {
    let result = toApply;
    if (isArray(result)) {
      if (!isValidDotStringResult(result)) {
        return;
      }

      result = applyResult(result[0], result[1]);
    }

    result = stripOutAttemptsToMutateTrulyImmutableThings(result);

    merge(pendingMerge, result, replaceArrayDontMerge);
  }

  const isArrayOfArrays = (result) => filter(result, isArray).length === result.length;

  let mutate;
  function mutateArrayOfArrays (result) {
    each(result, (resultItem) => mutate(resultItem));
  }

  mutate = (result) => {
    if (isArrayOfArrays(result)) {
      return mutateArrayOfArrays(result);
    } else if (isPromise(result)) {
      return result.then(value => mutate(value));
    }

    return mutateNonArray(result);
  };

  function getAt (key) {
    const prop = isFunction(key) ? key(root) : read(root, key);

    if (prop === undefined) {
      console.error({ key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
    }

    return prop;
  }

  const addToChangesThenMutate = result => {
    if (ignoreResult(result)) {
      return undefined;
    }

    changes.push(result);
    return mutate(result);
  };

  return {
    get: getAt,
    applyPendingMerges,
    mutate: addToChangesThenMutate,
    all: () => root,
    raw: () => root,
    flushChanges: () => changes.splice(0)
  };
}
