# Resolve a Node 24+ binary for this project.
# Priority:
#   1) ANIMATION_NODE env
#   2) .node-path file in repo root (one line: full path to node.exe)
#   3) PATH `node` if major >= 24
#   4) newest %LOCALAPPDATA%\cursor-agent\versions\*\node.exe with major >= 24

$ErrorActionPreference = 'Stop'

function Get-NodeMajor([string]$NodeExe) {
  try {
    $raw = & $NodeExe -v 2>$null
  } catch {
    return $null
  }
  if (-not $raw) { return $null }
  if ("$raw" -match '^v?(\d+)\.') { return [int]$Matches[1] }
  return $null
}

function Test-Node24([string]$Path) {
  if (-not $Path) { return $false }
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $major = Get-NodeMajor $Path
  return ($null -ne $major -and $major -ge 24)
}

$resolved = $null

if ($env:ANIMATION_NODE) {
  if (Test-Node24 $env:ANIMATION_NODE) {
    $resolved = $env:ANIMATION_NODE
  } else {
    Write-Error "ANIMATION_NODE is set but is not Node 24+: $($env:ANIMATION_NODE)"
    exit 1
  }
}

if (-not $resolved) {
  $repoRoot = Split-Path -Parent $PSScriptRoot
  $localPin = Join-Path $repoRoot '.node-path'
  if (Test-Path -LiteralPath $localPin) {
    $pinned = (Get-Content -LiteralPath $localPin -TotalCount 1).Trim().Trim('"')
    if (Test-Node24 $pinned) {
      $resolved = $pinned
    } else {
      Write-Error ".node-path does not point to Node 24+: $pinned"
      exit 1
    }
  }
}

if (-not $resolved) {
  $wherenode = Get-Command node -ErrorAction SilentlyContinue
  if ($wherenode -and $wherenode.Source -and (Test-Node24 $wherenode.Source)) {
    $resolved = $wherenode.Source
  }
}

if (-not $resolved) {
  $versionsRoot = Join-Path $env:LOCALAPPDATA 'cursor-agent\versions'
  if (Test-Path -LiteralPath $versionsRoot) {
    $candidates = Get-ChildItem -LiteralPath $versionsRoot -Directory |
      Sort-Object Name -Descending |
      ForEach-Object { Join-Path $_.FullName 'node.exe' } |
      Where-Object { Test-Path -LiteralPath $_ }

    foreach ($exe in $candidates) {
      if (Test-Node24 $exe) {
        $resolved = $exe
        break
      }
    }
  }
}

if (-not $resolved) {
  Write-Error @"
No Node 24+ found.
Install Node 24, or set ANIMATION_NODE / create .node-path with the full path to node.exe.
System Node at C:\Program Files\nodejs is currently too old for this project.
"@
  exit 1
}

Write-Output $resolved
exit 0
