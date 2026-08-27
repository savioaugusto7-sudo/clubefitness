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
| `sexo` | String ('M' \| 'F') | - | Gênero biológico para determinação da fórmula de densidade |
| `peso` | Número Decimal | $kg$ | Peso corporal total |
| `altura` | Número Decimal | $m$ | Estatura em metros (ex: 1.75) |
| `dobras.peitoral` | Array [M1, M2, M3] | $mm$ | Até 3 leituras da dobra peitoral |
| `dobras.triceps` | Array [M1, M2, M3] | $mm$ | Até 3 leituras da dobra tricipital |
| `dobras.subescapular` | Array [M1, M2, M3] | $mm$ | Até 3 leituras da dobra subescapular |
| `dobras.subaxilar` | Array [M1, M2, M3] | $mm$ | Até 3 leituras da dobra axilar média |
| `dobras.suprailiaca` | Array [M1, M2, M3] | $mm$ | Até 3 leituras da dobra supra-ilíaca |
| `dobras.abdomen` | Array [M1, M2, M3] | $mm$ | Até 3 leituras da dobra abdominal |
| `dobras.coxa` | Array [M1, M2, M3] | $mm$ | Até 3 leituras da dobra da coxa |
| `dobras.panturrilha` | Array [M1, M2, M3] | $mm$ | Até 3 leituras da dobra da panturrilha (opcional) |

---

### 1.2 Equações e Processamento Lógico

#### 1. Média Aritmética das Leituras por Ponto ($D_i$):
Para cada dobra $i$, o sistema filtra as medidas preenchidas e calcula:
$$\overline{D}_i = \frac{1}{n} \sum_{k=1}^{n} M_k \quad (n \in \{1, 2, 3\})$$

#### 2. Somatório das 7 Dobras ($\Sigma 7D$):
$$\Sigma 7D = \overline{\text{Peitoral}} + \overline{\text{Tríceps}} + \overline{\text{Subescapular}} + \overline{\text{Axilar Média}} + \overline{\text{Supra-ilíaca}} + \overline{\text{Abdômen}} + \overline{\text{Coxa}}$$

#### 3. Densidade Corporal ($D$ em $g/cm^3$) — Equações de Jackson & Pollock:
- **Masculino**:
  $$D_{\text{M}} = 1.1120000 - 0.00043499(\Sigma 7D) + 0.00000055(\Sigma 7D)^2 - 0.00028826(\text{Idade})$$
- **Feminino**:
  $$D_{\text{F}} = 1.0970000 - 0.00046971(\Sigma 7D) + 0.00000056(\Sigma 7D)^2 - 0.00012828(\text{Idade})$$

#### 4. Percentual de Gordura (%BF) — Fórmula de Siri:
$$\%BF = \left( \frac{4.95}{D} - 4.50 \right) \times 100$$

#### 5. Fracionamento de Massas Corporais e IMC:
$$\text{Massa Gorda (kg)} = \text{Peso} \times \left(\frac{\%BF}{100}\right)$$
$$\text{Massa Magra (kg)} = \text{Peso} - \text{Massa Gorda (kg)}$$
$$\text{IMC} = \frac{\text{Peso (kg)}}{\text{Altura (m)}^2}$$

---

### 1.3 Resultados Possíveis (Outputs Gerados)
- **$\Sigma 7D$**: Número em $mm$ (Ex: $85.4\text{ mm}$).
- **%BF Calculado**: Percentual de 3% a 60% (Ex: $14.2\%$).
- **Massa Gorda**: $kg$ de tecido adiposo (Ex: $11.3\text{ kg}$).
- **Massa Magra**: $kg$ de massa livre de gordura (músculo, osso, órgãos, água) (Ex: $68.7\text{ kg}$).
- **IMC**: Valor com classificação OMS (Baixo Peso $<18.5$, Eutrófico $18.5-24.9$, Sobrepeso $25.0-29.9$, Obesidade $\ge 30.0$).

---

### 1.4 Alertas Atuais do Sistema
- ⚠️ **Alerta de Perda de Massa Magra / Composição Incompatível**: Quando comparado com avaliação anterior, se houver redução de massa magra simultânea ao aumento de %BF.

---

### 1.5 💡 Oportunidades de Novos Alertas e Referências a Adicionar
1. **Índice de Massa Livre de Gordura (FFMI - Fat-Free Mass Index)**:
   $$\text{FFMI} = \frac{\text{Massa Magra (kg)}}{\text{Altura (m)}^2} + 6.1 \times (1.8 - \text{Altura (m)})$$
   - *Novo Alerta*: $\text{FFMI} < 17\text{ kg/m}^2$ (Risco de Sarcopenia em adultos/idosos); $\text{FFMI} > 25\text{ kg/m}^2$ (Limite biológico natural para hipertrofia).
2. **Índice de Adiposidade Central (Razão Dobra Abdominal / Dobra da Coxa)**:
   - *Novo Alerta*: $\frac{\text{Abdômen}}{\text{Coxa}} > 1.5$ (Predomínio de gordura visceral androgênica e risco cardiovascular aterogênico elevado).

---

# MÓDULO 2: Perimetria Corporal & Análise de Assimetrias Contralaterais

### 2.1 Inputs do Sistema
14 medidas de perímetro corporal em centímetros ($cm$), passo decimal:
`circ.pescoco`, `circ.ombros`, `circ.torax`, `circ.cintura`, `circ.abdomen`, `circ.quadril`, `circ.braçoD`, `circ.braçoE`, `circ.antebraçoD`, `circ.antebraçoE`, `circ.coxaD`, `circ.coxaE`, `circ.panturrilhaD`, `circ.panturrilhaE`.

---

### 2.2 Equações e Processamento Lógico

#### 1. Razão Cintura-Quadril (RCQ):
$$\text{RCQ} = \frac{\text{Cintura (cm)}}{\text{Quadril (cm)}}$$

#### 2. Razão Cintura-Estatura (RCEst):
$$\text{RCEst} = \frac{\text{Cintura (cm)}}{\text{Altura (cm)}}$$

#### 3. Assimetria Percentual Contralateral ($\text{Assy}_{\%}$):
Para cada par de membros $\{(\text{Braço D, E}), (\text{Antebraço D, E}), (\text{Coxa D, E}), (\text{Panturrilha D, E})\}$:
$$\text{Assy}_{\%} = \frac{|D - E|}{\max(D, E)} \times 100$$

---

### 2.3 Resultados Possíveis (Outputs)
- **Tabela Comparativa Contralateral**: Lista lado direito vs esquerdo e a diferença percentual.
- **Comparativo Temporal Histórico**: Mostra evolução delta ($\Delta$) em relação à avaliação anterior com indicação de *Melhora* (verde) ou *Piora* (vermelho/amarelo).

---

### 2.4 Alertas Atuais do Sistema
- 🔴 **Assimetria Crítica (> 10%)**: Disparado individualmente para braço, antebraço, coxa ou panturrilha quando a diferença entre os membros excede 10%.
  - *Risco*: Inibição reflexa artrogênica pós-traumática ou sobrecarga mecânica assimétrica em exercícios bilaterais.

---

### 2.5 💡 Oportunidades de Novos Alertas e Referências a Adicionar
1. **Alerta de Risco Coronariano e Metabólico por RCQ**:
   - *Homens*: $\text{RCQ} > 0.90$ (Risco Aumentado); $\text{RCQ} > 1.00$ (Risco Muito Alto).
   - *Mulheres*: $\text{RCQ} > 0.80$ (Risco Aumentado); $\text{RCQ} > 0.85$ (Risco Muito Alto).
2. **Alerta de Risco Cardiometabólico Universal (RCEst)**:
   - *Gatilho*: $\text{RCEst} > 0.50$ (A circunferência da cintura não deve ultrapassar a metade da estatura).
3. **Razão Coxa / Cintura (Índice Protetor Metabólico)**:
   - *Gatilho*: $\frac{\text{Coxa}}{\text{Cintura}} < 0.65$ (Baixo volume muscular periférico associado a resistência à insulina).

---

# MÓDULO 3: Goniometria Articular & Cinemática de Movimento

### 3.1 Inputs do Sistema
Objeto `asGonio` contendo valores em graus angulares ($^\circ$) nos regimes **Sem Força (Ativo)** e **Com Força (Passivo)**:
- **Quadril**: `quadrilFlexao1D/E` (joelho estendido), `quadrilFlexao2D/E` (joelho fletido), `quadrilExtensaoD/E`, `quadrilAducaoD/E`, `quadrilAbducaoD/E`, `quadrilRotIntD/E`, `quadrilRotExtD/E`.
- **Joelho / Fíbula**: `joelhoFlexaoD/E`, `joelhoExtensaoD/E`, `kfboD/E` (distância cabeça da fíbula em $cm$).
- **Tornozelo**: `tornozeloDorsi1D/E` (Lunge test), `tornozeloDorsi2D/E` (joelho estendido), `tornozeloFlexaoPlantarD/E`.
- **Ombro**: `ombroRotIntD/E`, `ombroRotExtD/E`, `ombroFlexaoD/E`, `ombroExtensaoD/E`, `ombroAbducaoD/E`.
- **Cinemática**: `cinematicaAducaoQuadrilD/E` (graus de adução na corrida).

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

#### Regras Matemáticas Exatas:
1. **Arco Total de Rotação do Quadril**: $\text{Arco Total} = \text{RotInt} + \text{RotExt}$
   - 🔴 **Alerta SIF**: Se $\text{Arco Total} < 85^\circ$.
   - 🔴 **Alerta IFA Severo**: Se $\text{RotInt} < 20^\circ$.
   - ⚠️ **Alerta Valgo Dinâmico**: Se $20^\circ \le \text{RotInt} < 30^\circ$.
   - ⚠️ **Alerta Cisalhamento Menisco Medial**: Se $\text{RotExt} < 35^\circ$.
2. **Flexão Profunda de Quadril com Joelho Fletido**:
   - 🔴 **Alerta Restrição Flexão (< 120°)**: Disparado se $\text{Flexão} < 120^\circ$.
3. **Assimetria no Teste KFBO (Cabeça da Fíbula)**:
   - 🔴 **Alerta KFBO (> 15 cm)**: Se $|\text{KFBO}_D - \text{KFBO}_E| > 15\text{ cm}$.
4. **Dorsiflexão de Tornozelo (Lunge Test)**:
   - ⚠️ **Alerta Déficit de Dorsiflexão**: Se $\text{Dorsi1} < 35^\circ$.
5. **Déficit de Rotação Interna Glenoumeral (GIRD)**:
   - 🔴 **Alerta GIRD**: Se $|\text{OmbroRotInt}_D - \text{OmbroRotInt}_E| > 20^\circ$.
6. **Cinemática de Apoio na Corrida**:
   - 🔴 **Alerta Pico de Adução Excessivo**: Se $\text{AduçãoCorrida} > 15^\circ$.

---

### 3.3 💡 Oportunidades de Novos Alertas e Referências a Adicionar
1. **Arco Total de Rotação Glenoumeral (TROM - Total Range of Motion do Ombro)**:
   $$\text{TROM} = \text{RotInt} + \text{RotExt}$$
   - *Novo Alerta*: Diferença de TROM entre os ombros $> 10^\circ$ (Fator preditivo número 1 de lesão ligamentar ulnar e labral em praticantes de musculação/crossfit/arremesso).
2. **Razão de Dorsiflexão Sóleo vs Gastrocnêmio (Dorsi 1 / Dorsi 2)**:
   - *Novo Alerta*: Se $\text{Dorsi 1} \ge 35^\circ$ mas $\text{Dorsi 2} < 15^\circ$, o encurtamento é puramente do **gastrocnêmio** (biarticular) e não do sóleo/cápsula articular.

---

# MÓDULO 4: Teste de Thomas (Flexores de Quadril & Retofemoral)

### 4.1 Inputs do Sistema
- `thomasIliopsoasDStatus` / `thomasIliopsoasEStatus`: String (`'Negativo'` | `'Positivo'`).
- `thomasIliopsoasD` / `thomasIliopsoasE`: Número em graus ($^\circ$) de elevação da coxa acima da horizontal.
- `thomasRetofemoralDStatus` / `thomasRetofemoralEStatus`: String (`'Negativo'` | `'Positivo'`).
- `thomasRetofemoralD` / `thomasRetofemoralE`: Número em graus ($^\circ$) de flexão passiva do joelho.

---

### 4.2 Equações e Regras de Disparo

| Estrutura Avaliada | Condição de Disparo no Código | Severidade | Diagnóstico / Alerta do Sistema |
| :--- | :--- | :--- | :--- |
| **Iliopsoas (D/E)** | `Status === 'Positivo'` OU `Graus > 5°` | 🔴 **Crítico** | **Encurtamento de Iliopsoas**: Coxa não toca o plano horizontal da maca. Risco de anteversão pélvica, hiperlordose lombar e inibição glútea recíproca. |
| **Retofemoral (D/E)** | `Status === 'Positivo'` OU `Graus < 80°` | ⚠️ **Atenção** | **Encurtamento de Retofemoral**: Joelho não atinge 90° de flexão passiva pendente. Tensão femoropatelar e sobrecarga no tendão patelar. |

---

### 4.3 💡 Oportunidades de Novos Alertas a Adicionar
1. **Alerta de Abdução em Thomas (Sinal de J-Sign / Tensor da Fáscia Lata Encurtado)**:
   - Adicionar campo *Adução/Abdução da coxa no Thomas*. Se a coxa abduzir espontaneamente ao deitar, confirma encurtamento primário do TFL (*Sinal de Kendall*).

---

# MÓDULO 5: Teste de Ober (Trato Iliotibial & Tensor da Fáscia Lata)

### 5.1 Inputs do Sistema
- `tOberD` / `tOberE`: String (`'Negativo'` | `'Positivo'`).

---

### 5.2 Regras de Disparo
- Se `tOberD === 'Positivo'` ou `tOberE === 'Positivo'`:
  - 🔴 **Alerta Crítico**: **Teste de Ober Positivo (Retração de TFL / Trato Iliotibial)**.
  - *Risco Clínico*: Síndrome do Trato Iliotibial (STIT), atrito no epicôndilo femoral lateral e vetor de valgo no joelho.

---

# MÓDULO 6: Y-Balance Test (Y-Test — Estabilidade Dinâmica Unipodal)

### 6.1 Inputs do Sistema
- `yLenD`, `yLenE`: Comprimento real do membro inferior ($cm$).
- `yAntD`, `yAntE`: Alcance Anterior ($cm$).
- `yPMD`, `yPME`: Alcance Póstero-Medial ($cm$).
- `yPLD`, `yPLE`: Alcance Póstero-Lateral ($cm$).

---

### 6.2 Equações Matemáticas

#### 1. Escore Composto (% do Membro):
$$\text{Composite}_D = \frac{\text{Ant}_D + \text{PM}_D + \text{PL}_D}{3 \times \text{Len}_D} \times 100$$
$$\text{Composite}_E = \frac{\text{Ant}_E + \text{PM}_E + \text{PL}_E}{3 \times \text{Len}_E} \times 100$$

#### 2. Assimetrias Absolutas ($cm$):
$$\Delta\text{Ant} = |\text{Ant}_D - \text{Ant}_E|, \quad \Delta\text{PM} = |\text{PM}_D - \text{PM}_E|, \quad \Delta\text{PL} = |\text{PL}_D - \text{PL}_E|$$
$$\Delta\text{Composite} = |\text{Composite}_D - \text{Composite}_E|$$

---

### 6.3 Matriz de Alertas Atuais
- 🔴 **Assimetria Anterior Crítica ($\Delta\text{Ant} \ge 4.0\text{ cm}$)**:
  - *Evidência*: 2.5x a 3.8x maior chance de lesão ligamentar de membro inferior (LCA).
- ⚠️ **Leve Assimetria Anterior ($3.0\text{ cm} \le \Delta\text{Ant} < 4.0\text{ cm}$)**: Atenção à desaceleração unipodal.
- ⚠️ **Assimetria Posterior Relevante ($\Delta\text{PM} \ge 6.0\text{ cm}$ ou $\Delta\text{PL} \ge 6.0\text{ cm}$)**: Déficit rotacional e estabilidade posterolateral de quadril.
- ⚠️ **Escore Composto Reduzido ($\text{Composite} < 94\%$)**: Baixa capacidade de absorção de impacto global.

---

# MÓDULO 7: Step Down Test (Controle Cinemático Excêntrico)

### 7.1 Inputs do Sistema
- `sdPelvicaD/E`: Graus de queda pélvica ($^\circ$).
- `sdAducaoD/E`: Graus de adução do quadril ($^\circ$).
- `sdValgoD/E`: Graus de valgo dinâmico do joelho ($^\circ$).
- `sdPrpsD/E`: Ângulo excêntrico / PRPS ($^\circ$).
- `sexo`: `'M'` | `'F'`.

---

### 7.2 Algoritmo de Contagem de Erros (0 a 4 Pontos)

```typescript
let score = 0;
if (quedaPelvica > 5) score += 1;
if (aducaoQuadril > 10) score += 1;
if (valgoDinamico > (sexo === 'F' ? 15 : 10)) score += 1;
if (prps > 0 && prps < 60) score += 1;
```

#### Classificação de Saída:
- **0 a 1 Erro**: `Excelente / Bom (Baixo Risco)`
- **2 Erros**: `Moderado (Risco Intermediário)`
- **3 a 4 Erros**: `Pobre / Risco Elevado` 🔴

---

### 7.3 Alertas Disparados
- 🔴 **Controle Cinemático Global Pobre ($\ge 3$ Erros)**: Disparado quando há colapso simultâneo em múltiplos planos.
- Alertas individuais detalhados para cada falha $> 5^\circ$ de pelve, $> 10^\circ$ de adução e valgo dinâmico excessivo.

---

# MÓDULO 8: Estrela de Maigne (Rosa dos Ventos de Dor & Mobilidade da Coluna)

### 8.1 Inputs do Sistema
- **Amplitudes Angulares ($0^\circ \text{ a } 50^\circ$)**: `mFlex`, `mExt`, `mRotD`, `mRotE`, `mIncD`, `mIncE`.
- **Intensidade da Dor (Escala EVA: 0 a 10)**: `mFlexEVA`, `mExtEVA`, `mRotDEVA`, `mRotEEVA`, `mIncDEVA`, `mIncEEVA`.

---

### 8.2 Processamento Gráfico & Vetorial
- Renderização em SVG polar interativo (6 eixos cardeais a cada 60°).
- Polígono de referência normativa ($40^\circ, 40^\circ, 30^\circ, 30^\circ, 30^\circ, 40^\circ$) sobreposto ao polígono real do paciente.
- Identificação visual imediata do **vetor de bloqueio mecânico** vs **vetor livre para intervenção**.

---

# MÓDULO 9: Discinesia Escapular (Avaliação de Ritmo Escapuloumeral)

### 9.1 Inputs do Sistema
- `repDeTipo`: Seletor (`'Tipo IV: Normal'`, `'Tipo I: Ângulo Ínfero-Medial'`, `'Tipo II: Borda Medial Total'`, `'Tipo III: Borda Superior'`).
- `repDeAbdBilateral`: Checkbox (`'sim'` | `'nao'`) — Projeção anterior de cabeça na abdução bilateral.
- `repDeAbdUnilateral`: Checkbox (`'sim'` | `'nao'`) — Inclinação torácica contralateral e desvio de cabeça.
- `repDeDorAbd`: Checkbox (`'sim'` | `'nao'`) — Dor ao final da abdução unilateral.

---

### 9.2 Classificação de Saída & Diagnóstico Clínico
- **Tipo I**: Déficit de ativação do trapézio inferior e encurtamento do peitoral menor.
- **Tipo II**: Inibição de serrátil anterior e romboides (escápula alada clássica).
- **Tipo III**: Hiperativação de trapézio superior e elevador da escápula com pinçamento subacromial precoce.
- **Tipo IV**: Movimento fisiológico normal.

---

# MÓDULO 10: Dinamometria Isométrica Computadorizada (Strength Atlas Engine)

### 10.1 Inputs do Sistema
Para cada movimento avaliado no `showStrengthModal`:
- `articulacao`: Seletor (`'Tornozelo'`, `'Joelho'`, `'Quadril'`, `'Ombro'`, `'Cotovelo'`, `'Punho'`, `'Coluna / Tronco'`, `'Membro Superior'`).
- `movimento`: Seletor (`'Flexão'`, `'Extensão'`, `'Abdução'`, `'Adução'`, `'Rotação Interna'`, `'Rotação Externa'`, `'Remada'`, `'Supino'`, etc.).
- `lado`: `'Direito'` | `'Esquerdo'`.
- `unidade`: `'kgf'` | `'N'`.
- `valorObtido`: Número decimal (força pico máxima).
- `pesoCorporal`: $kg$ do aluno.

---

### 10.2 Equações e Processamento Algorítmico

#### 1. Padronização para Newtons ($N$):
$$\text{Força (N)} = \begin{cases} \text{Valor} \times 9.80665, & \text{se unidade} = \text{'kgf'} \\ \text{Valor}, & \text{se unidade} = \text{'N'} \end{cases}$$

#### 2. Força Relativa em Percentual do Peso Corporal (%PC):
$$\%PC = \frac{\text{Força (N)} / 9.80665}{\text{Peso Corporal (kg)}} \times 100$$

#### 3. Índice de Simetria e Déficit Bilateral Contralateral:
$$\text{Simetria (\%)} = \frac{\min(\text{Força}_D, \text{Força}_E)}{\max(\text{Força}_D, \text{Força}_E)} \times 100$$
$$\text{Déficit (\%)} = 100 - \text{Simetria (\%)}$$

- **$\text{Déficit} \le 10\%$**: *Excelente / Aceitável* (Verde).
- **$10\% < \text{Déficit} \le 15\%$**: *Atenção* (Amarelo).
- **$\text{Déficit} > 15\%$**: *Risco Elevado / Crítico* (Vermelho).

---

### 10.3 Matriz de Razões Musculares & Alertas Ortopédicos

| Razão Muscular | Fórmula Algorítmica | Faixa Ideal Normativa | Alerta Crítico Disparado | Risco Clínico Associado |
| :--- | :--- | :--- | :--- | :--- |
| **Adutor / Abdutor Quadril** | $\frac{\text{Adutores (N)}}{\text{Abdutores (N)}}$ | $0.80 - 1.15$ (Ideal 1:1) | 🔴 $< 0.80$ (Déficit Adutor)<br/>🔴 $> 1.15$ (Hiperativação Adutora) | Risco de dor inguinal e pubalgia atlética por estresse na sínfise púbica. |
| **Razão I:Q (Joelho)** | $\frac{\text{Isquiotibiais (N)}}{\text{Quadríceps (N)}}$ | $60\% - 75\%$ | 🔴 $< 60\%$ (Razão I:Q Crítica) | Risco crítico de ruptura de LCA e estiramento de isquiotibiais (2x a 8x maior). |
| **Quadríceps Relativo** | $\frac{\text{Extensão Joelho (kgf)}}{\text{Peso (kg)}} \times 100$ | $\text{M} \ge 70\%\text{PC}$<br/>$\text{F} \ge 60\%\text{PC}$ | 🔴 Abaixo do limiar por sexo | Sobrecarga femoropatelar e insuficiência extensora em desacelerações. |
| **Glúteo Médio Relativo** | $\frac{\text{Abdução Quadril (kgf)}}{\text{Peso (kg)}} \times 100$ | $\text{M} \ge 25\%\text{PC}$<br/>$\text{F} \ge 20\%\text{PC}$ | 🔴 Abaixo do limiar por sexo | Forte correlação com SDPF, queda pélvica e valgo dinâmico. |
| **RI / RE Quadril** | $\frac{\text{Rot. Interna (N)}}{\text{Rot. Externa (N)}}$ | $1.00$ ($1:1$) | 🔴 $> 1.20$ | Predisposição a Impacto Femoroacetabular e perda de controle rotacional. |
| **Rotadores Ombro (RE/RI)** | $\frac{\text{Rot. Externa (N)}}{\text{Rot. Interna (N)}}$ | $0.70 - 0.85$ | 🔴 $< 0.70$ | Síndrome do Impacto Subacromial e tendinopatia do supraespinal. |
| **Extensores de Tronco** | $\frac{\text{Extensão Coluna (kgf)}}{\text{Peso (kg)}} \times 100$ | $\ge 100\%\text{PC}$ | ⚠️ $< 100\%\text{PC}$ | Fadiga postural precoce e dor lombar crônica. |
| **Flexão / Extensão Tronco** | $\frac{\text{Flexores Tronco (N)}}{\text{Extensores Tronco (N)}}$ | $0.70 - 0.80$ | ⚠️ Fora da faixa $0.70 - 0.85$ | Desequilíbrio de carga na coluna lombar e estresse discal. |
| **Rotação de Tronco** | $\frac{|D - E|}{\max(D, E)} \times 100$ | $\le 10\%$ de diferença | ⚠️ $> 10\%$ assimetria | Sobrecarga assimétrica nos discos intervertebrais. |
| **Remada / Supino** | $\frac{\text{Remada (N)}}{\text{Supino (N)}}$ | $\ge 0.80 - 1.00$ | ⚠️ $< 0.80$ | Protração escapular excessiva e instabilidade anterior do ombro. |
| **Puxada / Desenvolvimento** | $\frac{\text{Puxada (N)}}{\text{Desenvolvimento (N)}}$ | $\ge 1.00 - 1.10$ | ⚠️ $< 1.00$ | Fraqueza de trapézio inferior e serrátil anterior. |
| **Inversão / Eversão Tornozelo** | $\frac{|D - E|}{\max(D, E)} \times 100$ | $\le 10\%$ de diferença | ⚠️ $> 15\%$ assimetria | Risco de entorse de tornozelo por instabilidade lateral. |
| **Panturrilha / Tibial Anterior** | $\frac{\text{Flexão Plantar (N)}}{\text{Dorsiflexão (N)}}$ | $3.4 : 1$ | ⚠️ Fora da faixa $2.5 - 4.5$ | Sobrecarga na tíbia (canelite) ou tendinopatia de Aquiles. |

---

# MÓDULO 11: Anamnese Estruturada, Escala de Dor EVA & Histórico Clínico

### 11.1 Inputs do Sistema
- **Queixas Múltiplas**: Array de objetos contendo:
  - `dorOnde`: String (local anatômico).
  - `quandoComecou`: String (tempo de evolução).
  - `comoIniciou`: String (mecanismo de lesão / trauma).
  - `dorEvolucao`: `'estavel'` | `'aumentando'` | `'diminuindo'`.
  - `dorIntensidade`: Número de 0 a 10 (Escala Visual Analógica - EVA).
  - `dorTodoMomento`: `'sim'` | `'nao'`.
  - `desencadeiaPiora`: String (fatores de agravamento).
  - `melhoraDesaparece`: String (fatores de alívio).
  - `caracteristicaDor`: `'Queimação'` | `'Elétrica / Choque'` | `'Pontual / Aguda'` | `'Difusa / Surda'` | `'Latejante'`.
  - `origens`: Array com seleção múltipla (`'Discal'`, `'Ligamentar'`, `'Muscular'`, `'Nervoso'`, `'Facetário'`, `'Visceral'`).
- **Histórico & Estilo de Vida**:
  - `traumas`, `cirurgiasRealizou`, `cirurgiasList` (data e local), `doencasPregressas`.
  - `traumasEmocionaisStress`, `medicacao`, `drogasRecreativas`.
  - `sonoHoras` (número), `sonoTipo` (`'continuo'` | `'acorda'`), `sonoQualidade` (`'Excelente'`, `'Bom'`, `'Regular'`, `'Ruim'`).

---

# MÓDULO 12: Painel Consolidado de Ideias para Novos Alertas e Índices Preditivos

Com base na arquitetura do sistema, aqui estão as principais **oportunidades de evolução clínica e biométrica** que podemos implementar:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                    💡 OPORTUNIDADES DE NOVOS ÍNDICES E ALERTAS INTELIGENTES                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. SCORE GLOBAL DE RISCO DE LESÃO (0 a 100)                                                      │
│    Algoritmo ponderado que combina:                                                              │
│    - Assimetria no Y-Test (+25 pts se ≥ 4cm)                                                     │
│    - Razão I:Q de Joelho (+30 pts se < 60%)                                                      │
│    - Erros no Step Down (+20 pts se ≥ 3 erros)                                                   │
│    - Déficit de Dorsiflexão (+15 pts se < 35°)                                                   │
│    - Assimetria de Força (+10 pts se > 15%)                                                      │
│    Saída: Classificação em Baixo Risco (0-29), Moderado (30-59) e Alto Risco de Lesão (≥60).    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. ÍNDICE DE CAPACIDADE DE ABSORÇÃO DE IMPACTO (ICAI)                                            │
│    Cruza a força de Quadríceps (%PC) com a Dorsiflexão de Tornozelo.                             │
│    - Se Quadríceps < 60% e Dorsiflexão < 35° ➔ Alerta: "Incapacidade de Amortecimento Excêntrico;   │
│      Proibir pliometria de alto impacto e saltos até restauração do arco".                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. ÍNDICE DE ESTABILIDADE LOMBOPÉLVICA (CORE COMPLEX)                                            │
│    Cruza Força de Extensores de Tronco (%PC) + Razão Flex/Ext + Teste de Thomas.                 │
│    - Se Thomas (+) com Extensores < 100% ➔ Alerta: "Síndrome Cruzada Pélvica de Janda            │
│      (Hiperlordose com inibição glútea e sobrecarga em L5-S1)".                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. ÍNDICE DE SAÚDE ESCAPULOTORÁCICA (ISE)                                                        │
│    Cruza Discinesia Escapular (Kibler) + GIRD de Ombro + Razão Remada/Supino.                    │
│    - Se Discinesia Tipo I/II + Remada/Supino < 0.80 ➔ Alerta: "Risco Crítico de Tendinopatia     │
│      do Manguito e Bursite Subacromial em Exercícios de Empurre".                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. RECOMENDAÇÃO AUTOMÁTICA DE CARGA MÁXIMA SUGERIDA (1RM ESTIMADO)                              │
│    A partir da força pico isométrica (N) nos testes, estimar o 1RM para Leg Press, Agachamento,  │
│    Supino e Remada, orientando o treinador na sala de musculação.                                │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

> **Documento de Especificação Técnica e Engenharia Biomecânica**  
> *Clube Fitness Fisio — Inteligência Algorítmica e Prevenção de Lesões.*
