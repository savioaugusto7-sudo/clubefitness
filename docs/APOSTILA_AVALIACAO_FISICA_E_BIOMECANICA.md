# ⚙️ ESPECIFICAÇÃO TÉCNICA, EQUAÇÕES E MATRIZ DE RESULTADOS DOS TESTES
### Sistema Clube Fitness Fisio — Mapeamento de Entradas (Inputs), Fórmulas, Saídas (Outputs), Alertas Atuais e Oportunidades de Expansão

---

## 📑 Sumário Executivo

1. [MÓDULO 1: Antropometria & Composição Corporal (Jackson & Pollock 7 Dobras)](#módulo-1-antropometria--composição-corporal-jackson--pollock-7-dobras)
2. [MÓDULO 2: Perimetria Corporal & Análise de Assimetrias Contralaterais](#módulo-2-perimetria-corporal--análise-de-assimetrias-contralaterais)
3. [MÓDULO 3: Goniometria Articular & Cinemática de Movimento](#módulo-3-goniometria-articular--cinemática-de-movimento)
4. [MÓDULO 4: Teste de Thomas (Flexores de Quadril & Retofemoral)](#módulo-4-teste-de-thomas-flexores-de-quadril--retofemoral)
5. [MÓDULO 5: Teste de Ober (Trato Iliotibial & Tensor da Fáscia Lata)](#módulo-5-teste-de-ober-trato-iliotibial--tensor-da-fáscia-lata)
6. [MÓDULO 6: Y-Balance Test (Y-Test — Estabilidade Dinâmica Unipodal)](#módulo-6-y-balance-test-y-test--estabilidade-dinâmica-unipodal)
7. [MÓDULO 7: Step Down Test (Controle Cinemático Excêntrico)](#módulo-7-step-down-test-controle-cinemático-excêntrico)
8. [MÓDULO 8: Estrela de Maigne (Rosa dos Ventos de Dor & Mobilidade da Coluna)](#módulo-8-estrela-de-maigne-rosa-dos-ventos-de-dor--mobilidade-da-coluna)
9. [MÓDULO 9: Discinesia Escapular (Avaliação de Ritmo Escapuloumeral)](#módulo-9-discinesia-escapular-avaliação-de-ritmo-escapuloumeral)
10. [MÓDULO 10: Dinamometria Isométrica Computadorizada (Strength Atlas Engine)](#módulo-10-dinamometria-isométrica-computadorizada-strength-atlas-engine)
11. [MÓDULO 11: Anamnese Estruturada, Escala de Dor EVA & Histórico Clínico](#módulo-11-anamnese-estruturada-escala-de-dor-eva--histórico-clínico)
12. [MÓDULO 12: Painel Consolidado de Ideias para Novos Alertas e Índices Preditivos](#módulo-12-painel-consolidado-de-ideias-para-novos-alertas-e-índices-preditivos)

---

# MÓDULO 1: Antropometria & Composição Corporal (Jackson & Pollock 7 Dobras)

### 1.1 Inputs do Sistema (Campos de Entrada)
| Campo | Tipo de Dado | Unidade | Descrição / Restrição |
| :--- | :--- | :--- | :--- |
| `idade` | Número Inteiro | Anos | Idade do aluno (calculada via data de nascimento ou inserida manualmente) |
| `sexo` | Texto ('M' ou 'F') | - | Gênero biológico para determinação da fórmula de densidade |
| `peso` | Número Decimal | kg | Peso corporal total em quilogramas |
| `altura` | Número Decimal | m | Estatura em metros (exemplo: 1.75) |
| `dobras.peitoral` | Lista [M1, M2, M3] | mm | Até 3 leituras da dobra peitoral |
| `dobras.triceps` | Lista [M1, M2, M3] | mm | Até 3 leituras da dobra tricipital |
| `dobras.subescapular` | Lista [M1, M2, M3] | mm | Até 3 leituras da dobra subescapular |
| `dobras.subaxilar` | Lista [M1, M2, M3] | mm | Até 3 leituras da dobra axilar média |
| `dobras.suprailiaca` | Lista [M1, M2, M3] | mm | Até 3 leituras da dobra supra-ilíaca |
| `dobras.abdomen` | Lista [M1, M2, M3] | mm | Até 3 leituras da dobra abdominal |
| `dobras.coxa` | Lista [M1, M2, M3] | mm | Até 3 leituras da dobra da coxa |
| `dobras.panturrilha` | Lista [M1, M2, M3] | mm | Até 3 leituras da dobra da panturrilha (opcional) |

---

### 1.2 Equações e Processamento Lógico

#### 1. Média Aritmética das Leituras por Ponto:
Para cada dobra avaliada individualmente (peitoral, tríceps, etc.), o sistema filtra os campos preenchidos e calcula:
```
Média da Dobra = (M1 + M2 + M3) / Número de Leituras Preenchidas
```

#### 2. Somatório das 7 Dobras Cutâneas (Σ 7 Dobras):
```
Σ 7 Dobras (mm) = Peitoral + Tríceps + Subescapular + Axilar Média + Supra-ilíaca + Abdômen + Coxa
```

#### 3. Densidade Corporal (D em g/cm³) — Equações de Jackson & Pollock:
- **Homens (18 a 61 anos)**:
  ```
  D = 1.1120000 - (0.00043499 × Σ7D) + (0.00000055 × (Σ7D)²) - (0.00028826 × Idade)
  ```
- **Mulheres (18 a 55 anos)**:
  ```
  D = 1.0970000 - (0.00046971 × Σ7D) + (0.00000056 × (Σ7D)²) - (0.00012828 × Idade)
  ```

#### 4. Percentual de Gordura Corporal (%BF) — Fórmula de Siri:
```
%BF = ((4.95 / D) - 4.50) × 100
```

#### 5. Fracionamento de Massas Corporais e IMC:
```
Massa Gorda (kg) = Peso × (%BF / 100)

Massa Magra (kg) = Peso - Massa Gorda (kg)

IMC = Peso (kg) / (Altura (m))²
```

---

### 1.3 Resultados Possíveis (Outputs Gerados)
- **Soma das 7 Dobras (Σ 7D)**: Número em mm (Exemplo: 85.4 mm).
- **%BF Calculado**: Percentual de 3% a 60% (Exemplo: 14.2 %).
- **Massa Gorda**: Quantidade em kg de tecido adiposo (Exemplo: 11.3 kg).
- **Massa Magra**: Quantidade em kg de massa livre de gordura — músculos, ossos, órgãos e água (Exemplo: 68.7 kg).
- **IMC**: Valor numérico com classificação OMS:
  - *Baixo Peso*: IMC < 18.5
  - *Eutrófico / Peso Normal*: IMC entre 18.5 e 24.9
  - *Sobrepeso*: IMC entre 25.0 e 29.9
  - *Obesidade*: IMC ≥ 30.0

---

### 1.4 Alertas Atuais do Sistema
- ⚠️ **Alerta de Perda de Massa Magra / Composição Incompatível**: Disparado na comparação com a avaliação anterior quando há redução de massa magra simultânea ao aumento de %BF.

---

### 1.5 💡 Oportunidades de Novos Alertas e Referências a Adicionar
1. **Índice de Massa Livre de Gordura (FFMI - Fat-Free Mass Index)**:
   ```
   FFMI = (Massa Magra (kg) / (Altura (m))²) + 6.1 × (1.8 - Altura (m))
   ```
   - *Novo Alerta*: `FFMI < 17 kg/m²` (Risco de Sarcopenia em adultos/idosos); `FFMI > 25 kg/m²` (Limite biológico natural para hipertrofia).
2. **Índice de Adiposidade Central (Razão Dobra Abdominal / Dobra da Coxa)**:
   - *Novo Alerta*: `Razão > 1.5` (Predomínio de gordura visceral androgênica e risco cardiovascular aumentado).

---

# MÓDULO 2: Perimetria Corporal & Análise de Assimetrias Contralaterais

### 2.1 Inputs do Sistema
14 medidas de perímetro corporal em centímetros (cm), com precisão decimal:
`circ.pescoco`, `circ.ombros`, `circ.torax`, `circ.cintura`, `circ.abdomen`, `circ.quadril`, `circ.braçoD`, `circ.braçoE`, `circ.antebraçoD`, `circ.antebraçoE`, `circ.coxaD`, `circ.coxaE`, `circ.panturrilhaD`, `circ.panturrilhaE`.

---

### 2.2 Equações e Processamento Lógico

#### 1. Razão Cintura-Quadril (RCQ):
```
RCQ = Cintura (cm) / Quadril (cm)
```

#### 2. Razão Cintura-Estatura (RCEst):
```
RCEst = Cintura (cm) / Altura (cm)
```

#### 3. Assimetria Percentual Contralateral (Assimetria %):
Para cada par de membros homólogos (Braço D/E, Antebraço D/E, Coxa D/E, Panturrilha D/E):
```
Diferença Absoluta = |Lado Direito - Lado Esquerdo|
Maior Valor = Máximo(Lado Direito, Lado Esquerdo)

Assimetria (%) = (Diferença Absoluta / Maior Valor) × 100
```

---

### 2.3 Resultados Possíveis (Outputs)
- **Tabela Comparativa Contralateral**: Apresenta lado direito versus esquerdo com a diferença percentual calculada.
- **Comparativo Temporal Histórico**: Exibe a variação delta (Δ) em relação à avaliação anterior, indicando *Melhora* (verde) ou *Piora / Atenção* (vermelho/amarelo).

---

### 2.4 Alertas Atuais do Sistema
- 🔴 **Assimetria Crítica (> 10%)**: Disparado individualmente para braço, antebraço, coxa ou panturrilha quando a diferença entre os membros ultrapassa 10%.
  - *Risco Clínico*: Inibição reflexa artrogênica pós-traumática ou sobrecarga mecânica assimétrica em exercícios bilaterais como agachamento e leg press.

---

### 2.5 💡 Oportunidades de Novos Alertas e Referências a Adicionar
1. **Alerta de Risco Coronariano e Metabólico por RCQ**:
   - *Homens*: RCQ > 0.90 (Risco Moderado); RCQ > 1.00 (Risco Alto).
   - *Mulheres*: RCQ > 0.80 (Risco Moderado); RCQ > 0.85 (Risco Alto).
2. **Alerta de Risco Cardiometabólico Universal (RCEst)**:
   - *Gatilho*: RCEst > 0.50 (A circunferência da cintura não deve ultrapassar a metade da estatura).
3. **Razão Coxa / Cintura (Índice Protetor Metabólico)**:
   - *Gatilho*: (Coxa / Cintura) < 0.65 (Baixo volume muscular periférico associado a resistência à insulina).

---

# MÓDULO 3: Goniometria Articular & Cinemática de Movimento

### 3.1 Inputs do Sistema
Objeto `asGonio` contendo valores em graus angulares (°) nos regimes **Sem Força (Ativo)** e **Com Força (Passivo)**:
- **Quadril**: `quadrilFlexao1D/E` (joelho estendido), `quadrilFlexao2D/E` (joelho fletido), `quadrilExtensaoD/E`, `quadrilAducaoD/E`, `quadrilAbducaoD/E`, `quadrilRotIntD/E`, `quadrilRotExtD/E`.
- **Joelho / Fíbula**: `joelhoFlexaoD/E`, `joelhoExtensaoD/E`, `kfboD/E` (distância cabeça da fíbula em cm).
- **Tornozelo**: `tornozeloDorsi1D/E` (Lunge test), `tornozeloDorsi2D/E` (joelho estendido), `tornozeloFlexaoPlantarD/E`.
- **Ombro**: `ombroRotIntD/E`, `ombroRotExtD/E`, `ombroFlexaoD/E`, `ombroExtensaoD/E`, `ombroAbducaoD/E`.
- **Cinemática**: `cinematicaAducaoQuadrilD/E` (graus de adução dinâmica na corrida).

---

### 3.2 Equações e Regras de Disparo de Alertas

```
                                  GONIOMETRIA ARTICULAR
                                            │
        ┌───────────────────┬───────────────┴───────────────┬──────────────────┐
        ▼                   ▼                               ▼                  ▼
  [ QUADRIL ]          [ TORNOZELO ]                    [ OMBRO ]         [ CINEMÁTICA ]
  - RI + RE < 85°      - Dorsiflexão < 35°             - GIRD > 20°       - Adução Corrida > 15°
    ↳ Alerta SIF         ↳ Alerta Tendinopatia           ↳ Alerta SLAP      ↳ Alerta STIT
  - RI < 20° (IFA)         Patelar / Fascite               / Manguito
  - RE < 35° (Menisco)
  - Flexão < 120°
```

#### Regras Matemáticas e Gatilhos:
1. **Arco Total de Rotação do Quadril (SIF)**:
   ```
   Arco Total (°) = Rotação Interna + Rotação Externa
   ```
   - 🔴 **Alerta SIF (Arco Total < 85°)**: Restrição capsular global do quadril. Risco de impacto femoroacetabular, lesão de labrum e dor na virilha.
   - 🔴 **Alerta IFA Severo (RI < 20°)**: Rotação interna severamente bloqueada.
   - ⚠️ **Alerta Valgo Dinâmico (20° ≤ RI < 30°)**: Risco aumentado de colapso medial do joelho.
   - ⚠️ **Alerta Cisalhamento Meniscal (RE < 35°)**: Sobrecarga rotacional transferida ao menisco medial e ligamento colateral medial (LCM).
2. **Flexão Profunda de Quadril com Joelho Fletido**:
   - 🔴 **Alerta Restrição Flexão (< 120°)**: Risco de Síndrome da Dor Patelofemoral (SDPF) e retroversão pélvica precoce no agachamento.
3. **Assimetria no Teste KFBO (Cabeça da Fíbula)**:
   - 🔴 **Alerta KFBO (> 15 cm)**: Se `|KFBO_D - KFBO_E| > 15 cm`. Indica 2.3x mais chance de valgo dinâmico.
4. **Dorsiflexão de Tornozelo em Carga (Lunge Test)**:
   - ⚠️ **Alerta Déficit de Dorsiflexão (< 35°)**: Predisposição a tendinopatia patelar, tendinite de Aquiles e fascite plantar.
5. **Déficit de Rotação Interna Glenoumeral (GIRD)**:
   - 🔴 **Alerta GIRD (> 20°)**: Se `|OmbroRotInt_D - OmbroRotInt_E| > 20°`. Risco de impacto subacromial e lesão do manguito rotador.
6. **Cinemática da Marcha / Corrida**:
   - 🔴 **Alerta Pico de Adução (> 15°)**: Adução excessiva de fêmur na fase de apoio. Preditor direto de Síndrome do Trato Iliotibial (STIT).

---

### 3.3 💡 Oportunidades de Novos Alertas e Referências a Adicionar
1. **Arco Total de Rotação Glenoumeral (TROM - Total Range of Motion do Ombro)**:
   ```
   TROM = Rotação Interna + Rotação Externa
   Diferença TROM = |TROM_Direito - TROM_Esquerdo|
   ```
   - *Novo Alerta*: Diferença de TROM > 10° (Principal preditor de lesão labral e instabilidade em exercícios de membros superiores).
2. **Diferenciação de Encurtamento de Sóleo vs Gastrocnêmio**:
   - *Novo Alerta*: Se a Dorsiflexão 1 (joelho fletido) for normal (≥ 35°), mas a Dorsiflexão 2 (joelho estendido) for < 15°, o encurtamento é puramente do gastrocnêmio biarticular.

---

# MÓDULO 4: Teste de Thomas (Flexores de Quadril & Retofemoral)

### 4.1 Inputs do Sistema
- `thomasIliopsoasDStatus` / `thomasIliopsoasEStatus`: Seleção ('Negativo' ou 'Positivo').
- `thomasIliopsoasD` / `thomasIliopsoasE`: Graus de elevação da coxa acima da horizontal da maca (°).
- `thomasRetofemoralDStatus` / `thomasRetofemoralEStatus`: Seleção ('Negativo' ou 'Positivo').
- `thomasRetofemoralD` / `thomasRetofemoralE`: Graus de flexão passiva do joelho (°).

---

### 4.2 Equações e Regras de Disparo

| Estrutura Avaliada | Condição de Disparo no Código | Severidade | Diagnóstico / Alerta do Sistema |
| :--- | :--- | :--- | :--- |
| **Iliopsoas (D/E)** | `Status === 'Positivo'` OU `Graus > 5°` | 🔴 **Crítico** | **Encurtamento de Iliopsoas**: Coxa não atinge o plano horizontal da maca. Risco de anteversão pélvica, hiperlordose lombar compensatória e inibição glútea recíproca. |
| **Retofemoral (D/E)** | `Status === 'Positivo'` OU `Graus < 80°` | ⚠️ **Atenção** | **Encurtamento de Retofemoral**: Joelho não atinge 90° de flexão passiva. Tensão patelofemoral e sobrecarga no tendão patelar. |

---

### 4.3 💡 Oportunidades de Novos Alertas a Adicionar
1. **Sinal de Kendall (Abdução Espontânea no Thomas)**:
   - Identifica quando a coxa abduz para fora ao deitar, confirmando retração primária do Tensor da Fáscia Lata (TFL).

---

# MÓDULO 5: Teste de Ober (Trato Iliotibial & Tensor da Fáscia Lata)

### 5.1 Inputs do Sistema
- `tOberD` / `tOberE`: Seleção ('Negativo' ou 'Positivo').

---

### 5.2 Regras de Disparo
- Se `tOberD === 'Positivo'` ou `tOberE === 'Positivo'`:
  - 🔴 **Alerta Crítico**: **Teste de Ober Positivo (Retração de TFL / Trato Iliotibial)**.
  - *Risco Clínico*: Síndrome do Trato Iliotibial (STIT), atrito no epicôndilo femoral lateral e aumento do vetor de valgo no joelho.

---

# MÓDULO 6: Y-Balance Test (Y-Test — Estabilidade Dinâmica Unipodal)

### 6.1 Inputs do Sistema
- `yLenD`, `yLenE`: Comprimento real do membro inferior em cm.
- `yAntD`, `yAntE`: Alcance Anterior em cm.
- `yPMD`, `yPME`: Alcance Póstero-Medial em cm.
- `yPLD`, `yPLE`: Alcance Póstero-Lateral em cm.

---

### 6.2 Equações Matemáticas

#### 1. Escore Composto (% do Comprimento do Membro):
```
Soma Direito = Alcance Anterior D + Alcance PM D + Alcance PL D
Escore Composto D (%) = (Soma Direito / (3 × Comprimento Membro D)) × 100

Soma Esquerdo = Alcance Anterior E + Alcance PM E + Alcance PL E
Escore Composto E (%) = (Soma Esquerdo / (3 × Comprimento Membro E)) × 100
```

#### 2. Assimetrias Absolutas em Centímetros:
```
Assimetria Anterior (cm) = |Alcance Anterior D - Alcance Anterior E|
Assimetria Póstero-Medial (cm) = |Alcance PM D - Alcance PM E|
Assimetria Póstero-Lateral (cm) = |Alcance PL D - Alcance PL E|
Assimetria Composta (%) = |Escore Composto D - Escore Composto E|
```

---

### 6.3 Matriz de Alertas Atuais
- 🔴 **Assimetria Anterior Crítica (≥ 4.0 cm)**:
  - *Evidência*: 2.5x a 3.8x maior chance de lesão ligamentar de membro inferior (LCA sem contato).
- ⚠️ **Leve Assimetria Anterior (3.0 cm a 3.9 cm)**: Atenção à desaceleração unipodal.
- ⚠️ **Assimetria Posterior Relevante (≥ 6.0 cm em PM ou PL)**: Déficit rotacional e instabilidade posterolateral de quadril.
- ⚠️ **Escore Composto Reduzido (< 94%)**: Baixa capacidade global de absorção de impacto.

---

# MÓDULO 7: Step Down Test (Controle Cinemático Excêntrico)

### 7.1 Inputs do Sistema
- `sdPelvicaD/E`: Graus de queda pélvica (°).
- `sdAducaoD/E`: Graus de adução do quadril (°).
- `sdValgoD/E`: Graus de valgo dinâmico do joelho (°).
- `sdPrpsD/E`: Ângulo excêntrico / PRPS (°).
- `sexo`: 'M' ou 'F'.

---

### 7.2 Algoritmo de Contagem de Erros (0 a 4 Pontos)

```
Erro 1 (Queda Pélvica): Se queda pélvica > 5° ➔ +1 ponto de erro
Erro 2 (Adução Quadril): Se adução de quadril > 10° ➔ +1 ponto de erro
Erro 3 (Valgo Dinâmico): Se valgo > 10° (Homens) ou > 15° (Mulheres) ➔ +1 ponto de erro
Erro 4 (Ângulo Excêntrico): Se PRPS > 0 e PRPS < 60° ➔ +1 ponto de erro
```

#### Classificação de Saída:
- **0 a 1 Erro**: `Excelente / Bom (Baixo Risco)`
- **2 Erros**: `Moderado (Risco Intermediário)`
- **3 a 4 Erros**: `Pobre / Risco Elevado` 🔴

---

### 7.3 Alertas Disparados
- 🔴 **Controle Cinemático Global Pobre (≥ 3 Erros)**: Disparado quando há colapso simultâneo em múltiplos planos.
- Alertas individuais para queda pélvica > 5°, adução > 10° e valgo dinâmico aumentado.

---

# MÓDULO 8: Estrela de Maigne (Rosa dos Ventos de Dor & Mobilidade da Coluna)

### 8.1 Inputs do Sistema
- **Amplitudes Angulares (0° a 50°)**: `mFlex`, `mExt`, `mRotD`, `mRotE`, `mIncD`, `mIncE`.
- **Intensidade da Dor (Escala EVA: 0 a 10)**: `mFlexEVA`, `mExtEVA`, `mRotDEVA`, `mRotEEVA`, `mIncDEVA`, `mIncEEVA`.

---

### 8.2 Processamento Gráfico & Vetorial
- Renderização em gráfico polar interativo com 6 eixos cardeais a cada 60°.
- Polígono de referência normativa (40°, 40°, 30°, 30°, 30°, 40°) sobreposto ao polígono real do paciente.
- Identificação imediata do **vetor de bloqueio mecânico** versus **vetor livre para intervenção terapêutica** (Regra do não-doloroso e movimento contrário).

---

# MÓDULO 9: Discinesia Escapular (Avaliação de Ritmo Escapuloumeral)

### 9.1 Inputs do Sistema
- `repDeTipo`: Seleção ('Tipo IV: Normal', 'Tipo I: Ângulo Ínfero-Medial', 'Tipo II: Borda Medial Total', 'Tipo III: Borda Superior').
- `repDeAbdBilateral`: Checkbox ('sim' ou 'nao') — Projeção anterior de cabeça na abdução bilateral.
- `repDeAbdUnilateral`: Checkbox ('sim' ou 'nao') — Inclinação torácica contralateral e desvio de cabeça.
- `repDeDorAbd`: Checkbox ('sim' ou 'nao') — Dor ao final da abdução unilateral.

---

### 9.2 Classificação de Saída & Diagnóstico Clínico
- **Tipo I**: Déficit de ativação do trapézio inferior e encurtamento do peitoral menor.
- **Tipo II**: Inibição de serrátil anterior e romboides (escápula alada clássica).
- **Tipo III**: Hiperativação de trapézio superior e elevador da escápula com pinçamento subacromial precoce.
- **Tipo IV**: Movimento fisiológico normal e simétrico.

---

# MÓDULO 10: Dinamometria Isométrica Computadorizada (Strength Atlas Engine)

### 10.1 Inputs do Sistema
Para cada movimento avaliado no teste de força:
- `articulacao`: Seleção ('Tornozelo', 'Joelho', 'Quadril', 'Ombro', 'Cotovelo', 'Punho', 'Coluna / Tronco', 'Membro Superior').
- `movimento`: Seleção ('Flexão', 'Extensão', 'Abdução', 'Adução', 'Rotação Interna', 'Rotação Externa', 'Remada', 'Supino', etc.).
- `lado`: 'Direito' ou 'Esquerdo'.
- `unidade`: 'kgf' ou 'N'.
- `valorObtido`: Força pico máxima registrada.
- `pesoCorporal`: Peso do aluno em kg.

---

### 10.2 Equações e Processamento Algorítmico

#### 1. Padronização para Newtons (N):
```
Se unidade for 'kgf' ➔ Força (N) = Valor × 9.80665
Se unidade for 'N'   ➔ Força (N) = Valor
```

#### 2. Força Relativa em Percentual do Peso Corporal (%PC):
```
Força em kgf = Força (N) / 9.80665
%PC = (Força em kgf / Peso Corporal em kg) × 100
```

#### 3. Índice de Simetria e Déficit Bilateral Contralateral:
```
Simetria (%) = (Mínimo(Força D, Força E) / Máximo(Força D, Força E)) × 100
Déficit (%) = 100 - Simetria (%)
```

- **Déficit ≤ 10%**: *Excelente / Aceitável* (Verde).
- **Déficit entre 11% e 15%**: *Atenção* (Amarelo).
- **Déficit > 15%**: *Risco Elevado / Crítico* (Vermelho).

---

### 10.3 Matriz de Razões Musculares & Alertas Ortopédicos

| Razão Muscular | Fórmula Algorítmica | Faixa Ideal Normativa | Alerta Crítico Disparado | Risco Clínico Associado |
| :--- | :--- | :--- | :--- | :--- |
| **Adutor / Abdutor Quadril** | Adutores (N) / Abdutores (N) | 0.80 a 1.15 (Ideal 1:1) | 🔴 < 0.80 (Déficit Adutor)<br/>🔴 > 1.15 (Hiperativação Adutora) | Risco de dor inguinal e pubalgia atlética por estresse na sínfise púbica. |
| **Razão I:Q (Joelho)** | Isquiotibiais (N) / Quadríceps (N) | 60% a 75% | 🔴 < 60% (Razão I:Q Crítica) | Risco crítico de ruptura de LCA e estiramento de isquiotibiais (2x a 8x maior). |
| **Quadríceps Relativo** | (Extensão Joelho em kgf / Peso) × 100 | Homens ≥ 70% PC<br/>Mulheres ≥ 60% PC | 🔴 Abaixo do limiar por sexo | Sobrecarga femoropatelar e insuficiência extensora em desacelerações. |
| **Glúteo Médio Relativo** | (Abdução Quadril em kgf / Peso) × 100 | Homens ≥ 25% PC<br/>Mulheres ≥ 20% PC | 🔴 Abaixo do limiar por sexo | Forte correlação com SDPF, queda pélvica e valgo dinâmico. |
| **RI / RE Quadril** | Rot. Interna (N) / Rot. Externa (N) | 1.00 (1:1) | 🔴 > 1.20 | Predisposição a Impacto Femoroacetabular e perda de controle rotacional. |
| **Rotadores Ombro (RE/RI)** | Rot. Externa (N) / Rot. Interna (N) | 0.70 a 0.85 | 🔴 < 0.70 | Síndrome do Impacto Subacromial e tendinopatia do supraespinal. |
| **Extensores de Tronco** | (Extensão Coluna em kgf / Peso) × 100 | ≥ 100% PC | ⚠️ < 100% PC | Fadiga postural precoce e dor lombar crônica. |
| **Flexão / Extensão Tronco** | Flexores Tronco (N) / Extensores Tronco (N) | 0.70 a 0.80 | ⚠️ Fora da faixa 0.70 a 0.85 | Desequilíbrio de carga na coluna lombar e estresse discal. |
| **Rotação de Tronco** | (Diferença D/E / Maior) × 100 | Diferença ≤ 10% | ⚠️ > 10% assimetria | Sobrecarga assimétrica nos discos intervertebrais. |
| **Remada / Supino** | Remada (N) / Supino (N) | ≥ 0.80 a 1.00 | ⚠️ < 0.80 | Protração escapular excessiva e instabilidade anterior do ombro. |
| **Puxada / Desenvolvimento** | Puxada (N) / Desenvolvimento (N) | ≥ 1.00 a 1.10 | ⚠️ < 1.00 | Fraqueza de trapézio inferior e serrátil anterior. |
| **Inversão / Eversão Tornozelo** | (Diferença D/E / Maior) × 100 | Diferença ≤ 10% | ⚠️ > 15% assimetria | Risco de entorse de tornozelo por instabilidade lateral. |
| **Panturrilha / Tibial Anterior** | Flexão Plantar (N) / Dorsiflexão (N) | 3.4 : 1 | ⚠️ Fora da faixa 2.5 a 4.5 | Sobrecarga na tíbia (canelite) ou tendinopatia de Aquiles. |

---

# MÓDULO 11: Anamnese Estruturada, Escala de Dor EVA & Histórico Clínico

### 11.1 Inputs do Sistema
- **Queixas Múltiplas**: Lista de queixas contendo:
  - `dorOnde`: Local anatômico.
  - `quandoComecou`: Tempo de evolução.
  - `comoIniciou`: Mecanismo de lesão ou trauma.
  - `dorEvolucao`: 'estavel', 'aumentando' ou 'diminuindo'.
  - `dorIntensidade`: Número de 0 a 10 (Escala Visual Analógica - EVA).
  - `dorTodoMomento`: 'sim' ou 'nao'.
  - `desencadeiaPiora`: Fatores de agravamento.
  - `melhoraDesaparece`: Fatores de alívio.
  - `caracteristicaDor`: 'Queimação', 'Elétrica / Choque', 'Pontual / Aguda', 'Difusa / Surda' ou 'Latejante'.
  - `origens`: Seleção múltipla ('Discal', 'Ligamentar', 'Muscular', 'Nervoso', 'Facetário', 'Visceral').
- **Histórico & Estilo de Vida**:
  - `traumas`, `cirurgiasRealizou`, `cirurgiasList` (data e local), `doencasPregressas`.
  - `traumasEmocionaisStress`, `medicacao`, `drogasRecreativas`.
  - `sonoHoras` (número), `sonoTipo` ('continuo' ou 'acorda'), `sonoQualidade` ('Excelente', 'Bom', 'Regular', 'Ruim').

---

# MÓDULO 12: Painel Consolidado de Ideias para Novos Alertas e Índices Preditivos

Com base na arquitetura matemática do sistema, aqui estão as principais **oportunidades de evolução analítica e clínica** que podemos implementar:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                    💡 OPORTUNIDADES DE NOVOS ÍNDICES E ALERTAS INTELIGENTES                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. SCORE GLOBAL DE RISCO DE LESÃO (0 a 100 PONTOS)                                               │
│    Algoritmo ponderado que combina:                                                              │
│    - Assimetria no Y-Test (+25 pts se ≥ 4 cm)                                                    │
│    - Razão I:Q de Joelho (+30 pts se < 60%)                                                      │
│    - Erros no Step Down (+20 pts se ≥ 3 erros)                                                   │
│    - Déficit de Dorsiflexão (+15 pts se < 35°)                                                   │
│    - Assimetria de Força em Dinamometria (+10 pts se > 15%)                                      │
│    Saída: Classificação em Baixo Risco (0-29), Moderado (30-59) e Alto Risco de Lesão (≥ 60).   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. ÍNDICE DE CAPACIDADE DE ABSORÇÃO DE IMPACTO (ICAI)                                            │
│    Cruza a força de Quadríceps (%PC) com a Dorsiflexão de Tornozelo em Carga.                    │
│    - Se Quadríceps < 60% e Dorsiflexão < 35° ➔ Alerta: "Incapacidade de Amortecimento Excêntrico;   │
│      Proibir pliometria de alto impacto e saltos até restauração do arco articular".             │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. ÍNDICE DE ESTABILIDADE LOMBOPÉLVICA (CORE COMPLEX)                                            │
│    Cruza Força de Extensores de Tronco (%PC) + Razão Flex/Ext + Teste de Thomas.                 │
│    - Se Thomas (+) com Extensores < 100% ➔ Alerta: "Síndrome Cruzada Pélvica de Janda            │
│      (Hiperlordose com inibição glútea e sobrecarga discal em L5-S1)".                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. ÍNDICE DE SAÚDE ESCAPULOTORÁCICA (ISE)                                                        │
│    Cruza Discinesia Escapular (Kibler) + GIRD de Ombro + Razão Remada/Supino.                    │
│    - Se Discinesia Tipo I/II + Remada/Supino < 0.80 ➔ Alerta: "Risco Crítico de Tendinopatia     │
│      do Manguito e Bursite Subacromial em Exercícios de Empurre".                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. RECOMENDAÇÃO AUTOMÁTICA DE CARGA MÁXIMA SUGERIDA (1RM ESTIMADO)                              │
│    A partir da força pico isométrica (N) nos testes, estimar o 1RM para Leg Press, Agachamento,  │
│    Supino e Remada, orientando o treinador diretamente na sala de musculação.                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

> **Documento de Especificação Técnica e Engenharia Biomecânica**  
> *Clube Fitness Fisio — Inteligência Algorítmica e Prevenção de Lesões.*
