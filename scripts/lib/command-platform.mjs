export function executableForPlatform(executable, platform = process.platform) {
  return platform === 'win32' && executable === 'npm' ? 'npm.cmd' : executable;
}

export function commandInvocation(executable, args, platform = process.platform, commandShell = process.env.ComSpec) {
  if (platform === 'win32' && executable === 'npm') {
    return {
      executable: commandShell || 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm.cmd', ...args],
    };
  }
  return { executable, args };
}
