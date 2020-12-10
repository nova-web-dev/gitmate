import { exec } from 'child_process'
import Git from 'nodegit'

import { logger } from './logger'

const executeCommand = async (command: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    exec(command, (err) => {
      if (err) reject(err)
      resolve(null)
    })
  })
}

const getCurrentBranch = async (): Promise<string> => {
  const repository = await Git.Repository.open("./")
  const currentBranch = await repository.getCurrentBranch()
  return currentBranch.toString().replace('refs/heads/', '')
}

const mapSeries = async (iterable, action) => {
  for (const x of iterable) {
    await action(x)
  }
}

export const fetch = async (): Promise<void> => {
  const errors = []

  const hasError = () => {
    return errors.length > 0
  }
  // Config
  const branchesToFetch = ['master', 'develop']
  const shouldFetchOrigin = true
  const currentBranch: string = await getCurrentBranch()

  logger.log(`current branch: "${currentBranch}"`)

  const commandFetchOrigin = `git fetch origin`
  const commandFetchBranches: string[] = branchesToFetch.map((currentBranch: string) => {
    return `git checkout ${currentBranch} && git pull`
  })
  // const commandCheckoutDevelop = 'git checkout develop'
  const commandGitBranch = 'git branch'
  const commandGitStatus = 'git status'
  const commandCheckoutCurrentBranch = `git checkout ${currentBranch}`

  if (shouldFetchOrigin) {
    logger.log('fetching origin...')
    try {
      const output = await executeCommand(commandFetchOrigin)
      logger.log('output: ', output)
      logger.log('fetch complete.')
    } catch (ex) {
      logger.log('error: unable to fetch origin.')
      errors.push(ex)
    }
  }

  if (hasError()) {
    process.exit(1)
  }

  logger.log('fetching branches: ', branchesToFetch)
  await mapSeries(commandFetchBranches, executeCommand)
  logger.log('fetch complete.')

  await executeCommand(commandCheckoutCurrentBranch)
  await executeCommand(commandGitBranch)
  await executeCommand(commandGitStatus)
}

export const run = async () => {
  const args: string[] = process.argv.slice(2)
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
