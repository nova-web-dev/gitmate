#!/usr/bin/env node

import { fetch } from './fetch';
import { logger } from './logger';

export const run = async () => {
  const args: readonly string[] = process.argv.slice(2)
  const fn: string = args[0];

  switch(fn) {
    case 'fetch': {
      await fetch()
      return
    }
    default: {
      return logger.log('no command supplied. Try "help" for a list of commands.')
    }
  }
}
