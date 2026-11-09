$fullPath = "C:\Users\Admin\.gemini\antigravity\brain\9ffb335a-700a-447b-86a7-0593c21b3da8\.system_generated\logs\transcript_full.jsonl"
$reader = [System.IO.File]::OpenText($fullPath)
while(-not $reader.EndOfStream) {
    $line = $reader.ReadLine()
    if($line -match '"step_index":\s*3009\b') {
        $obj = ConvertFrom-Json $line
        [System.IO.File]::WriteAllText("C:\Users\Admin\.gemini\antigravity-ide\scratch\erpnext\batch11_spec.txt", $obj.content)
        Write-Host "batch11_spec.txt written successfully"
        break
    }
}
$reader.Close()

