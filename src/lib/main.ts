#!/usr/bin/env node
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

const getLocalBranchName = (branch: Git.Reference) => {
  return branch.toString().replace('refs/heads/', '')
}

const fetchBranch = (repository: Git.Repository) => async (branchName: string): Promise<void> => {
  return repository.checkoutBranch(branchName)
    .then(async () => {
      const currentBranch = getLocalBranchName(await repository.getCurrentBranch())
      logger.log(`fetching branch "${branchName}" -( ${currentBranch} ) ...`)
      await repository.mergeBranches(currentBranch, `refs/remotes/origin/${currentBranch}`)
      logger.log('...merge complete.')
    }).catch((ex) => {
      logger.log(`error: unable to fetch "${branchName}"`)
      logger.log(ex);
    })
}

/**
 * Get a string name for the currently checked-out branch
 * @param repository
 */
const getCurrentBranchName = async (repository: Git.Repository): Promise<string> => {
  const currentBranch = await repository.getCurrentBranch()
  return currentBranch.toString().replace('refs/heads/', '')
}

/**
 * Run a function on a series of promises in parallel
 * @param iterable
 * @param action
 */
const mapSeries = async (iterable, action) => {
  for (const x of iterable) {
    await action(x)
  }
}

const getErrorStr = (ex: Error): string => {
  return ex.message
}

type IRemoteObj = {
  readonly name: string;
  readonly url: string;
  readonly defaultBranch: string;
};

const fetchRemoteInfo = async (item: Git.Remote): Promise<IRemoteObj> => {
  let defaultBranch;

  try {
    defaultBranch = await item.defaultBranch()
  } catch (ex) {
    logger.log(`unable to fetch default branch info for remote "${item.name()}"`)
    logger.log(getErrorStr(ex))
    logger.log('falling back to "master".')
    defaultBranch = 'master'
  }
  return {
    name: item.name(),
    url: item.url(),
    defaultBranch,
  }
}

/**
 * Update all remotes, if they exist
 * @param repository
 */
const fetchRemotes = async (repository: Git.Repository): Promise<void> => {
  logger.log('fetching remotes list...')

  const remotes = await repository.getRemotes()
  const remoteObjs: readonly IRemoteObj[] = await Promise
    .all(remotes.map(fetchRemoteInfo))
    .catch((ex) => {
      logger.log('critical failure: ', ex)
      return []
    })

  if (!remoteObjs.length) {
    logger.log('did not find any remotes. Cancelling fetch')
    return
  }

  logger.log('fetching remotes: ', remoteObjs)
  try {
    await mapSeries(
      remoteObjs,
      async (item: IRemoteObj) => executeCommand(`git fetch ${item.name}`)
    )
    logger.log('fetch complete.')
  } catch (ex) {
    logger.log('error: unable to fetch remotes!')
    logger.log(ex)
  }
}

export const fetch = async (): Promise<void> => {
  const repository = await Git.Repository.open("./")

  // Config
  const branchesToFetch = ['master', 'develop', 'dev']
  const shouldFetchOrigin = true
  const currentBranch: string = await getCurrentBranchName(repository)

  const errors = []
  const hasError = () => {
    return errors.length > 0
  }

  logger.log(`You are currently on branch: "${currentBranch}"\n`)

  const commandGitBranch = 'git branch'
  const commandGitStatus = 'git status'
  const commandCheckoutCurrentBranch = `git checkout ${currentBranch}`

  if (shouldFetchOrigin) {
    await fetchRemotes(repository)
  }

  if (hasError()) {
    process.exit(1)
  }

  logger.log('fetching branches: ', branchesToFetch)
  await mapSeries(branchesToFetch, fetchBranch(repository))
  logger.log('fetch complete.')

  await executeCommand(commandCheckoutCurrentBranch)
  await executeCommand(commandGitBranch)
  await executeCommand(commandGitStatus)
}

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
