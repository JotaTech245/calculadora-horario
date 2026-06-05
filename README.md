# Calculadora de Horários

Aplicação web simples para calcular horário de saída, estimar valor de horas extras e registrar horas extras por dia.

Site publicado: https://jotatech245.github.io/calculadora-horario/

## Funcionalidades

- Calcula o horário de saída usando entrada, tempo de trabalho e intervalo.
- Aceita jornadas com casas decimais, como `7.5` horas.
- Estima o valor de horas extras com divisor mensal e adicional configuráveis.
- Registra horas extras por dia em calendário mensal.
- Mostra o total de horas extras do mês.
- Salva os registros no navegador usando `localStorage`.

## Como rodar localmente

Abra o arquivo `index.html` no navegador ou sirva a pasta com um servidor estático.

```bash
npx serve .
```

## V2

Esta versão corrige os cálculos com decimais, melhora o registro mensal, remove funções quebradas e reorganiza a interface para ficar mais prática no celular.
