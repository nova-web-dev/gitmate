import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import Git from 'nodegit';

import { logger } from './logger';
import {
  executeCommand, getCurrentBranchName,
  getErrorStr,
  getLocalBranchName,
  mapSeries
} from './util';


const fetchBranch = (repository: Git.Repository) => async (branchName: string): Promise<void> => {
  return repository.checkoutBranch(branchName)
    .then(async () => {
      const currentBranch = getLocalBranchName(await repository.getCurrentBranch())
      logger.log(chalk.yellow(`\nfetching branch "${branchName}" - (${currentBranch}) ...`))
      await repository.mergeBranches(currentBranch, `refs/remotes/origin/${currentBranch}`)
      logger.log('...merge complete.\n')
    }).catch((ex) => {
      logger.log(`error: unable to fetch "${branchName}"`)
      logger.log(ex);
    })
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
    logger.log(chalk.blue(`warn: unable to fetch default branch info for remote "${item.name()}"`))
    logger.log(chalk.blue(`warn: "${getErrorStr(ex)}"`))
    logger.log(chalk.blue('warn: falling back to "master".\n'))
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
  logger.log('fetching remotes list...\n')

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
    logger.log('fetch complete.\n')
  } catch (ex) {
    logger.log('error: unable to fetch remotes!')
    logger.log(ex)
  }
}

const printHeader = (headerName: string) => {
  clear()

  const equals = chalk.blue('\n==================================================================\n');
  const appName = chalk.yellow(figlet.textSync(headerName, { horizontalLayout: 'full' }));
  const appVersion = '1.0.0';
  const versionStr = chalk.red(`Version: ${appVersion}`);
  const authorStr = chalk.red('Author: Carl Eiserman');

  console.log(`${equals}${appName}\n${versionStr}\n${authorStr}${equals}`);

  console.log('This script will do the following: ' +
    '\n1. Fetch and update all remotes for this repository' +
    '\n2. Fetch and merge this repository\'s main branches\n')
}

export const fetch = async (): Promise<void> => {
  printHeader('GitMate Fetch')

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
  const status = await executeCommand(commandGitStatus)
  console.log(`\n${chalk.yellow('----------- git status -----------')}`)
  console.log(status)
  console.log(`\n${chalk.yellow('----------- git status -----------')}`)
}
