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
    const menuCheckbox = document.getElementById('menu-checkbox');

    if (calculadora === 'saida') {
        calculadoraSaida.style.display = 'block';
        calculadoraExtras.style.display = 'none';
    } else {
        calculadoraSaida.style.display = 'none';
        calculadoraExtras.style.display = 'block';
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
