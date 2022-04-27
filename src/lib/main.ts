#!/usr/bin/env node

import { fetch } from './fetch';
import { logger } from './logger';

export const run = async () => {
  const args: readonly string[] = process.argv.slice(2);
  const selectedCommand: string = args[0];

  switch (selectedCommand) {
    case 'fetch': {
      const additionalArgs: readonly string[] | undefined = args.slice(1)
      if (additionalArgs.length > 1) {
        return logger.log('fetch only supports a single argument (target origin)');
      }
      await fetch(additionalArgs);
      return;
    }
    default: {
      return logger.log('no command supplied. Try "help" for a list of commands.');
    }
  }
};
