param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Version
)

if ($Version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$') {
    throw "Version must use semantic versioning, for example 1.2.3 or 1.2.3-beta.1."
}

$appRoot = Split-Path $PSScriptRoot -Parent
$files = @(
    @{
        Path = Join-Path $appRoot "package.json"
        Pattern = '("version"\s*:\s*")[^"]+(")'
        Replacement = '${1}' + $Version + '${2}'
    },
    @{
        Path = Join-Path $appRoot "src-tauri\Cargo.toml"
        Pattern = '(?m)^version\s*=\s*"[^"]+"'
        Replacement = "version = `"$Version`""
    },
    @{
        Path = Join-Path $appRoot "src-tauri\tauri.conf.json"
        Pattern = '("version"\s*:\s*")[^"]+(")'
        Replacement = '${1}' + $Version + '${2}'
    }
)

foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.Path -Raw
    if (-not [regex]::IsMatch($content, $file.Pattern)) {
        throw "Could not find a version field in $($file.Path)."
    }

    $updated = [regex]::Replace($content, $file.Pattern, $file.Replacement, 1)

    Set-Content -LiteralPath $file.Path -Value $updated -NoNewline
}

Write-Host "Updated Nyxa version to $Version."
