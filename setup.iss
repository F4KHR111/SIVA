; Script Inno Setup untuk Sistem Inventaris Gedung Agung

[Setup]
AppName=Sistem Inventaris Gedung Agung
AppVersion=1.0
DefaultDirName={localappdata}\InventarisGedungAgung
DefaultGroupName=Sistem Inventaris Gedung Agung
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=Setup-Inventaris
Compression=lzma2/ultra64
SolidCompression=yes
DisableDirPage=no
DisableFinishedPage=no
PrivilegesRequired=lowest

[Files]
; Menyalin seluruh file dari folder Dist-Inventaris
Source: "Dist-Inventaris\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
; Shortcut di Desktop
Name: "{userdesktop}\Inventaris Gedung Agung"; Filename: "{app}\Mulai-Aplikasi.vbs"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 84
; Shortcut di Start Menu
Name: "{userprograms}\Inventaris Gedung Agung"; Filename: "{app}\Mulai-Aplikasi.vbs"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 84
; Shortcut Uninstaller di Start Menu
Name: "{userprograms}\Uninstall Inventaris Gedung Agung"; Filename: "{uninstallexe}"

[Run]
; Opsi untuk langsung menjalankan aplikasi setelah instalasi selesai
Filename: "{app}\Mulai-Aplikasi.vbs"; Description: "Jalankan Aplikasi"; Flags: postinstall shellexec nowait
