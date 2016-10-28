import flatten from 'lodash/flatten';
import moment from 'moment';
import numeral from 'numeral';

const p = (v) => v ? numeral(v).format('0.00') : 0;

let times = {};
let currentKey = [];
let config = {
  profile: false,
  minimumPercentageOfAll: 0,
  hz: 100
}

export const reset = () => {
  times = {};
  currentKey = [];
}

const SEPARATOR = '.';
const keyed = (key) => `${currentKey.concat(key).join(SEPARATOR)}`

const seed = (key) => {
  if (times[keyed(key)]) {
    Object.keys(times[keyed(key)].children).forEach((childKey) => {
      seed(childKey, times[keyed(key)].children);
    });
  }

  times[keyed(key)] = {
    start: null,
    times: []
  }
}

const ensureSeeded = (key) => {
  if (!times[keyed(key)]) {
    seed(key);
  }
}

export const start = (key) => {
  if (!config.profile) {
    return;
  }

  ensureSeeded(key)

  times[keyed(key)].start = moment().valueOf();
  currentKey.push(key);
}

export const stop = (key) => {
  if (!config.profile) {
    return;
  }

  currentKey.pop()

  times[keyed(key)].times.push(moment().valueOf() - times[keyed(key)].start);
}

export const results = () => times;

const sum = (t, a) => t + a;

const SnarkyNoName = 'anonymous-try-naming-things';

export const breakdown = (key, configOverrides, totalOfParent = null) => {
  if (!config.profile) {
    return;
  }

  const opts = { ...config, ...configOverrides };

  const alreadyProcessed = (timerKey) => !timerKey.replace(`${key}${SEPARATOR}`, '').includes(SEPARATOR);
  const selectChildren = (timerKey) => timerKey.startsWith(key) && timerKey !== key;

  const data = times[key];

  const total = data.times.reduce(sum, 0);
  let totalOfChildren = 0;

  const childKeys = Object.keys(times).filter(selectChildren).filter(alreadyProcessed);
  const children = childKeys.map((timerKey) => {
    const totalOfChild = times[timerKey].times.reduce(sum, 0);
    totalOfChildren += totalOfChild;

    const nameOfChild = timerKey.replace(`${key}${SEPARATOR}`, '');

    const percentOfAll = totalOfChild / (totalOfParent || total) * 100;
    if (percentOfAll < opts.minimumPercentageOfAll) {
      return null;
    }

    return {
      [nameOfChild]: {
        total: totalOfChild,
        calls: times[timerKey].times.length,
        percentOfAll,
        ...breakdown(timerKey, opts, totalOfParent || total)
      }
    }
  }).filter((child) => child !== null).map((child) => {
    const key2 = Object.keys(child)[0];
    return {
      [key2]: {
        ...child[key2],
        percent: child[key2].total / total * 100
      }
    };
  })

  if (children.length > 0) {
    const unknownDuration = (total - totalOfChildren);
    const percentOfAll = unknownDuration / (totalOfParent || total) * 100;

    if (percentOfAll >= opts.minimumPercentageOfAll) {
      children.push({
        unknown: {
          percent: unknownDuration / total * 100,
          percentOfAll,
          total: unknownDuration
        }
      })
    }

    return {
      calls: data.times.length,
      total,
      children,
      percent: totalOfParent === null ? 100 : total / totalOfParent * 100,
      percentOfAll: totalOfParent === null ? 100 : total / totalOfParent * 100
    };
  }

  return {
    calls: data.times.length,
    total,
    percent: totalOfParent === null ? 100 : total / totalOfParent * 100,
    percentOfAll: totalOfParent === null ? 100 : total / totalOfParent * 100
  };
}

const TotalIndex = 1;
const PercentageOfAllIndex = 6;

const getTableFormatFor = (key, totalOfParent = null) => {
  const alreadyProcessed = (timerKey) => !timerKey.replace(`${key}${SEPARATOR}`, '').includes(SEPARATOR);
  const selectChildren = (timerKey) => timerKey.startsWith(key) && timerKey !== key;

  const data = times[key];
  if (data === null) {
    return [];
  }

  const total = data.times.reduce(sum, 0);
  let totalOfChildren = 0;

  const childKeys = Object.keys(times).filter(selectChildren).filter(alreadyProcessed);
  const children = flatten(childKeys.map((timerKey) => {
    const totalOfChild = times[timerKey].times.reduce(sum, 0);
    totalOfChildren += totalOfChild;

    const percentOfAll = p(totalOfChild / (totalOfParent || total) * 100);
    const calls = times[timerKey].times.length;
    const min = Math.min(...times[timerKey].times);
    const avg = 0;
    const max = Math.max(...times[timerKey].times);
    return [
      [timerKey, totalOfChild, calls, min, avg, max, null, percentOfAll]
    ].concat(getTableFormatFor(timerKey, totalOfParent || total))
  })).map((child) => {
    const percent = p(child[TotalIndex] / total * 100);
    child[PercentageOfAllIndex] = child[PercentageOfAllIndex] || percent;
    return child;
  });

  if (children.length > 0) {
    const unknownDuration = (total - totalOfChildren);
    const percentOfUnknown = p(unknownDuration / total * 100);
    const percentOfAllUnknown = p(unknownDuration / (totalOfParent || total) * 100);

    children.push([`${key}${SEPARATOR}unknown`, unknownDuration, '-', '-', '-', '-',percentOfUnknown, percentOfAllUnknown]);
  }

  return children;
}

const Headings = ['Name', 'Total', 'Calls', 'Min', 'Avg', 'Max', 'Percent of Parent', 'Percent of All'];

const getTabularForKey = (key, opts) => {
  const data = times[key];
  if (data === null) {
    return [];
  }

  const calls = data.times.length;
  const total = data.times.reduce(sum, 0);
  const min = Math.min(...data.times);
  const avg = 0;
  const max = Math.max(...data.times);
  const percent = p(100);

  return [[key, total, calls, min, avg, max, percent, percent]].concat(getTableFormatFor(key).filter((rows) => rows[PercentageOfAllIndex] >= opts.minimumPercentageOfAll));
}

export const tabular = (filterKey, configOverrides = {}) => {
  if (!config.profile) {
    return;
  }

  const opts = { ...config, ...configOverrides };

  if (filterKey === undefined) {
    return Object.keys(times)
                  .filter((key) => !key.includes(SEPARATOR))
                  .map((key) => getTabularForKey(key, opts))
                  .reduce((arr, rows) => arr.concat(rows), [Headings]);
  }

  return [Headings].concat(getTabularForKey(filterKey, opts));
}

const wrapCount = {};

export const wrap = (f) => {
  if (!config.profile) {
    return f;
  }

  const name = (f && f.name) || SnarkyNoName;

  wrapCount[name] = config.hz;

  return (...params) => {
    wrapCount[name] += 1;

    if (wrapCount[name] >= config.hz) {
      wrapCount[name] -= config.hz

      start(name);
      const ret = f(...params);
      stop(name);
      return ret;
    }

    return f(...params);
  }
};

export const configure = (opts) => {
  config = {
    ...config,
    ...opts
  }
};
