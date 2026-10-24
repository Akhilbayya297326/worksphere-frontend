// A late history response must never erase live or acknowledged chat messages.
export function mergeMessages(...groups) {
    const messages = [];
    const positions = new Map();
    for (const message of groups.flat()) {
        if (!message || typeof message.text !== 'string') continue;
        const keys = [message._id, message.clientId, message.id].filter(Boolean).map(String);
        const existing = keys.map(key => positions.get(key)).find(index => index !== undefined);
        const index = existing === undefined ? messages.length : existing;
        messages[index] = { ...messages[index], ...message };
        for (const key of keys) positions.set(key, index);
    }
    return messages.sort((left, right) => (Date.parse(left.timestamp) || 0) - (Date.parse(right.timestamp) || 0)).slice(-200);
}
