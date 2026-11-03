const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'generate_definitive_report.js');
let code = fs.readFileSync(scriptPath, 'utf8');

const target = '  <!-- 5. TABELA DE PROCEDIMENTOS QUE EXTRAPOLARAM O TEMPO LIMITE DE SLA -->';

const addition = `  <!-- 4.1 AUDITORIA NOMINAL DE DÉBITOS E BÔNUS DE TURNO (TREINO LIVRE E EMERGÊNCIAS) -->
  <h2>4.1 Auditoria Nominal de Turno — Sem Treino Livre Semanal e Emergências &gt; 1</h2>
  <div class="confront-box">
    <strong>Discriminação Nominal de Abrangência (Fechamento Mensal de Salão):</strong> Listagem exaustiva de todos os alunos envolvidos nos critérios contratuais de fechamento de turno para máxima transparência contábil.
  </div>

  <h3 style="font-size: 11px; margin-top: 10px; margin-bottom: 4px; color: #991b1b;">A. Alunos com Mais de 1 Emergência no Mês (-4 pts/aluno no fechamento)</h3>
  <table class="sub-table" style="font-size: 8px; margin-bottom: 12px;">
    <thead>
      <tr style="background:#fef2f2;">
        <th>Turno</th>
        <th>Aluno(a)</th>
        <th>Plano Ativo</th>
        <th class="text-center">Ocorrências</th>
        <th>Detalhamento das Ocorrências Auditadas</th>
        <th class="text-right">Impacto Financeiro / Turno</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td rowspan="2" class="font-bold" style="background:#f0fdf4; color:#166534; vertical-align:top;">Manhã</td>
        <td class="font-bold">Dante Sarmento Henrique</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center font-bold text-rose">2</td>
        <td>19/10/2026 às 07:00 | 21/10/2026 às 09:00 (Travamento lombar no fim de semana registrado em prontuário)</td>
        <td class="text-right text-rose font-bold">-4 pts (-2 pts cada co-resp.)</td>
      </tr>
      <tr>
        <td class="font-bold">Raquel Freitas</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center font-bold text-rose">2</td>
        <td>01/10/2026 às 15:00 | 05/10/2026 às 08:00 (Atendimentos emergenciais sem agendamento prévio)</td>
        <td class="text-right text-rose font-bold">-4 pts (-2 pts cada co-resp.)</td>
      </tr>
      <tr>
        <td rowspan="3" class="font-bold" style="background:#eff6ff; color:#1e40af; vertical-align:top;">Tarde / Noite</td>
        <td class="font-bold">Rafaela Vaz</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center font-bold text-rose">4</td>
        <td>09/10/2026 às 15:00 | 23/10/2026 às 15:00 e 16:00 | 27/10/2026 às 15:00</td>
        <td class="text-right text-rose font-bold">-4 pts (-2 pts cada co-resp.)</td>
      </tr>
      <tr>
        <td class="font-bold">Ian Javoski Brandão Diniz</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center font-bold text-rose">4</td>
        <td>13/10/2026 às 17:00 | 14/10/2026 às 17:00 | 16/10/2026 às 17:00 | 19/10/2026 às 17:00</td>
        <td class="text-right text-rose font-bold">-4 pts (-2 pts cada co-resp.)</td>
      </tr>
      <tr>
        <td class="font-bold">Raquel Freitas</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center font-bold text-rose">2</td>
        <td>01/10/2026 às 15:00 | 05/10/2026 às 08:00 (Ocorrência mista compartilhada entre turnos)</td>
        <td class="text-right text-rose font-bold">-4 pts (-2 pts cada co-resp.)</td>
      </tr>
    </tbody>
  </table>

  <h3 style="font-size: 11px; margin-top: 10px; margin-bottom: 4px; color: #991b1b;">B. Alunos Sem o Mínimo de 1 Treino Livre na Semana (-2 pts/aluno no fechamento)</h3>
  <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
    <div>
      <div style="font-size: 9px; font-weight: bold; background:#f0fdf4; color:#166534; padding: 4px 8px; border: 1px solid #bbf7d0; border-radius: 4px 4px 0 0;">Turno Manhã — 34 Alunos Sem Meta Semanal (-68 pts total)</div>
      <table class="sub-table" style="font-size: 7.5px;">
        <thead><tr style="background:#f8fafc;"><th>#</th><th>Aluno(a)</th><th>Plano</th><th class="text-center">Livres</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Aluisio Mourão Mendes</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>2</td><td>Ana Marta Accoroni Araújo</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">3/4</td></tr>
          <tr><td>3</td><td>Andreza C. De Souza De Moura</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>4</td><td>Anna Luiza Nogueira Coutinho</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>5</td><td>Célia Maria da Silva Gomes</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>6</td><td>DANNILO FERNANDES DE SOUZA</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">2/4</td></tr>
          <tr><td>7</td><td>Denise P. C. Guerra Lage</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">3/4</td></tr>
          <tr><td>8</td><td>Fabrício Galvão de Brito</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>9</td><td>Faraílde Debossan</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>10</td><td>Helcio Dias Florencio</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>11</td><td>Isadora de Araujo Martins</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>12</td><td>IVONETE L DE S JOAQUIM</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">2/4</td></tr>
          <tr><td>13</td><td>Izaú Veras Gomes</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>14</td><td>Juliana de Carvalho Bastone</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>15</td><td>Juliane Valverde R. Garcia</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>16</td><td>Julio Savio Guerra Lage</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>17</td><td>Kelly Nascimento Brandão</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>18</td><td>LEANDRO ALVES DE SOUZA</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">3/4</td></tr>
          <tr><td>19</td><td>Leandro B. S. Romagnoli</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>20</td><td>Livia Teixeira de Lima</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>21</td><td>Lúcia da Silva</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>22</td><td>Lucio Trindade dos Reis</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>23</td><td>Maria José C. de Souza</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>24</td><td>Mariana Borja de Salvo</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>25</td><td>Matheus Habibe S. Ravaiane</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>26</td><td>Meires Devanir Accoroni G.</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>27</td><td>Monia Pires Novais</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">2/4</td></tr>
          <tr><td>28</td><td>Patrícia Goulart Alves</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">3/4</td></tr>
          <tr><td>29</td><td>Paula Maria Ferraz</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">3/4</td></tr>
          <tr><td>30</td><td>Raquel Freitas</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>31</td><td>Renata Thomé Migueletto</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">2/4</td></tr>
          <tr><td>32</td><td>Ruan de O. Lopes Rosa</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>33</td><td>Sofia Araújo Campos</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>34</td><td>Sofia Stefane F. Andrade</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
        </tbody>
      </table>
    </div>

    <div>
      <div style="font-size: 9px; font-weight: bold; background:#eff6ff; color:#1e40af; padding: 4px 8px; border: 1px solid #bfdbfe; border-radius: 4px 4px 0 0;">Turno Tarde/Noite — 42 Alunos Sem Meta Semanal (-84 pts total)</div>
      <table class="sub-table" style="font-size: 7.5px;">
        <thead><tr style="background:#f8fafc;"><th>#</th><th>Aluno(a)</th><th>Plano</th><th class="text-center">Livres</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Afonso Celso Rabelo</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>2</td><td>Amanda de Cássia Barbosa</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>3</td><td>Camila Carvalho Diniz</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>4</td><td>Carolina Rocha Guimaraes</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>5</td><td>Cássia C. Ladeira Soares</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>6</td><td>Cleonice Alves Batista</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>7</td><td>Danielle de Jesus Ferreira</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>8</td><td>Denise P. C. Guerra Lage</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>9</td><td>Éder Pereira</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>10</td><td>Emanuel Costa</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>11</td><td>Francisco De assis s. gomes</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>12</td><td>Gabriel Lage</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>13</td><td>Ian Javoski B. Diniz</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>14</td><td>Iasmim Souza Nunes</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>15</td><td>IVONETE L DE S JOAQUIM</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">2/4</td></tr>
          <tr><td>16</td><td>Izabelly Carvalho</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>17</td><td>Izaú Veras Gomes</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>18</td><td>Juan Victor B. F. Rocha</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>19</td><td>Juliane Valverde R. Garcia</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>20</td><td>LEANDRO ALVES DE SOUZA</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">3/4</td></tr>
          <tr><td>21</td><td>Lucca Gorini Rossetti</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>22</td><td>Lúcia da Silva</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>23</td><td>LUIZ ANTÔNIO ARAUJO</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">2/4</td></tr>
          <tr><td>24</td><td>Marcela Valverde Garcia</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>25</td><td>Márcio Nogueira Resende</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>26</td><td>Maria Aparecida dos Santos</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>27</td><td>Maria Valentina B. F. Rocha</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>28</td><td>Mateus Ahlert</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>29</td><td>Matheus Habibe S. Ravaiane</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>30</td><td>Miguel de A. Fernandes</td><td>Tratamento Personalizado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>31</td><td>Monia Pires Novais</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">2/4</td></tr>
          <tr><td>32</td><td>Patrícia Goulart Alves</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">3/4</td></tr>
          <tr><td>33</td><td>Paula Maria Ferraz</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">3/4</td></tr>
          <tr><td>34</td><td>Pedro Ferraz de Azevedo</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">1/4</td></tr>
          <tr><td>35</td><td>Pedro Rocha Barbosa</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>36</td><td>Rafaela Vaz</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>37</td><td>Raquel Freitas</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>38</td><td>Robert Nunes Q. dos Santos</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>39</td><td>Ronei Vital Gomes</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>40</td><td>Rosália Pessoa Caldas</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>41</td><td>Rosângela de Jesus Novais</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
          <tr><td>42</td><td>William Santos Fagundes</td><td>Clube Fitness - Monitorado</td><td class="text-center text-rose font-bold">0/4</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <h3 style="font-size: 11px; margin-top: 10px; margin-bottom: 4px; color: #166534;">C. Alunos com Meta de Treino Livre Semanal Atingida (+2 pts/aluno no fechamento)</h3>
  <table class="sub-table" style="font-size: 8px; margin-bottom: 12px;">
    <thead>
      <tr style="background:#f0fdf4;">
        <th>Turno</th>
        <th>Aluno(a)</th>
        <th>Plano Ativo</th>
        <th class="text-center">Treinos Livres Registrados</th>
        <th>Status Operacional</th>
        <th class="text-right">Bônus Fechamento Turno</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td rowspan="14" class="font-bold" style="background:#f0fdf4; color:#166534; vertical-align:top;">Manhã (14 Alunos)</td>
        <td class="font-bold">Daniele Debossan B. P. Coelho</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">5 treinos</td><td>Meta superada</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td>
      </tr>
      <tr><td class="font-bold">Danilson Gonçalves De Melo e Silva</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">4 treinos</td><td>Meta atingida</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Dante Sarmento Henrique</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">5 treinos</td><td>Meta superada</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Eugênio Pacelli C. O. Sartori</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">6 treinos</td><td>Meta superada</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Fernando Brandão Diniz</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">5 treinos</td><td>Meta superada</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Giovana Rocha Silva</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">8 treinos</td><td>Destaque de engajamento</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Isabel Imaculada Alves</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">4 treinos</td><td>Meta atingida</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Luiz Alberto dos Santos</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">8 treinos</td><td>Destaque de engajamento</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Marcelo Rodrigues Motta</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">9 treinos</td><td>Destaque de engajamento</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Maria de Fátima S. Gottschalg</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">4 treinos</td><td>Meta atingida</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Mariana Martins</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">9 treinos</td><td>Destaque de engajamento</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Renato Brandão Diniz</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">6 treinos</td><td>Meta superada</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Tatiana Bonifacino</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">4 treinos</td><td>Meta atingida</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr><td class="font-bold">Zaime Romeu Gottshalg</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">6 treinos</td><td>Meta superada</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td></tr>
      <tr>
        <td class="font-bold" style="background:#eff6ff; color:#1e40af; vertical-align:top;">Tarde / Noite (1 Aluno)</td>
        <td class="font-bold">Renato Brandão Diniz</td><td>Clube Fitness - Monitorado</td><td class="text-center font-bold text-emerald">6 treinos</td><td>Meta superada</td><td class="text-right text-emerald font-bold">+2 pts (+1 pt cada co-resp.)</td>
      </tr>
    </tbody>
  </table>\n\n` + target;

if (code.includes(target)) {
  code = code.replace(target, addition);
  fs.writeFileSync(scriptPath, code, 'utf8');
  console.log('generate_definitive_report.js updated successfully with Section 4.1!');
} else {
  console.error('Target not found in generate_definitive_report.js');
}

