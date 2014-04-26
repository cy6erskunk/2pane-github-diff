var debugEnabled = Boolean(process.env.DEBUG);

function debug() {
  if (debugEnabled) {
    console.log.apply(null, [].slice.apply(arguments));
  }
};

module.exports = debug;
