const inputProcessed = {};

export function update (saveId, deviceId, packetId, frameId) {
  inputProcessed[saveId] = inputProcessed[saveId] || {};
  inputProcessed[saveId][deviceId] = { packetId, frameId };
}

export const getBySave = (saveId) => inputProcessed[saveId] || 0;
export const getBySaveAndDevice = (saveId, deviceId) => inputProcessed[saveId] && inputProcessed[saveId][deviceId] || { packetId: 0, frameId: 0};