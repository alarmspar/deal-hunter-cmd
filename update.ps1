# update.ps1 – uruchom gdy Claude powie "uruchom update.ps1"
# Skrypt pobiera pliki z GitHub Gist i commituje na Vercel

param(
    [string]$GistId = ""
)

$ProjectDir = $PSScriptRoot

Write-Host "🔥 Deal Hunter CMD – Update Script" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

# Sprawdź czy jestesmy w odpowiednim folderze
if (-not (Test-Path "$ProjectDir\package.json")) {
    Write-Host "❌ Nie znaleziono package.json – uruchom skrypt z folderu deal-hunter-cmd" -ForegroundColor Red
    exit 1
}

# Pobierz plik z URL i zapisz go
function Download-File {
    param([string]$Url, [string]$Dest)
    
    $Dir = Split-Path $Dest -Parent
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    }
    
    try {
        Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing
        Write-Host "  ✅ $Dest" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Błąd pobierania: $Url" -ForegroundColor Red
    }
}

# Jeśli podano Gist ID, pobierz pliki z Gist
if ($GistId -ne "") {
    Write-Host "`n📥 Pobieranie plików z GitHub Gist: $GistId" -ForegroundColor Cyan
    
    $GistUrl = "https://api.github.com/gists/$GistId"
    $Gist = Invoke-RestMethod -Uri $GistUrl -UseBasicParsing
    
    foreach ($File in $Gist.files.PSObject.Properties) {
        $FileName = $File.Name
        $RawUrl   = $File.Value.raw_url
        
        # Mapowanie nazw plików na ścieżki
        $PathMap = @{
            "page.tsx"       = "app\page.tsx"
            "globals.css"    = "app\globals.css"
            "layout.tsx"     = "app\layout.tsx"
            "supabase.ts"    = "lib\supabase.ts"
            "SourcesTab.tsx" = "components\SourcesTab.tsx"
            "route-deals.ts"   = "app\api\deals\route.ts"
            "route-scan.ts"    = "app\api\scan\route.ts"
            "route-content.ts" = "app\api\content\route.ts"
            "route-sources.ts" = "app\api\sources\route.ts"
        }
        
        if ($PathMap.ContainsKey($FileName)) {
            $Dest = Join-Path $ProjectDir $PathMap[$FileName]
            Download-File -Url $RawUrl -Dest $Dest
        }
    }
}

# Git commit i push
Write-Host "`n📤 Commitowanie zmian..." -ForegroundColor Cyan
Set-Location $ProjectDir

git add .
$CommitMsg = "Update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git commit -m $CommitMsg
git push

Write-Host "`n✅ Gotowe! Vercel automatycznie wdroży zmiany." -ForegroundColor Green
Write-Host "🔗 https://deal-hunter-cmd.vercel.app" -ForegroundColor Cyan
