@echo off
SETLOCAL EnableDelayedExpansion

:: Configuracoes do Node Portable (Usando o mesmo do ShareNetwork para consistencia)
SET NODE_VERSION=v20.18.1
SET NODE_ARCH=win-x64
SET NODE_FOLDER=node-%NODE_VERSION%-%NODE_ARCH%
SET BASE_DIR=%~dp0
:: Apontando para o repositorio do ShareNetwork que ja tem o Node baixado
SET SHARED_NODE_DIR=c:\orionv4\frontend-ShareNetwork\.node_portable\%NODE_FOLDER%

echo ========================================================
echo   Inicializador Clube Fitness (Node Portable %NODE_VERSION%)
echo ========================================================
echo.

IF NOT EXIST "%SHARED_NODE_DIR%\node.exe" (
    echo [ERRO] Node.js portable nao encontrado em:
    echo %SHARED_NODE_DIR%
    echo Certifique-se que o projeto frontend-ShareNetwork ja foi inicializado.
    pause
    exit /b 1
)

:: Configurando PATH local e isolado (incluindo Oracle Client)
SET PATH=C:\Oracle;%SHARED_NODE_DIR%;%PATH%
set NODE_NO_WARNINGS=1

echo [INFO] Ambiente configurado com sucesso:
node -v
call npm -v
echo.

echo [1/2] Verificando dependencias...
call npm install --legacy-peer-deps

echo.
echo [2/2] Iniciando o servidor Next.js...
echo O sistema estara disponivel em: http://localhost:3000
echo.

call npm run dev

pause
