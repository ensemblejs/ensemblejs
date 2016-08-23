import {isEqual, isString, filter, set, includes, replace, isEmpty, isFunction, merge} from 'lodash';
import {read} from './dot-string-support';
import {isArray} from './is';
const Immutable = require('immutable');

function recurseMapsOnly (prev, next) {
  return Immutable.Map.isMap(prev) ? prev.mergeWith(recurseMapsOnly, next) : next;
}

function isArrayOfArrays (result) {
  return filter(result, isArray).length === result.length;
}

function isValidDotStringResult(result) {
  if (result.length !== 2) {
    console.error({result}, 'Dot.String support for state mutation expects an array of length 2.');
    return false;
  }
  if (result[1] === undefined) {
    return false;
  }
  if (result[1] === null) {
    return false;
  }
  if (isEqual(result[1], {})) {
    return false;
  }
  if (!isString(result[0])) {
    console.error({result}, 'Dot.String support for state mutation requires the first entry be a string.');
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

function readAndWarnAboutMissingState (node, key) {
  const val = isFunction(key) ? key(node) : read(node, key);
  if (val === undefined) {
    console.error({ key }, 'Attempted to get state for dot.string but the result was undefined. Ensemble works best when state is always initialised to some value.');
  }

  return val;
}

export default function theGreatMutator (initialState = {}) {
  let root = Immutable.fromJS(initialState);
  let pendingMerge = {};

  const unwrap = (path) => readAndWarnAboutMissingState(root, path);

  const applyPendingMerges = () => {
    if (isEqual(pendingMerge, {})) {
      return;
    }

    root = root.mergeWith(recurseMapsOnly, pendingMerge);
    pendingMerge = {};
  };

  let applyResult;
  function applyPushAction (dotString, entries, value) {
    return applyResult(dotString, entries.push(value));
  }

  function applyPopAction (dotString, entries, value) {
    return applyResult(dotString, entries.filterNot(x => x.get('id') === value.id));
  }

  function applyReplaceAction (dotString, entries, value) {
    const mod = entries.map(x => x.get('id') === value.id ? value : x);

    return applyResult(dotString, mod);
  }

  function applyOnArrayElement (dotString, value) {
    const pathToArray = dotString.split(':')[0];
    const id = parseInt(dotString.split(':')[1], 10);
    const restOfPath = replace(dotString.split(':')[1], /^[0-9]+\.?/, '');

    let entries = unwrap(pathToArray);

    let mod = entries.map(entry => {
      if (entry.get('id') !== id) {
        return entry;
      }

      let nv = isFunction(value) ?
        value(isEmpty(restOfPath) ? entry : read(entry, restOfPath)) :
        value;

      return isEmpty(restOfPath) ?
        entry.mergeDeep(nv) :
        entry.setIn(restOfPath.split('.'), nv);
    });

    return set({}, pathToArray, mod);
  }

  const trailingHandlers = {
    '+': applyPushAction,
    '-': applyPopAction,
    '!': applyReplaceAction
  };

  applyResult = function (dotString, value) {
    const modifierSymbol = dotString[dotString.length - 1];
    const dotStringSansModifier = dotString.split(modifierSymbol)[0];

    const handler = trailingHandlers[modifierSymbol];
    if (handler) {
      const entries = unwrap(dotStringSansModifier);

      if (isFunction(value)) {
        console.error({ dotString, prior: entries }, `Using a function on the ${modifierSymbol} operator is not supported. Remove the ${modifierSymbol} operator to achieve desired effect.`);

        return {};
      }

      return handler(dotStringSansModifier, entries, value);
    } else if (includes(dotString, ':')) {
      return applyOnArrayElement(dotString, value);
    }

    const c = unwrap(dotString);
    return set({}, dotString, isFunction(value) ? value(c) : value);
  };

  function mutateNonArray (result) {
    let resultToMerge = result;

    if (isArray(result)) {
      if (!isValidDotStringResult(result)) {
        return;
      }

      resultToMerge = applyResult(result[0], result[1]);
    }

    pendingMerge = merge(pendingMerge, resultToMerge);
  }

  let mutate;
  function mutateArrayOfArrays (results) {
    results.forEach(result => mutate(result));
  }

  mutate = (result) => {
    if (ignoreResult(result)) {
      return false;
    }

    if (isArrayOfArrays(result)) {
      return mutateArrayOfArrays(result);
    }

    return mutateNonArray(result);
  };

  const mutateSync = result => {
    mutate(result);
    applyPendingMerges();
  };

  const mutateBatch = results => {
    results.forEach(mutate);
  };

  const mutateBatchSync = results => {
    mutateBatch(results);
    applyPendingMerges();
  };

  return {
    all: () => root,
    applyPendingMerges,
    get: (key) => readAndWarnAboutMissingState(root, key),
    mutate,
    mutateSync,
    mutateBatch,
    mutateBatchSync,
    set: (newRoot) => (root = newRoot)
  };
}