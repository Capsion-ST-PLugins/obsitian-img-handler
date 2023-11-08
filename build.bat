@REM @Author: CPS
@REM @email: 373704015@qq.com
@REM @Date: 2023-10-13 15:09:06.700542
@REM Last Modified by: CPS
@REM Last Modified time: 2023-10-13 15:09:04.325869
@REM Modified time: 2023-10-13 15:09:04.325869
@REM @file_path "W:\CPS\MyProject\demo\cps-cli\obsidian-plugin-ts"
@REM @Filename "build.bat"

@echo off && setlocal enabledelayedexpansion
@chcp 65001

:: 复制到obsidian目录进行测试
npm run build && copy "./manifest.json" "./dist/manifest.json" /y && xcopy "./dist" "W:/CPS/MyProject/cps/cps-blog/docs/.obsidian/plugins/cps" /i /d /c /v /s /y /f