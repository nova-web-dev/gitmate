const useScope = false;

class Logger {
  constructor(private scope: string) {}

  public log(...args): void {
    // @ts-ignore
    if (useScope) {
      console.log(`${this.scope}: `, ...args)
    } else {
      console.log(...args)
    }
  }
}

export const logger = new Logger('gitmate')

