$d = Split-Path -Parent $MyInvocation.MyCommand.Path
$u = (Resolve-Path "$d\out\doc.html").Path.Replace('\', '/')
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$d\out\doc.pdf" "file:///$u" 2>&1 | Out-Null
