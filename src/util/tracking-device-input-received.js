const inputProcessed = {};

export function update (saveId, playerId, deviceNumber, packetId, frameId) {
  const forPlayerAndDevice = (record) => {
    return record.playerId === playerId && record.deviceNumber === deviceNumber
  };

  inputProcessed[saveId] = inputProcessed[saveId] || [];

  const record = inputProcessed[saveId].find(forPlayerAndDevice);
  if (record) {
    record.packetId = packetId;
    record.frameId = frameId
  } else {
    inputProcessed[saveId].push({ playerId, deviceNumber, packetId, frameId })
  }
}

export const getBySave = (saveId) => inputProcessed[saveId] || [];

export const getBySaveAndPlayer = (saveId, playerId) => {
  const allForPlayer = (record) => record.playerId === playerId;

  const result = inputProcessed[saveId] && inputProcessed[saveId].filter(allForPlayer);
  if (result && result.length > 0) {
    return result;
  }

  return [{ playerId, deviceNumber: 1, packetId: 0, frameId: 0}]
};
