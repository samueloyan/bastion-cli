import ora, { Ora } from 'ora';

export function createSpinner(text: string, verbose: boolean): Ora | null {
  if (verbose) return null;
  return ora({ text, color: 'green' }).start();
}

export function stopSpinner(spinner: Ora | null, successText?: string): void {
  if (!spinner) return;
  if (successText) spinner.succeed(successText);
  else spinner.stop();
}

export function failSpinner(spinner: Ora | null, msg: string): void {
  if (!spinner) return;
  spinner.fail(msg);
}
