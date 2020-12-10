import { exec } from 'child_process';

import Git from 'nodegit';

export const executeCommand = async (command: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) reject(err);
      resolve(stdout);
    });
  });
};

export const getLocalBranchName = (branch: Git.Reference) => {
  return branch.toString().replace('refs/heads/', '');
};

/**
 * Get a string name for the currently checked-out branch
 * @param repository
 */
export const getCurrentBranchName = async (repository: Git.Repository): Promise<string> => {
  const currentBranch = await repository.getCurrentBranch();
  return currentBranch.toString().replace('refs/heads/', '');
};

/**
 * Run a function on a series of promises in parallel
 * @param iterable
 * @param action
 */
export const mapSeries = async (iterable, action) => {
  for (const x of iterable) {
    await action(x);
  }
};

export const getErrorStr = (ex: Error): string => {
  return ex.message;
};
