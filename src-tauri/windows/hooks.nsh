!macro NSIS_HOOK_POSTUNINSTALL
  RMDir /r "$APPDATA\com.ak.unipod"
  RMDir /r "$LOCALAPPDATA\com.ak.unipod"
!macroend
