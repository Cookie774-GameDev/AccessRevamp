$ErrorActionPreference = 'Stop'
$taskName = 'AccessRevamp-Worker6'
$task = Get-ScheduledTask -TaskName $taskName
$info = Get-ScheduledTaskInfo -TaskName $taskName
$xml = Export-ScheduledTask -TaskName $taskName

if ($task.Settings.MultipleInstances -ne 'IgnoreNew') { throw 'Worker 6 overlap protection is not IgnoreNew.' }
if ($xml -notmatch '<ExecutionTimeLimit>PT5M</ExecutionTimeLimit>') { throw 'Worker 6 execution limit is not five minutes.' }
if ($xml -notmatch 'PT15M') { throw 'Worker 6 repetition interval is not fifteen minutes.' }
if ($xml -notmatch 'npm run email:worker6') { throw 'Worker 6 action is incorrect.' }

[pscustomobject]@{
  TaskName = $taskName
  State = $task.State
  LastRunTime = $info.LastRunTime
  LastTaskResult = $info.LastTaskResult
  NextRunTime = $info.NextRunTime
}
