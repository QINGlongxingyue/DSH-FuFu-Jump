# fufu-jump-DSH 一键推送
#
# 为什么需要这个脚本：这台机器上 git 走 Windows schannel 做 TLS 握手会失败
# （`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`），
# 而且 git 在受限环境里连管道都建不了。但走 GitHub 的 REST API（Node 的 fetch，
# 用自带 OpenSSL）是通的，所以用 API 上传。
#
# 用法：
#   pwsh -File tools/push-to-github.ps1
#   然后按提示粘贴 GitHub Personal Access Token（需要 repo 权限，fine-grained 就勾 Contents: Read and write）
#
# Token 只在内存里，不会写进任何文件。

[CmdletBinding()]
param(
  [string]$Repo = 'QINGlongxingyue/DSH-FuFu-Jump',
  [string]$Branch = 'main',
  [string]$Root,                        # 默认取脚本上一级目录
  [string]$Token,                       # 不传就依次试：~/.git-credentials -> 安全提示输入
  [string]$Message = 'feat: 鲸鱼娘草地蹦跳壁纸插件（壁纸 + 物理挂件 + 分裂/对消/挂机奖励）'
)

$ErrorActionPreference = 'Stop'

$node = 'C:\Users\Starfarer\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
if (-not (Test-Path $node)) {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $node) { throw '找不到 node.exe，请在 DSH 桌面端的终端里跑这个脚本' }

if (-not $Root) {
  $Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}
if (-not (Test-Path (Join-Path $Root 'package.json'))) {
  throw "在 $Root 里找不到 package.json，这个目录不像是插件包"
}

# token 优先级：参数 > ~/.git-credentials > 交互输入
if (-not $Token) {
  $credFile = Join-Path $env:USERPROFILE '.git-credentials'
  if (Test-Path $credFile) {
    $line = Get-Content $credFile -Encoding UTF8 | Where-Object { $_ -match 'github\.com' } | Select-Object -First 1
    if ($line -and $line -match '^https?://[^:]+:([^@]+)@') {
      $Token = $Matches[1]
      Write-Host "已从 ~/.git-credentials 读到 GitHub 凭据" -ForegroundColor Cyan
    }
  }
}
if (-not $Token) {
  Write-Host '需要一个 GitHub Personal Access Token（勾 repo 权限 / fine-grained 勾 Contents: Read and write）' -ForegroundColor Cyan
  Write-Host '生成地址: https://github.com/settings/tokens' -ForegroundColor Cyan
  $secure = Read-Host -Prompt '粘贴 token（输入不会显示）' -AsSecureString
  $Token = [System.Net.NetworkCredential]::new('', $secure).Password
}
if (-not $Token) { throw '没有拿到 token' }

# 把要上传的文件摊平成 JSON 交给 node 脚本
$files = @()
$skip = @('node_modules', '.git')
Get-ChildItem -Recurse -File $Root | ForEach-Object {
  $rel = $_.FullName.Substring($Root.Length + 1).Replace('\', '/')
  $top = $rel.Split('/')[0]
  if ($skip -contains $top) { return }
  $files += @{ path = $rel; abs = $_.FullName }
}
Write-Host ("待上传 {0} 个文件" -f $files.Count) -ForegroundColor Cyan

$payload = @{ repo = $Repo; branch = $Branch; message = $Message; files = $files } | ConvertTo-Json -Depth 4 -Compress
$tmp = Join-Path $env:TEMP ("fufu-push-{0}.json" -f ([guid]::NewGuid().ToString('N')))
[System.IO.File]::WriteAllText($tmp, $payload, (New-Object System.Text.UTF8Encoding($false)))

try {
  $env:GH_TOKEN = $Token
  & $node (Join-Path $Root 'tools/push-to-github.mjs') $tmp
  if ($LASTEXITCODE -ne 0) { throw "上传失败（node 退出码 $LASTEXITCODE）" }
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\GH_TOKEN -ErrorAction SilentlyContinue
}
