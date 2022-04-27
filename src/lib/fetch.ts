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

const DEFAULT_REMOTE = 'origin'


const fetchBranch = (repository: Git.Repository, remote?: string) => async (branchName: string): Promise<void> => {
  return repository.checkoutBranch(branchName)
    .then(async () => {
      const currentBranch = getLocalBranchName(await repository.getCurrentBranch())
      logger.log(chalk.yellow(`\nfetching branch "${branchName}" - (${currentBranch}) ...`))
      await repository.mergeBranches(currentBranch, `refs/remotes/${remote ?? DEFAULT_REMOTE}/${currentBranch}`)
      logger.log('...merge complete.\n')
    }).catch((ex) => {
      logger.log(chalk.blue`unable to fetch branch "${branchName}"`)
      logger.log(
        chalk.blue(
          `(${getErrorStr(ex)})\n`
        )
      )
    })
}

type IRemoteRepositoryInfo = {
  readonly name: string;
  readonly url: string;
  readonly defaultBranch: string;
};

const fetchRemoteInfo = async (item: Git.Remote): Promise<IRemoteRepositoryInfo> => {
  let defaultBranch;

  try {
    defaultBranch = await item.defaultBranch()
  } catch (ex) {
    logger.log(chalk.blue(`no default branch info found for remote "${item.name()}"`))
    logger.log(chalk.blue(`(${getErrorStr(ex)})`))
    logger.log(chalk.blue('falling back to "master".\n'))
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
const fetchRemotes = async (repository: Git.Repository): Promise<readonly Git.Remote[] | undefined> => {
  logger.log('fetching remotes list...\n')

  const remotes: readonly Git.Remote[] = await repository.getRemotes()
  const remoteObjs: readonly IRemoteRepositoryInfo[] = await Promise.all(remotes.map(fetchRemoteInfo))
    .catch((ex) => {
      logger.log('critical failure: ', ex)
      return []
    })

  if (!remoteObjs.length) {
    logger.log('did not find any remotes. Cancelling fetch')
    return undefined
  }

  logger.log('fetching remotes: ', remoteObjs)
  try {
    await mapSeries(
      remoteObjs,
      async (item: IRemoteRepositoryInfo) => executeCommand(`git fetch ${item.name}`)
    )
    logger.log('fetch complete.\n')
  } catch (ex) {
    logger.log('error: unable to fetch remotes!')
    logger.log(ex)
  }

  return remotes
}

const printHeader = (headerName: string) => {
  clear()

  const equals = chalk.blue('\n==================================================================\n');
  const appName = chalk.yellow(figlet.textSync(headerName, { horizontalLayout: 'full' }));
  const appVersion = '1.0.1';
  const versionStr = chalk.red(`Version: ${appVersion}`);
  const authorStr = chalk.red('Author: Carl Eiserman');

  console.log(`${equals}${appName}\n${versionStr}\n${authorStr}${equals}`);

  console.log('This script will do the following: ' +
    '\n1. Fetch and update all remotes for this repository' +
    '\n2. Fetch and merge this repository\'s main branches\n')
}

export const fetch = async (originsList: readonly string[]): Promise<void> => {
  printHeader('GitMate Fetch')

  const repository = await Git.Repository.open("./")

  // Config
  const branchesToFetch = ['master', 'develop', 'dev']
  const currentBranch: string = await getCurrentBranchName(repository)

  const errors = []
  const hasError = () => {
    return errors.length > 0
  }

  logger.log(`You are currently on branch: "${currentBranch}"\n`)

  const commandGitBranch = 'git branch'
  const commandGitStatus = 'git status'
  const commandCheckoutCurrentBranch = `git checkout ${currentBranch}`

  const remotes = await fetchRemotes(repository)
  const targetRemote: string | undefined = (() => {
    if (!originsList[0]) {
      return DEFAULT_REMOTE
    }
    return remotes?.find(item => item.name() === originsList[0])?.name()
  })()

  if (!targetRemote) {
    const error = `Target remote "${originsList[0]}" not found!`
    errors.push(error)
    logger.log(error)
  }

  if (hasError()) {
    process.exit(1)
  }

  logger.log('fetching branches: ', branchesToFetch)
  await mapSeries(branchesToFetch, fetchBranch(repository, targetRemote))
  logger.log('fetch complete.')

  await executeCommand(commandCheckoutCurrentBranch)
  await executeCommand(commandGitBranch)
  const status = await executeCommand(commandGitStatus)
  console.log(`\n${chalk.yellow('----------- git status -----------')}`)
  console.log(status)
  console.log(`\n${chalk.yellow('----------- git status -----------')}`)
}
