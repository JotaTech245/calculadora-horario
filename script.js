// Espera o carregamento completo do DOM antes de executar qualquer código
window.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const menu = document.querySelector('.menu');

    if (menuToggle && menu) { // Garante que ambos os elementos existem no DOM
        menuToggle.addEventListener('click', function() {
            menu.classList.toggle('active'); // Alterna a classe 'active' para mostrar ou esconder o menu
        });
    } else {
        console.log("Erro: Elemento '.menu-toggle' ou '.menu' não encontrado.");
    }
});

// Função para calcular o horário de saída
function calcularSaida() {
    const entrada = document.getElementById('entrada').value;
    const horasTrabalho = parseInt(document.getElementById('horasTrabalho').value);
    const minutosAlmoco = parseInt(document.getElementById('minutosAlmoco').value);

    // Validação de campos
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

// Função para alternar entre as calculadoras
function mostrarCalculadora(calculadora) {
    const calculadoras = {
        'saida': document.getElementById('calculadora-saida'),
        'extras': document.getElementById('calculadora-extras'),
        'registro': document.getElementById('calculadora-registro')
    };

    // Esconde todas as calculadoras
    Object.values(calculadoras).forEach(calc => calc.style.display = 'none');

    // Exibe a calculadora correspondente
    calculadoras[calculadora].style.display = 'block';

    // Gera o calendário se for a calculadora de registro
    if (calculadora === 'registro') {
        gerarCalendario(new Date().getMonth(), new Date().getFullYear());
    }
}

// Função para calcular horas extras
function calcularExtras() {
    const salarioMensal = parseFloat(document.getElementById('salarioMensal').value);
    const horasTrabalhadas = parseInt(document.getElementById('horasTrabalhadas').value);
    const horasExtrasMes = parseInt(document.getElementById('horasExtrasMes').value);

    // Validação de campos
    if (isNaN(salarioMensal) || isNaN(horasTrabalhadas) || isNaN(horasExtrasMes)) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    const salarioDiario = salarioMensal / 30; // Supondo 30 dias no mês
    const valorHora = salarioDiario / horasTrabalhadas; // Calcula o valor da hora de trabalho

    const ganhoExtras = horasExtrasMes * valorHora * 1.5; // 50% a mais pelas horas extras
    document.getElementById('resultado-extras').innerText = `Você deve receber R$ ${ganhoExtras.toFixed(2)} em horas extras no mês.`;
}

// Função para salvar o histórico de horas extras
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

    // Recupera o histórico ou inicializa um novo array
    let historico = JSON.parse(localStorage.getItem('historicoHorasExtras')) || [];
    historico.push(registro);
    localStorage.setItem('historicoHorasExtras', JSON.stringify(historico));

    exibirHorasExtras(data);
}

// Função para exibir as horas extras de um dia específico
function exibirHorasExtras(dia) {
    const historico = JSON.parse(localStorage.getItem('historicoHorasExtras')) || [];
    const horasExtrasDia = historico.find(item => item.data === dia);

    const resultadoRegistro = document.getElementById('resultado-registro');
    resultadoRegistro.innerHTML = horasExtrasDia
        ? `Data: ${horasExtrasDia.data} - Horas Extras: ${horasExtrasDia.horasExtras} horas`
        : "Nenhum registro para esta data.";
}

// Função para limpar o histórico de horas extras
function limparHistorico() {
    localStorage.removeItem('historicoHorasExtras');
    mostrarHistorico(); // Atualiza a interface após limpar
}

// Função para gerar o calendário
function gerarCalendario(mes, ano) {
    const corpoCalendario = document.getElementById('corpoCalendario');
    corpoCalendario.innerHTML = '';

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();

    let diaAtual = 1;

    // Gera o calendário mês a mês
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

                // Seleciona a data ao clicar
                celula.onclick = function() {
                    document.querySelectorAll('#corpoCalendario td').forEach(function(td) {
                        td.style.backgroundColor = '';
                    });

                    celula.style.backgroundColor = '#ffb347';
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
