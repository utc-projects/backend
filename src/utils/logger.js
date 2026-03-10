const normalizeMeta = (meta = {}) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return { value: meta };
  }

  return Object.entries(meta).reduce((accumulator, [key, value]) => {
    if (value instanceof Error) {
      accumulator[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
};

const writeLog = (level, event, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...normalizeMeta(meta),
  };

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
    return;
  }

  if (level === 'warn') {
    console.warn(output);
    return;
  }

  console.log(output);
};

module.exports = {
  info(event, meta) {
    writeLog('info', event, meta);
  },
  warn(event, meta) {
    writeLog('warn', event, meta);
  },
  error(event, meta) {
    writeLog('error', event, meta);
  },
};
