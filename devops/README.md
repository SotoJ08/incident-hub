# Agente autohospedado (Azure Pipelines)

El pipeline usa el pool `Default`, que debe tener al menos un agente propio en linea.

## Registro (Windows)
1. Azure DevOps -> Project settings -> Agent pools -> `Default` -> New agent -> descargar el zip para Windows x64.
2. Descomprimir en `C:\agent` (fuera del repo; `devops/agent/` esta en `.gitignore`).
3. Crear un **Personal Access Token** con alcance *Agent Pools (Read & manage)* desde User settings -> Personal access tokens.
4. Ejecutar `.\config.cmd`:
   - Server URL: `https://dev.azure.com/jsoto1`
   - Authentication: PAT (pegar el token **solo en la consola**; nunca en archivos ni commits)
   - Pool: `Default`, agent name: `agente-local-01`
5. `.\run.cmd` (interactivo) o instalar como servicio cuando pregunte.

## Verificacion
Agent pools -> `Default` -> Agents: el agente debe aparecer **Online**. Capturar esa pantalla como evidencia (sin el token).

## Requisitos del equipo
Git y acceso a internet. Node lo instala la tarea `NodeTool` del pipeline.
