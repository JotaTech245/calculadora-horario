function calcularSaida() {
    const entrada = document.getElementById('entrada').value;
    const horasTrabalho = parseInt(document.getElementById('horasTrabalho').value);
    const minutosAlmoco = parseInt(document.getElementById('minutosAlmoco').value);

    if (!entrada || isNaN(horasTrabalho) || isNaN(minutosAlmoco)) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    const [horas, minutos] = entrada.split(':').map(Number);
    const tempoEntrada = new Date();
    tempoEntrada.setHours(horas, minutos, 0, 0);

    const tempoTrabalhoMs = horasTrabalho * 60 * 60 * 1000; // horas em milissegundos
    const tempoAlmocoMs = minutosAlmoco * 60 * 1000; // minutos em milissegundos

    const tempoTotal = tempoEntrada.getTime() + tempoTrabalhoMs + tempoAlmocoMs;
    const saida = new Date(tempoTotal);

    const horarioSaida = saida.toTimeString().slice(0, 5); // formata para HH:mm
    document.getElementById('saida').innerText = `Você deve sair às: ${horarioSaida}`;
}

function mostrarCalculadora(calculadora) {
    const calculadoraSaida = document.getElementById('calculadora-saida');
    const calculadoraExtras = document.getElementById('calculadora-extras');
    const calculadoraRegistro = document.getElementById('calculadora-registro');
    const menuCheckbox = document.getElementById('menu-checkbox');

    calculadoraSaida.style.display = 'none';
    calculadoraExtras.style.display = 'none';
    calculadoraRegistro.style.display = 'none';

    if (calculadora === 'saida') {
        calculadoraSaida.style.display = 'block';
    } else if (calculadora === 'extras') {
        calculadoraExtras.style.display = 'block';
    } else {
        calculadoraRegistro.style.display = 'block';
        gerarCalendario(new Date().getMonth(), new Date().getFullYear());
    }

    // Fecha o menu após a seleção
    menuCheckbox.checked = false;
}

function calcularExtras() {
    const salarioMensal = parseFloat(document.getElementById('salarioMensal').value);
    const horasTrabalhadas = parseInt(document.getElementById('horasTrabalhadas').value);
    const horasExtrasMes = parseInt(document.getElementById('horasExtrasMes').value);

    if (isNaN(salarioMensal) || isNaN(horasTrabalhadas) || isNaN(horasExtrasMes)) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    const salarioDiario = salarioMensal / 30; // Supondo 30 dias no mês
    const valorHora = salarioDiario / horasTrabalhadas; // Calcula o valor da hora de trabalho

    const ganhoExtras = horasExtrasMes * valorHora * 1.5; // 50% a mais pelas horas extras
    document.getElementById('resultado-extras').innerText = `Você deve receber R$ ${ganhoExtras.toFixed(2)} em horas extras no mês.`;
}

function salvarHistorico() {
    const diaSelecionado = document.querySelector('#corpoCalendario td[style*="background-color"]');
    
    if (!diaSelecionado) {
        alert("Por favor, selecione uma data no calendário.");
        return;
    }

    const data = diaSelecionado.getAttribute('data-dia');
    const horasExtras = parseFloat(document.getElementById('horasExtras').value);

    if (isNaN(horasExtras)) {
        alert("Por favor, preencha as horas extras corretamente.");
        return;
    }

    const registro = { data, horasExtras };

    let historico = JSON.parse(localStorage.getItem('historicoHorasExtras')) || [];
    historico.push(registro);
    localStorage.setItem('historicoHorasExtras', JSON.stringify(historico));
    exibirHorasExtras(data);
}

function exibirHorasExtras(dia) {
    const historico = JSON.parse(localStorage.getItem('historicoHorasExtras')) || [];
    const horasExtrasDia = historico.find(item => item.data === dia);

    const resultadoRegistro = document.getElementById('resultado-registro');
    resultadoRegistro.innerHTML = horasExtrasDia
        ? `Data: ${horasExtrasDia.data} - Horas Extras: ${horasExtrasDia.horasExtras} horas`
        : "Nenhum registro para esta data.";
}

function limparHistorico() {
    localStorage.removeItem('historicoHorasExtras');
    mostrarHistorico(); // Atualiza a interface após limpar
}

function gerarCalendario(mes, ano) {
    const corpoCalendario = document.getElementById('corpoCalendario');
    corpoCalendario.innerHTML = '';

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();

    let diaAtual = 1;

    for (let i = 0; i < 6; i++) {
        const linha = document.createElement('tr');

        for (let j = 0; j < 7; j++) {
            const celula = document.createElement('td');
            celula.style.padding = '10px';

            if (i === 0 && j < diaSemanaInicio) {
                celula.textContent = '';
            } else if (diaAtual <= diasNoMes) {
                celula.textContent = diaAtual;
                celula.setAttribute('data-dia', `${ano}-${mes + 1}-${diaAtual}`);

                celula.onclick = function() {
                    document.querySelectorAll('#corpoCalendario td').forEach(function(td) {
                        td.style.backgroundColor = '';
                    });

                    celula.style.backgroundColor = '#b008da';
                    exibirHorasExtras(celula.getAttribute('data-dia'));
                };

                diaAtual++;
            }

            linha.appendChild(celula);
        }

        corpoCalendario.appendChild(linha);

        if (diaAtual > diasNoMes) break;
    }
}
