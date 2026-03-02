# Register Codex Skills to Trae
# This script copies/links Codex skills to Trae's skill directory

$CodexSkillsPath = ".codex\skills"
$TraeSkillsPath = ".trae\skills"

# Get all skill directories from Codex (excluding .system and _TEMPLATE)
$skillDirs = Get-ChildItem -Path $CODexSkillsPath -Directory | Where-Object {
    $_.Name -notmatch '^\..*' -and $_.Name -ne '_TEMPLATE'
}

Write-Host "Found $($skillDirs.Count) Codex skills to register..."

foreach ($skill in $skillDirs) {
    $skillName = $skill.Name
    $sourcePath = Join-Path $CODexSkillsPath $skillName
    $targetPath = Join-Path $TraeSkillsPath $skillName
    
    Write-Host "Processing: $skillName"
    
    # Create target directory
    New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
    
    # Copy SKILL.md if it exists
    $skillMdPath = Join-Path $sourcePath "SKILL.md"
    if (Test-Path $skillMdPath) {
        Copy-Item $skillMdPath -Destination (Join-Path $targetPath "SKILL.md") -Force
        Write-Host "  ✓ Copied SKILL.md"
    } else {
        Write-Host "  ⚠ No SKILL.md found"
    }
    
    # Copy agents directory if it exists
    $agentsPath = Join-Path $sourcePath "agents"
    if (Test-Path $agentsPath) {
        Copy-Item $agentsPath -Destination (Join-Path $targetPath "agents") -Recurse -Force
        Write-Host "  ✓ Copied agents/"
    }
    
    # Copy scripts directory if it exists
    $scriptsPath = Join-Path $sourcePath "scripts"
    if (Test-Path $scriptsPath) {
        Copy-Item $scriptsPath -Destination (Join-Path $targetPath "scripts") -Recurse -Force
        Write-Host "  ✓ Copied scripts/"
    }
    
    # Copy references directory if it exists
    $referencesPath = Join-Path $sourcePath "references"
    if (Test-Path $referencesPath) {
        Copy-Item $referencesPath -Destination (Join-Path $targetPath "references") -Recurse -Force
        Write-Host "  ✓ Copied references/"
    }
    
    # Copy assets directory if it exists
    $assetsPath = Join-Path $sourcePath "assets"
    if (Test-Path $assetsPath) {
        Copy-Item $assetsPath -Destination (Join-Path $targetPath "assets") -Recurse -Force
        Write-Host "  ✓ Copied assets/"
    }
    
    # Copy rules directory if it exists (for vercel-react-best-practices)
    $rulesPath = Join-Path $sourcePath "rules"
    if (Test-Path $rulesPath) {
        Copy-Item $rulesPath -Destination (Join-Path $targetPath "rules") -Recurse -Force
        Write-Host "  ✓ Copied rules/"
    }
    
    # Copy data directory if it exists (for ui-ux-pro-max)
    $dataPath = Join-Path $sourcePath "data"
    if (Test-Path $dataPath) {
        Copy-Item $dataPath -Destination (Join-Path $targetPath "data") -Recurse -Force
        Write-Host "  ✓ Copied data/"
    }
    
    # Copy examples directory if it exists
    $examplesPath = Join-Path $sourcePath "examples"
    if (Test-Path $examplesPath) {
        Copy-Item $examplesPath -Destination (Join-Path $targetPath "examples") -Recurse -Force
        Write-Host "  ✓ Copied examples/"
    }
    
    # Copy other important files
    foreach ($file in @('LICENSE.txt', 'license.txt', 'metadata.json', 'AGENTS.md', 'README.md')) {
        $filePath = Join-Path $sourcePath $file
        if (Test-Path $filePath) {
            Copy-Item $filePath -Destination (Join-Path $targetPath $file) -Force
            Write-Host "  ✓ Copied $file"
        }
    }
}

Write-Host "`nRegistration complete!"
Write-Host "Skills registered to: $((Resolve-Path $TraeSkillsPath).Path)"
