# Roda um fluxo completo contra a API já em execução. Uso: .\testar.ps1 [-Base http://localhost:3000]
param([string]$Base = 'http://localhost:3000')

function Chamar($metodo, $rota, $corpo) {
  try {
    if ($corpo) {
      $r = Invoke-RestMethod -Method $metodo -Uri "$Base$rota" -ContentType 'application/json; charset=utf-8' `
        -Body ([Text.Encoding]::UTF8.GetBytes(($corpo | ConvertTo-Json)))
    } else {
      $r = Invoke-RestMethod -Method $metodo -Uri "$Base$rota"
    }
    Write-Host "OK   $metodo $rota" -ForegroundColor Green
    return $r
  } catch {
    $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).message -join '; '
    Write-Host "RECUSADO ($($_.Exception.Response.StatusCode.value__)) $metodo $rota -> $msg" -ForegroundColor Yellow
  }
}

$n = Get-Random
$ana  = Chamar POST /pessoas @{ nome = 'Ana';  email = "ana$n@x.com";  tipo = 'SOLICITANTE' }
$beto = Chamar POST /pessoas @{ nome = 'Beto'; email = "beto$n@x.com"; tipo = 'TECNICO' }
$tipo = Chamar POST /tipos-problema @{ nome = "Rede $n" }

Write-Host "`n-- regras que devem ser recusadas --"
Chamar POST /pessoas @{ nome = 'Ana'; email = "ana$n@x.com"; tipo = 'SOLICITANTE' } | Out-Null
Chamar POST /pessoas @{ nome = 'X'; email = 'invalido'; tipo = 'TECNICO' } | Out-Null
Chamar POST /chamados @{ titulo = 'abc'; descricao = 'curta'; tipoProblemaId = $tipo.id; solicitanteId = $ana.id } | Out-Null

Write-Host "`n-- fluxo normal --"
$ch = Chamar POST /chamados @{ titulo = 'Rede caiu'; descricao = 'A rede caiu no setor'; tipoProblemaId = $tipo.id; solicitanteId = $ana.id }
Write-Host "situacao=$($ch.situacao) prioridade=$($ch.prioridade) tecnicoId=$($ch.tecnicoId)"
Chamar POST "/chamados/$($ch.id)/designar" @{ tecnicoId = $ana.id } | Out-Null
$d = Chamar POST "/chamados/$($ch.id)/designar" @{ tecnicoId = $beto.id }
Write-Host "situacao apos designar=$($d.situacao)"
Chamar POST "/chamados/$($ch.id)/comentarios" @{ autorId = $beto.id; texto = 'Em análise' } | Out-Null
Chamar POST "/chamados/$($ch.id)/comentarios" @{ autorId = $beto.id; texto = '  ' } | Out-Null
Chamar POST "/chamados/$($ch.id)/situacao" @{ situacao = 'FECHADO' } | Out-Null
$r = Chamar POST "/chamados/$($ch.id)/situacao" @{ situacao = 'RESOLVIDO' }
Write-Host "resolvidoEm=$($r.resolvidoEm)"
Chamar POST "/chamados/$($ch.id)/situacao" @{ situacao = 'FECHADO' } | Out-Null
Chamar POST "/chamados/$($ch.id)/comentarios" @{ autorId = $ana.id; texto = 'Obrigada' } | Out-Null
Chamar DELETE "/pessoas/$($ana.id)" | Out-Null

Write-Host "`n-- consulta --"
$completo = Chamar GET "/chamados/$($ch.id)"
Write-Host "situacao=$($completo.situacao), comentarios=$($completo.comentarios.Count)"
