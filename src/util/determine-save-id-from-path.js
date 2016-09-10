import last from 'lodash/last';

const PLUCK_SAVE_ID = /saves\/([a-zA-Z0-9]+)/;

export default function determineSaveIdFromPath (path) {
  const matches = path.match(PLUCK_SAVE_ID);
  return matches ? matches[1] : null;
}