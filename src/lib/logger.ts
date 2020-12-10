
class Logger {
  constructor(private scope: string) {

  }

  public log(...args): void {
    // @ts-ignore
    console.log(`${this.scope}: `, ...args)
  }
}

export const logger = new Logger('gitmate')

