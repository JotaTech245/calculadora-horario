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
