'use strict';

function parseCliArgs(args) {
  const options = { publicMode: false, help: false };
  for (const arg of args) {
    if (arg === '--public') options.publicMode = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function resolveHost(options, environment = process.env) {
  if (options.publicMode) return '0.0.0.0';
  return environment.AWM_HOST || '127.0.0.1';
}

module.exports = { parseCliArgs, resolveHost };
