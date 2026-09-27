Set WshShell = CreateObject("WScript.Shell")

' 1. Jalankan backend secara tersembunyi (tanpa jendela CMD hitam)
WshShell.Run """" & WshShell.CurrentDirectory & "\bin\node.exe"" """ & WshShell.CurrentDirectory & "\backend\index.js""", 0, False

' 2. Tunggu 0.8 detik agar port server backend siap
WScript.Sleep 800

' 3. Buka menggunakan browser default laptop secara otomatis (CMD tersembunyi)
WshShell.Run "cmd /c start http://localhost:3000", 0, False
